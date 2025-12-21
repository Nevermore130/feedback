import { Router, Request, Response } from 'express';
import { TEAM_MEMBERS } from '../data/mockData.js';
import { FeedbackItem, FeishuApiResponse, FeishuFeedbackItem, Category, Sentiment } from '../types.js';
import { transformFeishuList, transformFeishuListWithAI } from '../utils/transformer.js';
import { getCacheStats as getAICacheStats } from '../services/geminiService.js';
import * as supabase from '../services/supabaseService.js';

const router = Router();

const FEISHU_API_BASE = 'https://web-api.rela.me/feedback/feishu';

// LRU Cache with TTL
interface CacheEntry {
  data: FeedbackItem[];
  timestamp: number;
  accessCount: number;
  aiAnalyzed: boolean; // Track if AI analysis has been done
}

class LRUCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttl: number; // TTL in milliseconds

  constructor(maxSize: number = 10, ttlMinutes: number = 5) {
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(key: string, requireAI: boolean = false): FeedbackItem[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // If AI analysis is required but not done, return null to trigger re-fetch
    if (requireAI && !entry.aiAnalyzed) {
      return null;
    }

    // Update access count and move to end (most recently used)
    entry.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: FeedbackItem[], aiAnalyzed: boolean = false): void {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      aiAnalyzed,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; keys: string[]; entries: { key: string; aiAnalyzed: boolean; itemCount: number }[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        aiAnalyzed: entry.aiAnalyzed,
        itemCount: entry.data.length,
      })),
    };
  }
}

// Initialize LRU cache (10 entries, 5 minute TTL)
const feedbackCache = new LRUCache(10, 5);

// Issue type keywords for classification
const ISSUE_TYPE_KEYWORDS = {
  ad: ['广告', 'ad', 'advertisement', '推广', '营销', 'marketing', 'promo'],
  review: ['审核', 'review', '封号', '违规', '举报', 'report', 'ban'],
  chat: ['聊天', 'chat', '消息', 'message', '私信', '通讯'],
  crash: ['闪退', 'crash', '崩溃', '卡顿', '无响应', 'freeze', 'bug', '错误'],
};

/**
 * Get default date range (last 7 days)
 */
function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

/**
 * Classify issue type based on content keywords
 */
function classifyIssueType(content: string): string {
  const lowerContent = content.toLowerCase();
  for (const [type, keywords] of Object.entries(ISSUE_TYPE_KEYWORDS)) {
    if (keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
      return type;
    }
  }
  return 'other';
}

/**
 * Get week number from date
 */
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Get month key from date
 */
function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

/**
 * Split date range into smaller chunks to bypass API limit
 */
function splitDateRange(from: string, to: string, maxDaysPerChunk: number = 3): { from: string; to: string }[] {
  const chunks: { from: string; to: string }[] = [];
  const startDate = new Date(from);
  const endDate = new Date(to);

  let currentStart = new Date(startDate);

  while (currentStart <= endDate) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + maxDaysPerChunk - 1);

    // Don't exceed the end date
    if (currentEnd > endDate) {
      currentEnd.setTime(endDate.getTime());
    }

    chunks.push({
      from: currentStart.toISOString().split('T')[0],
      to: currentEnd.toISOString().split('T')[0],
    });

    // Move to next chunk
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return chunks;
}

/**
 * Fetch single date range from Feishu API
 */
async function fetchSingleRange(from: string, to: string): Promise<FeishuFeedbackItem[]> {
  const url = `${FEISHU_API_BASE}?from=${from}&to=${to}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Feishu API error: ${response.status}`);
  }

  const result: FeishuApiResponse = await response.json();

  if (result.code !== 0) {
    throw new Error(`Feishu API returned error code: ${result.code}`);
  }

  return result.data || [];
}

/**
 * Fetch feedback from feishu API with caching, optional AI analysis, and Supabase persistence
 * Uses date range splitting to bypass 1000 item limit
 */
