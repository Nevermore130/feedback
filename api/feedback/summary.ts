import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

enum Sentiment {
  POSITIVE = 'Positive',
  NEUTRAL = 'Neutral',
  NEGATIVE = 'Negative',
  PENDING = 'Pending'
}

interface DbFeedback {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  content: string;
  rating: number;
  category: string;
  sentiment: string;
  tags: string[];
  ai_summary: string | null;
  status: string;
  user_avatar: string;
  type: string | null;
  image_url: string | null;
  content_type: number | null;
  app_version: string | null;
}

// ============================================
// Supabase Client
// ============================================

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// ============================================
// Helper Functions
// ============================================

function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

const ISSUE_TYPE_KEYWORDS = {
  ad: ['广告', 'ad', 'advertisement', '推广', '营销', 'marketing', 'promo'],
  review: ['审核', 'review', '封号', '违规', '举报', 'report', 'ban'],
  chat: ['聊天', 'chat', '消息', 'message', '私信', '通讯'],
  crash: ['闪退', 'crash', '崩溃', '卡顿', '无响应', 'freeze', 'bug', '错误'],
};

function classifyIssueType(content: string): string {
  const lowerContent = content.toLowerCase();
  for (const [type, keywords] of Object.entries(ISSUE_TYPE_KEYWORDS)) {
    if (keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
      return type;
    }
  }
  return 'other';
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

// ============================================
// Handler
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const client = getSupabaseClient();
    const { from, to } = req.query;

    const dateRange = {
      from: (from as string) || getDefaultDateRange().from,
      to: (to as string) || getDefaultDateRange().to,
    };

    // Fetch all feedback for the date range (paginated internally)
    const BATCH_SIZE = 1000;
    const allData: DbFeedback[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await client
        .from('feedback')
        .select('*')
        .gte('date', dateRange.from)
        .lte('date', dateRange.to + 'T23:59:59')
        .order('date', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        allData.push(...data);
        offset += BATCH_SIZE;
        hasMore = data.length === BATCH_SIZE;
      } else {
        hasMore = false;
      }
    }

    // Calculate statistics
    const totalFeedback = allData.length;
    const avgRating = allData.reduce((sum, f) => sum + f.rating, 0) / totalFeedback || 0;

    // Sentiment distribution
    const sentimentCounts: Record<string, number> = {
      [Sentiment.POSITIVE]: 0,
      [Sentiment.NEUTRAL]: 0,
      [Sentiment.NEGATIVE]: 0,
      [Sentiment.PENDING]: 0,
    };
    allData.forEach(f => {
      sentimentCounts[f.sentiment] = (sentimentCounts[f.sentiment] || 0) + 1;
    });

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    allData.forEach(f => {
      categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
    });

    // Daily trend
    const dailyCounts: Record<string, number> = {};
    allData.forEach(f => {
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

    // Issue type by week
    const issueTypeByWeek: Record<string, Record<string, number>> = {};
    allData.forEach(f => {
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

    // Issue type by month
    const issueTypeByMonth: Record<string, Record<string, number>> = {};
    allData.forEach(f => {
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

    // Ad trend
    const adKeywords = ISSUE_TYPE_KEYWORDS.ad;
    const adTrendByDay: Record<string, number> = {};
    allData.forEach(f => {
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

    // Recent feedback
    const recentFeedback = allData.slice(0, 5).map(db => ({
      id: db.id,
      userId: db.user_id,
      userName: db.user_name,
      userAvatar: db.user_avatar,
      date: db.date,
      content: db.content,
      rating: db.rating,
      category: db.category,
      sentiment: db.sentiment,
      tags: db.tags || [],
      aiSummary: db.ai_summary || undefined,
      status: db.status,
      type: db.type || undefined,
      imageUrl: db.image_url || undefined,
      contentType: db.content_type ?? undefined,
      appVersion: db.app_version || undefined,
    }));

    // NPS Score
    const promoters = allData.filter(f => f.rating >= 4).length;
    const detractors = allData.filter(f => f.rating <= 2).length;
    const npsScore = totalFeedback > 0
      ? Math.round(((promoters - detractors) / totalFeedback) * 100)
      : 0;

    // Tag cloud
    const tagCounts: Record<string, number> = {};
    allData.forEach(f => {
      if (f.tags && Array.isArray(f.tags)) {
        f.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    const tagCloud = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    return res.status(200).json({
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
        tagCloud,
      },
      dateRange,
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
