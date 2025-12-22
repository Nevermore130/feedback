import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

    // Fetch all feedback tags for the date range
    const BATCH_SIZE = 1000;
    const allTags: string[][] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await client
        .from('feedback')
        .select('tags')
        .gte('date', dateRange.from)
        .lte('date', dateRange.to + 'T23:59:59')
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        data.forEach(row => {
          if (row.tags && Array.isArray(row.tags)) {
            allTags.push(row.tags);
          }
        });
        offset += BATCH_SIZE;
        hasMore = data.length === BATCH_SIZE;
      } else {
        hasMore = false;
      }
    }

    // Count tags
    const tagCounts: Record<string, number> = {};
    allTags.flat().forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    // Convert to sorted array
    const tags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      success: true,
      data: tags,
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