async function fetchFromFeishu(from: string, to: string, withAI: boolean = true): Promise<FeedbackItem[]> {
  const cacheKey = `${from}-${to}`;

  // Step 1: Check memory cache first
  const cached = feedbackCache.get(cacheKey, withAI);
  if (cached) {
    console.log(`[Memory Cache] Hit for ${cacheKey} (AI: ${withAI})`);
    return cached;
  }

  // Step 2: Try Supabase if configured
  if (supabase.isSupabaseConfigured()) {
    try {
      console.log(`[Supabase] Checking database for ${from} to ${to}...`);
      const { data: dbData, total } = await supabase.getFeedback({
        from,
        to,
        fetchAll: true, // Bypass 1000 row limit
      });

      if (dbData.length > 0) {
        console.log(`[Supabase] Found ${dbData.length} items in database`);
        // Check if AI analysis is needed
        const needsAI = withAI && dbData.some(f => f.sentiment === Sentiment.PENDING);

        if (!needsAI) {
          feedbackCache.set(cacheKey, dbData, true);
          return dbData;
        }
        console.log(`[Supabase] Some items need AI analysis, will process...`);
      }
    } catch (error) {
      console.warn('[Supabase] Database query failed, falling back to API:', error);
    }
  }

  // Step 3: Split date range and fetch from Feishu API
  const dateChunks = splitDateRange(from, to, 3); // 3 days per chunk to stay under 1000
  console.log(`[Feishu API] Fetching ${dateChunks.length} date chunks for ${from} to ${to}...`);

  try {
    // Fetch all chunks in parallel (max 5 concurrent)
    const allRawData: FeishuFeedbackItem[] = [];
    const concurrency = 5;

    for (let i = 0; i < dateChunks.length; i += concurrency) {
      const batch = dateChunks.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(chunk => fetchSingleRange(chunk.from, chunk.to))
      );

      for (const data of batchResults) {
        allRawData.push(...data);
      }

      console.log(`[Feishu API] Fetched batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(dateChunks.length / concurrency)}, total: ${allRawData.length} items`);
    }

    // Deduplicate by ID (in case of overlapping date ranges)
    const uniqueMap = new Map<number, FeishuFeedbackItem>();
    for (const item of allRawData) {
      uniqueMap.set(item.id, item);
    }
    const uniqueRawData = Array.from(uniqueMap.values());
    console.log(`[Feishu API] Total unique items: ${uniqueRawData.length}`);

    let feedbackList: FeedbackItem[];

    if (withAI) {
      console.log(`[AI] Starting analysis for ${uniqueRawData.length} items...`);
      feedbackList = await transformFeishuListWithAI(uniqueRawData, {
        chunkSize: 50,
        concurrency: 10,
      });
      console.log(`[AI] Analysis completed for ${feedbackList.length} items`);
    } else {
      feedbackList = transformFeishuList(uniqueRawData);
    }

    // Sort by date descending (newest first)
    feedbackList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Step 4: Persist to Supabase (async, don't wait)
    if (supabase.isSupabaseConfigured() && feedbackList.length > 0) {
      supabase.upsertFeedback(feedbackList)
        .then(({ success, failed }) => {
          console.log(`[Supabase] Persisted ${success} items, ${failed} failed`);
        })
        .catch(err => {
          console.warn('[Supabase] Failed to persist:', err);
        });
    }

    // Step 5: Store in memory cache
    feedbackCache.set(cacheKey, feedbackList, withAI);
    console.log(`[Memory Cache] Stored ${feedbackList.length} items (AI: ${withAI})`);

    return feedbackList;
  } catch (error) {
    console.error('[Feishu API] Failed to fetch:', error);
    throw error;
  }
}

// GET /api/feedback - Get feedback with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to, page, pageSize, category, sentiment, search, contentType, ai } = req.query;
    const dateRange = {
      from: (from as string) || getDefaultDateRange().from,
      to: (to as string) || getDefaultDateRange().to,
    };

    // Check if AI analysis is requested (default: true)
    const withAI = ai !== 'false';

    // Fetch all data (cached, with AI analysis if requested)
    let allFeedback = await fetchFromFeishu(dateRange.from, dateRange.to, withAI);

    // Apply filters
    if (category && category !== 'all') {
      allFeedback = allFeedback.filter(f => f.category === category);
    }
    if (sentiment && sentiment !== 'all') {
      allFeedback = allFeedback.filter(f => f.sentiment === sentiment);
    }
    if (contentType && contentType !== 'all') {
      const ct = parseInt(contentType as string, 10);
      allFeedback = allFeedback.filter(f => f.contentType === ct);
    }
    if (search) {
      const searchLower = (search as string).toLowerCase();
      allFeedback = allFeedback.filter(f =>
        f.content.toLowerCase().includes(searchLower) ||
        f.userName.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const currentPage = parseInt(page as string, 10) || 1;
    const size = parseInt(pageSize as string, 10) || 20;
    const totalItems = allFeedback.length;
    const totalPages = Math.ceil(totalItems / size);
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;
    const paginatedData = allFeedback.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page: currentPage,
        pageSize: size,
        totalItems,
        totalPages,
        hasMore: currentPage < totalPages,
      },
      dateRange,
      aiAnalyzed: withAI,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feedback',
    });
  }
});

