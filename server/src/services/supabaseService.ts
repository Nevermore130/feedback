import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FeedbackItem, Category, Sentiment } from '../types.js';

// ============================================
// Supabase Configuration
// ============================================

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be configured via environment variables');
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseKey);
}

// ============================================
// Database Types (matches Supabase schema)
// ============================================

interface DbFeedback {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  date: string;
  content: string;
  rating: number;
  category: string;
  sentiment: string;
  tags: string[];
  ai_summary: string | null;
  status: string;
  assigned_to: string | null;
  type: string | null;
  image_url: string | null;
  moments_text: string | null;
  user_type: string | null;
  content_type: number | null;
  created_at?: string;
  updated_at?: string;
}

interface DbAIAnalysisCache {
  content_hash: string;
  sentiment: string;
  category: string;
  tags: string[];
  summary: string;
  created_at?: string;
}

// ============================================
// Transform Functions
// ============================================

function toDbFeedback(item: FeedbackItem): DbFeedback {
  return {
    id: item.id,
    user_id: item.userId,
    user_name: item.userName,
    user_avatar: item.userAvatar,
    date: item.date,
    content: item.content,
    rating: item.rating,
    category: item.category,
    sentiment: item.sentiment,
    tags: item.tags,
    ai_summary: item.aiSummary || null,
    status: item.status,
    assigned_to: item.assignedTo || null,
    type: item.type || null,
    image_url: item.imageUrl || null,
    moments_text: item.momentsText || null,
    user_type: item.userType || null,
    content_type: item.contentType ?? null,
  };
}

function fromDbFeedback(db: DbFeedback): FeedbackItem {
  return {
    id: db.id,
    userId: db.user_id,
    userName: db.user_name,
    userAvatar: db.user_avatar,
    date: db.date,
    content: db.content,
    rating: db.rating,
    category: db.category as Category,
    sentiment: db.sentiment as Sentiment,
    tags: db.tags || [],
    aiSummary: db.ai_summary || undefined,
    status: db.status as 'New' | 'In Progress' | 'Resolved',
    assignedTo: db.assigned_to || undefined,
    type: db.type || undefined,
    imageUrl: db.image_url || undefined,
    momentsText: db.moments_text || undefined,
    userType: db.user_type || undefined,
    contentType: db.content_type ?? undefined,
  };
}

// ============================================
// Feedback CRUD Operations
// ============================================

/**
 * Upsert multiple feedback items (insert or update)
 */
export async function upsertFeedback(items: FeedbackItem[]): Promise<{ success: number; failed: number }> {
  const client = getClient();
  const dbItems = items.map(toDbFeedback);

  const { data, error } = await client
    .from('feedback')
    .upsert(dbItems, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('[Supabase] Upsert error:', error);
    return { success: 0, failed: items.length };
  }

  return { success: data?.length || 0, failed: items.length - (data?.length || 0) };
}

/**
 * Build base query with filters
 */
function buildFeedbackQuery(client: SupabaseClient, options: {
  from?: string;
  to?: string;
  category?: string;
  sentiment?: string;
  contentType?: number;
  search?: string;
}) {
  const { from, to, category, sentiment, contentType, search } = options;

  let query = client.from('feedback').select('*', { count: 'exact' });

  if (from) {
    query = query.gte('date', from);
  }
  if (to) {
    query = query.lte('date', to + 'T23:59:59');
  }
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (sentiment && sentiment !== 'all') {
    query = query.eq('sentiment', sentiment);
  }
  if (contentType !== undefined) {
    query = query.eq('content_type', contentType);
  }
  if (search) {
    query = query.or(`content.ilike.%${search}%,user_name.ilike.%${search}%`);
  }

  return query;
}

/**
 * Get feedback by date range with optional filters
 * Handles Supabase 1000 row limit by paginating internally
 */
export async function getFeedback(options: {
  from?: string;
  to?: string;
  category?: string;
  sentiment?: string;
  contentType?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  fetchAll?: boolean; // If true, fetch all data bypassing 1000 limit
}): Promise<{ data: FeedbackItem[]; total: number }> {
  const client = getClient();
  const {
    from,
    to,
    category,
    sentiment,
    contentType,
    search,
    page = 1,
    pageSize = 20,
    fetchAll = false,
  } = options;

  // If fetchAll is true, we need to paginate through all results
  if (fetchAll) {
    return getAllFeedback({ from, to, category, sentiment, contentType, search });
  }

  // Normal paginated query
  let query = buildFeedbackQuery(client, { from, to, category, sentiment, contentType, search });

  // Pagination
  const offset = (page - 1) * pageSize;
  query = query
    .order('date', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[Supabase] Query error:', error);
    throw error;
  }

  return {
    data: (data || []).map(fromDbFeedback),
    total: count || 0,
  };
}

/**
 * Get ALL feedback bypassing the 1000 row limit
 * Uses internal pagination to fetch all data
 */
