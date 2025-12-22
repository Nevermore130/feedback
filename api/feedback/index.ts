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

enum Category {
  BUG = 'Bug Report',
  FEATURE = 'Feature Request',
  UX_UI = 'UX/UI',
  PERFORMANCE = 'Performance',
  OTHER = 'Other',
  UNCLASSIFIED = 'Unclassified'
}

interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  date: string;
  content: string;
  rating: number;
  category: Category;
  sentiment: Sentiment;
  tags: string[];
  aiSummary?: string;
  status: 'New' | 'In Progress' | 'Resolved';
  assignedTo?: string;
  type?: string;
  imageUrl?: string;
  momentsText?: string;
  userType?: string;
  contentType?: number;
  appVersion?: string;
}

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
    appVersion: db.app_version || undefined,
  };
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

// ============================================
// Handler
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = getSupabaseClient();
    const { from, to, page, pageSize, category, sentiment, search, contentType, tags } = req.query;

    const dateRange = {
      from: (from as string) || getDefaultDateRange().from,
      to: (to as string) || getDefaultDateRange().to,
    };

    // Build query
    let query = client.from('feedback').select('*', { count: 'exact' });

    // Date filters
    query = query.gte('date', dateRange.from);
    query = query.lte('date', dateRange.to + 'T23:59:59');

    // Other filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (sentiment && sentiment !== 'all') {
      query = query.eq('sentiment', sentiment);
    }
    if (contentType && contentType !== 'all') {
      query = query.eq('content_type', parseInt(contentType as string, 10));
    }
    if (search) {
      query = query.or(`content.ilike.%${search}%,user_name.ilike.%${search}%`);
    }
    if (tags && typeof tags === 'string' && tags.trim()) {
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
      if (tagList.length > 0) {
        query = query.overlaps('tags', tagList);
      }
    }

    // Pagination
    const currentPage = parseInt(page as string, 10) || 1;
    const size = parseInt(pageSize as string, 10) || 20;
    const offset = (currentPage - 1) * size;

    query = query
      .order('date', { ascending: false })
      .range(offset, offset + size - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    const feedbackItems = (data || []).map(fromDbFeedback);
    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / size);

    return res.status(200).json({
      success: true,
      data: feedbackItems,
      pagination: {
        page: currentPage,
        pageSize: size,
        totalItems,
        totalPages,
        hasMore: currentPage < totalPages,
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
