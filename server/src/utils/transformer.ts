import { FeishuFeedbackItem, FeedbackItem, Category, Sentiment } from '../types.js';

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
 * Get first image URL from comma-separated list
 */
function getFirstUserImage(userImg: string): string {
  if (!userImg) {
    return 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  }
  const images = userImg.split(',');
  return images[0] || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
}

/**
 * Transform feishu feedback item to UI FeedbackItem
 */
export function transformFeishuToFeedback(item: FeishuFeedbackItem): FeedbackItem {
  return {
    id: `f-${item.id}`,
    userId: item.user_id.toString(),
    userName: item.nickName || 'Anonymous',
    userAvatar: getFirstUserImage(item.userImg),
    date: item.createTime,
    content: item.content || item.momentsText || '',
    rating: 3, // Default rating since feishu doesn't provide this
    category: mapCategory(item.type),
    sentiment: Sentiment.PENDING, // Will be analyzed by AI later
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
 * Transform array of feishu items
 */
export function transformFeishuList(items: FeishuFeedbackItem[]): FeedbackItem[] {
  return items.map(transformFeishuToFeedback);
}