async function getAllFeedback(options: {
  from?: string;
  to?: string;
  category?: string;
  sentiment?: string;
  contentType?: number;
  search?: string;
}): Promise<{ data: FeedbackItem[]; total: number }> {
  const client = getClient();
  const BATCH_SIZE = 1000; // Supabase max per request
  const allData: DbFeedback[] = [];
  let offset = 0;
  let totalCount = 0;
  let hasMore = true;

  console.log('[Supabase] Fetching all data with internal pagination...');

  while (hasMore) {
    let query = buildFeedbackQuery(client, options);
    query = query
      .order('date', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[Supabase] Batch query error:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allData.push(...data);
      totalCount = count || allData.length;
      offset += BATCH_SIZE;
      hasMore = data.length === BATCH_SIZE && allData.length < totalCount;
      console.log(`[Supabase] Fetched batch: ${allData.length}/${totalCount}`);
    } else {
      hasMore = false;
    }
  }

  console.log(`[Supabase] Total fetched: ${allData.length} items`);

  return {
    data: allData.map(fromDbFeedback),
    total: totalCount,
  };
}

/**
 * Get single feedback by ID
 */
export async function getFeedbackById(id: string): Promise<FeedbackItem | null> {
  const client = getClient();

  const { data, error } = await client
    .from('feedback')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data ? fromDbFeedback(data) : null;
}

/**
 * Update feedback
 */
export async function updateFeedback(id: string, updates: Partial<FeedbackItem>): Promise<FeedbackItem | null> {
  const client = getClient();

  // Convert to DB format
  const dbUpdates: Partial<DbFeedback> = {};
  if (updates.category) dbUpdates.category = updates.category;
  if (updates.sentiment) dbUpdates.sentiment = updates.sentiment;
  if (updates.tags) dbUpdates.tags = updates.tags;
  if (updates.aiSummary !== undefined) dbUpdates.ai_summary = updates.aiSummary || null;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo || null;

  const { data, error } = await client
    .from('feedback')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Update error:', error);
    throw error;
  }

  return data ? fromDbFeedback(data) : null;
}

/**
 * Delete feedback
 */
export async function deleteFeedback(id: string): Promise<boolean> {
  const client = getClient();

  const { error } = await client
    .from('feedback')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Delete error:', error);
    return false;
  }

  return true;
}

// ============================================
// AI Analysis Cache Operations
// ============================================

function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Get cached AI analysis by content
 */
export async function getCachedAnalysis(content: string): Promise<{
  sentiment: Sentiment;
  category: Category;
  tags: string[];
  summary: string;
} | null> {
  const client = getClient();
  const contentHash = hashContent(content);

  const { data, error } = await client
    .from('ai_analysis_cache')
    .select('*')
    .eq('content_hash', contentHash)
    .single();

  if (error || !data) return null;

  return {
    sentiment: data.sentiment as Sentiment,
    category: data.category as Category,
    tags: data.tags || [],
    summary: data.summary,
  };
}

/**
 * Save AI analysis to cache
 */
export async function cacheAnalysis(
  content: string,
  analysis: { sentiment: Sentiment; category: Category; tags: string[]; summary: string }
): Promise<void> {
  const client = getClient();
  const contentHash = hashContent(content);

  const { error } = await client
    .from('ai_analysis_cache')
    .upsert({
      content_hash: contentHash,
      sentiment: analysis.sentiment,
      category: analysis.category,
      tags: analysis.tags,
      summary: analysis.summary,
    }, { onConflict: 'content_hash' });

  if (error) {
    console.error('[Supabase] Cache write error:', error);
  }
}

/**
 * Batch get cached analyses
 */
export async function batchGetCachedAnalyses(
  contents: { id: string; content: string }[]
): Promise<Map<string, { sentiment: Sentiment; category: Category; tags: string[]; summary: string }>> {
  const client = getClient();
  const results = new Map();

  // Create hash -> id mapping
  const hashToId = new Map<string, string>();
  const hashes: string[] = [];

  for (const { id, content } of contents) {
    const hash = hashContent(content);
    hashToId.set(hash, id);
    hashes.push(hash);
  }

  // Batch query
  const { data, error } = await client
    .from('ai_analysis_cache')
    .select('*')
    .in('content_hash', hashes);

  if (error) {
    console.error('[Supabase] Batch cache query error:', error);
    return results;
  }

  // Map results back to IDs
  for (const row of data || []) {
    const id = hashToId.get(row.content_hash);
    if (id) {
      results.set(id, {
        sentiment: row.sentiment as Sentiment,
        category: row.category as Category,
        tags: row.tags || [],
        summary: row.summary,
      });
    }
  }

  return results;
}

/**
 * Batch save analyses to cache
 */
export async function batchCacheAnalyses(
  items: { content: string; analysis: { sentiment: Sentiment; category: Category; tags: string[]; summary: string } }[]
): Promise<void> {
  const client = getClient();

  const cacheItems = items.map(({ content, analysis }) => ({
    content_hash: hashContent(content),
    sentiment: analysis.sentiment,
    category: analysis.category,
    tags: analysis.tags,
    summary: analysis.summary,
  }));

  const { error } = await client
    .from('ai_analysis_cache')
    .upsert(cacheItems, { onConflict: 'content_hash' });

  if (error) {
    console.error('[Supabase] Batch cache write error:', error);
  }
}

// ============================================
// Statistics
// ============================================

export async function getStats(): Promise<{
  totalFeedback: number;
  cachedAnalyses: number;
}> {
  const client = getClient();

  const [feedbackCount, cacheCount] = await Promise.all([
    client.from('feedback').select('*', { count: 'exact', head: true }),
    client.from('ai_analysis_cache').select('*', { count: 'exact', head: true }),
  ]);

  return {
    totalFeedback: feedbackCount.count || 0,
    cachedAnalyses: cacheCount.count || 0,
  };
}