// GET /api/feedback/summary - Get aggregated statistics for dashboard
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const dateRange = {
      from: (from as string) || getDefaultDateRange().from,
      to: (to as string) || getDefaultDateRange().to,
    };

    const allFeedback = await fetchFromFeishu(dateRange.from, dateRange.to);

    // Basic stats
    const totalFeedback = allFeedback.length;
    const avgRating = allFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback || 0;

    // Sentiment distribution
    const sentimentCounts = {
      [Sentiment.POSITIVE]: 0,
      [Sentiment.NEUTRAL]: 0,
      [Sentiment.NEGATIVE]: 0,
      [Sentiment.PENDING]: 0,
    };
    allFeedback.forEach(f => {
      sentimentCounts[f.sentiment] = (sentimentCounts[f.sentiment] || 0) + 1;
    });

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    allFeedback.forEach(f => {
      categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
    });

    // Daily trend with peak detection
    const dailyCounts: Record<string, number> = {};
    allFeedback.forEach(f => {
      const day = f.date.split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });
    const dailyTrendData = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const peakCount = Math.max(...dailyTrendData.map(d => d.count), 0);
    const dailyTrendWithPeak = dailyTrendData.map(d => ({
      ...d,
      isPeak: d.count === peakCount && peakCount > 0,
    }));

    // Issue type trend by week
    const issueTypeByWeek: Record<string, Record<string, number>> = {};
    allFeedback.forEach(f => {
      const weekKey = getWeekKey(new Date(f.date));
      const issueType = classifyIssueType(f.content);
      if (!issueTypeByWeek[weekKey]) {
        issueTypeByWeek[weekKey] = { ad: 0, review: 0, chat: 0, crash: 0, other: 0 };
      }
      issueTypeByWeek[weekKey][issueType]++;
    });
    const issueTypeWeekData = Object.entries(issueTypeByWeek)
      .map(([period, counts]) => ({ period, ...counts }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Issue type trend by month
    const issueTypeByMonth: Record<string, Record<string, number>> = {};
    allFeedback.forEach(f => {
      const monthKey = getMonthKey(new Date(f.date));
      const issueType = classifyIssueType(f.content);
      if (!issueTypeByMonth[monthKey]) {
        issueTypeByMonth[monthKey] = { ad: 0, review: 0, chat: 0, crash: 0, other: 0 };
      }
      issueTypeByMonth[monthKey][issueType]++;
    });
    const issueTypeMonthData = Object.entries(issueTypeByMonth)
      .map(([period, counts]) => ({ period, ...counts }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Ad tag trend (feedback containing ad-related keywords)
    const adKeywords = ISSUE_TYPE_KEYWORDS.ad;
    const adTrendByDay: Record<string, number> = {};
    allFeedback.forEach(f => {
      const isAdRelated = adKeywords.some(keyword =>
        f.content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (isAdRelated) {
        const day = f.date.split('T')[0];
        adTrendByDay[day] = (adTrendByDay[day] || 0) + 1;
      }
    });
    const adTrendData = Object.entries(adTrendByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent feedback (last 5)
    const recentFeedback = allFeedback.slice(0, 5);

    // NPS Score calculation (simplified)
    const promoters = allFeedback.filter(f => f.rating >= 4).length;
    const detractors = allFeedback.filter(f => f.rating <= 2).length;
    const npsScore = totalFeedback > 0
      ? Math.round(((promoters - detractors) / totalFeedback) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        totalFeedback,
        avgRating: Math.round(avgRating * 10) / 10,
        npsScore,
        sentimentCounts,
        categoryCounts,
        dailyTrendData: dailyTrendWithPeak,
        issueTypeWeekData,
        issueTypeMonthData,
        adTrendData,
        recentFeedback,
      },
      dateRange,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch summary',
    });
  }
});

// GET /api/feedback/team/members - Get all team members
router.get('/team/members', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: TEAM_MEMBERS,
  });
});

// GET /api/feedback/:id - Get single feedback by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const dateRange = {
      from: (from as string) || getDefaultDateRange().from,
      to: (to as string) || getDefaultDateRange().to,
    };
    const allFeedback = await fetchFromFeishu(dateRange.from, dateRange.to);
    const feedback = allFeedback.find(f => f.id === req.params.id);
    if (!feedback) {
      res.status(404).json({
        success: false,
        error: 'Feedback not found',
      });
      return;
    }
    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feedback',
    });
  }
});

// POST /api/feedback/refresh - Force refresh from API
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.body;
    const dateRange = {
      from: from || getDefaultDateRange().from,
      to: to || getDefaultDateRange().to,
    };

    // Clear cache and fetch fresh data
    feedbackCache.clear();
    const freshData = await fetchFromFeishu(dateRange.from, dateRange.to);

    res.json({
      success: true,
      data: freshData,
      dateRange,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh feedback',
    });
  }
});

// GET /api/feedback/cache/stats - Get cache statistics
router.get('/cache/stats', async (_req: Request, res: Response) => {
  try {
    const stats: Record<string, unknown> = {
      feedbackCache: feedbackCache.getStats(),
      aiAnalysisCache: getAICacheStats(),
    };

    // Add Supabase stats if configured
    if (supabase.isSupabaseConfigured()) {
      stats.supabase = await supabase.getStats();
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        feedbackCache: feedbackCache.getStats(),
        aiAnalysisCache: getAICacheStats(),
        supabase: { error: 'Failed to get stats' },
      },
    });
  }
});

export default router;
