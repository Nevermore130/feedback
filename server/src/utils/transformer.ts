import { FeishuFeedbackItem, FeedbackItem, Category, Sentiment } from '../types.js';
import { analyzeInBatch, getDefaultAnalysis, BatchAnalysisItem } from '../services/geminiService.js';

/**
 * Map feishu type to Category
 */
function mapCategory(type: string | null | undefined): Category {
  if (!type) {
    return Category.UNCLASSIFIED;
  }
  const typeMap: Record<string, Category> = {
    'moment': Category.UX_UI,
    'bug': Category.BUG,
    'feature': Category.FEATURE,
    'performance': Category.PERFORMANCE,
  };
  return typeMap[type.toLowerCase()] || Category.UNCLASSIFIED;
}

/**
 * Map feishu status to UI status
 */
function mapStatus(status: number): 'New' | 'In Progress' | 'Resolved' {
  switch (status) {
    case 1:
      return 'New';
    case 2:
      return 'In Progress';
    case 3:
      return 'Resolved';
    default:
      return 'New';
  }
}

/**
 * Extract tags from content and momentsText
 */
function extractTags(content: string, type: string | null | undefined): string[] {
  const tags: string[] = [];

  // Add type as tag
  if (type) {
    tags.push(type.charAt(0).toUpperCase() + type.slice(1));
  }

  // Simple keyword extraction
  const keywords = ['美甲', '客拍', '塑形', '审核', '删除', '封号', '违规'];
  keywords.forEach(keyword => {
    if (content.includes(keyword)) {
      tags.push(keyword);
    }
  });

  return tags.slice(0, 5); // Limit to 5 tags
}

/**
 * Get avatar URL, with fallback to default
 */
function getAvatarUrl(avatar: string): string {
  if (!avatar) {
    return 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  }
  return avatar;
}

/**
 * Transform feishu feedback item to UI FeedbackItem (without AI analysis)
 */
export function transformFeishuToFeedback(item: FeishuFeedbackItem): FeedbackItem {
  return {
    id: `f-${item.id}`,
    userId: item.user_id.toString(),
    userName: item.nickName || 'Anonymous',
    userAvatar: getAvatarUrl(item.avatar),
    date: item.createTime,
    content: item.content || item.momentsText || '',
    rating: 3, // Default rating since feishu doesn't provide this
    category: mapCategory(item.type),
    sentiment: Sentiment.PENDING, // Will be analyzed by AI
    tags: extractTags(item.content || item.momentsText || '', item.type),
    status: mapStatus(item.status),
    type: item.type,
    imageUrl: item.imageUrl,
    momentsText: item.momentsText,
    userType: item.userType,
    contentType: item.contentType,
  };
}

/**
 * Transform array of feishu items (without AI analysis)
 */
export function transformFeishuList(items: FeishuFeedbackItem[]): FeedbackItem[] {
  return items.map(transformFeishuToFeedback);
}

/**
 * Transform array of feishu items with high-performance batch AI analysis
 *
 * Performance target: 1000 items in ~5 seconds
 *
 * Strategy:
 * - Batch multiple items into single AI requests (30 items per request)
 * - Execute multiple batches in parallel (10 concurrent)
 * - Use content-based caching to skip duplicate analysis
 */
export async function transformFeishuListWithAI(
  items: FeishuFeedbackItem[],
  options: {
    chunkSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<FeedbackItem[]> {
  const startTime = Date.now();

  // Step 1: Transform all items without AI
  const feedbackItems = items.map(transformFeishuToFeedback);

  // Step 2: Prepare batch analysis items
  const batchItems: BatchAnalysisItem[] = feedbackItems
    .filter(item => item.content.trim().length > 0)
    .map(item => ({
      id: item.id,
      content: item.content,
    }));

  if (batchItems.length === 0) {
    console.log(`[Transformer] No items to analyze`);
    return feedbackItems;
  }

  console.log(`[Transformer] Starting batch analysis for ${batchItems.length} items...`);

  // Step 3: Run batch analysis
  const analysisResults = await analyzeInBatch(batchItems, {
    chunkSize: options.chunkSize || 30,
    concurrency: options.concurrency || 10,
    onProgress: options.onProgress,
  });

  // Step 4: Apply analysis results to feedback items
  for (const item of feedbackItems) {
    const analysis = analysisResults.get(item.id);
    if (analysis) {
      item.sentiment = analysis.sentiment;
      item.category = analysis.category;
      item.tags = analysis.tags.length > 0 ? analysis.tags : item.tags;
      item.aiSummary = analysis.summary;
    }
  }

  const elapsed = Date.now() - startTime;
  const successCount = analysisResults.size;
  console.log(`[Transformer] Completed: ${successCount}/${batchItems.length} analyzed in ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s)`);

  return feedbackItems;
}
