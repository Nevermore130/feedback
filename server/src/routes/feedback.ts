import { Router, Request, Response } from 'express';
import { TEAM_MEMBERS } from '../data/mockData.js';
import { FeedbackItem, FeishuApiResponse } from '../types.js';
import { transformFeishuList } from '../utils/transformer.js';

const router = Router();

const FEISHU_API_BASE = 'https://web-api.rela.me/feedback/feishu';

// Cache for feedback data
let cachedFeedback: FeedbackItem[] = [];
let cacheKey = '';

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
 * Fetch feedback from feishu API
 */
async function fetchFromFeishu(from: string, to: string): Promise<FeedbackItem[]> {
  const url = `${FEISHU_API_BASE}?from=${from}&to=${to}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Feishu API error: ${response.status}`);
    }

    const result: FeishuApiResponse = await response.json();

    if (result.code !== 0) {
      throw new Error(`Feishu API returned error code: ${result.code}`);
    }

    const feedbackList = transformFeishuList(result.data || []);
    // Sort by date descending (newest first)
    feedbackList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return feedbackList;
  } catch (error) {
    console.error('Failed to fetch from Feishu API:', error);
    throw error;
  }
}

// GET /api/feedback - Get all feedback
router.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const dateRange = {
      from: (from as string) || getDefaultDateRange().from,
      to: (to as string) || getDefaultDateRange().to,
    };

    // Check cache
    const newCacheKey = `${dateRange.from}-${dateRange.to}`;
    if (cacheKey !== newCacheKey || cachedFeedback.length === 0) {
      cachedFeedback = await fetchFromFeishu(dateRange.from, dateRange.to);
      cacheKey = newCacheKey;
    }

    res.json({
      success: true,
      data: cachedFeedback,
      dateRange,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feedback',
    });
  }
});

// GET /api/feedback/:id - Get single feedback by ID
router.get('/:id', (req: Request, res: Response) => {
  const feedback = cachedFeedback.find(f => f.id === req.params.id);
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
});

// PUT /api/feedback/:id - Update feedback (local cache only)
router.put('/:id', (req: Request, res: Response) => {
  const index = cachedFeedback.findIndex(f => f.id === req.params.id);
  if (index === -1) {
    res.status(404).json({
      success: false,
      error: 'Feedback not found',
    });
    return;
  }
  cachedFeedback[index] = { ...cachedFeedback[index], ...req.body };
  res.json({
    success: true,
    data: cachedFeedback[index],
  });
});

// POST /api/feedback/refresh - Force refresh from API
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.body;
    const dateRange = {
      from: from || getDefaultDateRange().from,
      to: to || getDefaultDateRange().to,
    };

    cachedFeedback = await fetchFromFeishu(dateRange.from, dateRange.to);
    cacheKey = `${dateRange.from}-${dateRange.to}`;

    res.json({
      success: true,
      data: cachedFeedback,
      dateRange,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh feedback',
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

export default router;
