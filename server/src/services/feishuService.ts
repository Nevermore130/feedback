import { FeedbackItem, Sentiment, Category } from '../types.js';

// ============================================
// Feishu API Configuration
// ============================================

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'cli_a2fd12f92db9500d';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || 'Exr1HPJW6SPLKqpYdqLs7cmg30rrIOkD';

let tenantAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

// ============================================
// Token Management
// ============================================

/**
 * Get tenant access token for Feishu API
 */
async function getTenantAccessToken(): Promise<string> {
  // Check if token is still valid (with 5 min buffer)
  if (tenantAccessToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return tenantAccessToken;
  }

  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    }),
  });

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`Failed to get tenant access token: ${result.msg}`);
  }

  tenantAccessToken = result.tenant_access_token;
  tokenExpiresAt = Date.now() + result.expire * 1000;

  console.log('[Feishu] Tenant access token refreshed : ', tenantAccessToken);
  return tenantAccessToken!;
}

/**
 * Check if Feishu is configured
 */
export function isFeishuConfigured(): boolean {
  return !!(FEISHU_APP_ID && FEISHU_APP_SECRET);
}

// ============================================
// User/Friend Management
// ============================================

export interface FeishuUser {
  user_id: string;
  open_id: string;
  name: string;
  avatar_url?: string;
  department?: string;
}

/**
 * Search users by keyword
 */
export async function searchUsers(keyword: string): Promise<FeishuUser[]> {
  const token = await getTenantAccessToken();

  const response = await fetch(`https://open.feishu.cn/open-apis/search/v1/user?query=${encodeURIComponent(keyword)}&page_size=20`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  if (result.code !== 0) {
    console.error('[Feishu] Search users failed:', result.msg);
    return [];
  }

  return (result.data?.users || []).map((user: any) => ({
    user_id: user.user_id,
    open_id: user.open_id,
    name: user.name,
    avatar_url: user.avatar?.avatar_72,
    department: user.department_ids?.[0],
  }));
}

/**
 * Get frequently contacted users (recent contacts)
 */
export async function getRecentContacts(): Promise<FeishuUser[]> {
  // Note: This API might require specific permissions
  // Fallback to returning empty array if not available
  try {
    const token = await getTenantAccessToken();

    // Get department users as fallback
    const response = await fetch('https://open.feishu.cn/open-apis/contact/v3/users?page_size=50', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (result.code !== 0) {
      console.warn('[Feishu] Get contacts failed:', result.msg);
      return [];
    }

    return (result.data?.items || []).map((user: any) => ({
      user_id: user.user_id,
      open_id: user.open_id,
      name: user.name,
      avatar_url: user.avatar?.avatar_72,
      department: user.department_ids?.[0],
    }));
  } catch (error) {
    console.error('[Feishu] Get recent contacts error:', error);
    return [];
  }
}

// ============================================
// Card Message Builder
// ============================================

/**
 * Get sentiment color for card
 */
function getSentimentColor(sentiment: Sentiment): string {
  switch (sentiment) {
    case Sentiment.POSITIVE: return 'green';
    case Sentiment.NEGATIVE: return 'red';
    case Sentiment.NEUTRAL: return 'blue';
    default: return 'grey';
  }
}

/**
 * Get sentiment emoji
 */
function getSentimentEmoji(sentiment: Sentiment): string {
  switch (sentiment) {
    case Sentiment.POSITIVE: return '😊';
    case Sentiment.NEGATIVE: return '😞';
    case Sentiment.NEUTRAL: return '😐';
    default: return '❓';
  }
}

/**
 * Build interactive card message for feedback
 */
export function buildFeedbackCard(feedback: FeedbackItem, shareMessage?: string): object {
  const sentimentColor = getSentimentColor(feedback.sentiment);
  const sentimentEmoji = getSentimentEmoji(feedback.sentiment);
  const date = new Date(feedback.date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const contentTypeLabel = feedback.contentType === 1 ? '社区审核' : feedback.contentType === 0 ? '产品功能' : '未分类';

  const card = {
    config: {
      wide_screen_mode: true,
    },
    header: {
      title: {
        tag: 'plain_text',
        content: `📋 用户反馈分享`,
      },
      template: sentimentColor,
    },
    elements: [
      // Share message (if provided)
      ...(shareMessage ? [{
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `💬 **分享留言**: ${shareMessage}`,
        },
      }, {
        tag: 'hr',
      }] : []),
      // User info
      {
        tag: 'div',
        fields: [
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**用户**: ${feedback.userName}`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**时间**: ${date}`,
            },
          },
        ],
      },
      // Feedback content
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**反馈内容**:\n${feedback.content}`,
        },
      },
      // Image (if exists)
      ...(feedback.imageUrl ? [{
        tag: 'img',
        img_key: feedback.imageUrl,
        alt: {
          tag: 'plain_text',
          content: '反馈图片',
        },
      }] : []),
      {
        tag: 'hr',
      },
      // Analysis info
      {
        tag: 'div',
        fields: [
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**情感**: ${sentimentEmoji} ${feedback.sentiment}`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**分类**: ${feedback.category}`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**类型**: ${contentTypeLabel}`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**状态**: ${feedback.status}`,
            },
          },
        ],
      },
      // Tags
      ...(feedback.tags && feedback.tags.length > 0 ? [{
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**标签**: ${feedback.tags.map(t => `\`${t}\``).join(' ')}`,
        },
      }] : []),
      // AI Summary (if exists)
      ...(feedback.aiSummary ? [{
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**AI 摘要**: ${feedback.aiSummary}`,
        },
      }] : []),
      // Footer with action
      {
        tag: 'hr',
      },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: `反馈 ID: ${feedback.id} | 来自 InsightFlow 反馈管理系统`,
          },
        ],
      },
    ],
  };

  return card;
}

// ============================================
// Send Message
// ============================================

export interface SendMessageResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

/**
 * Send card message to a user
 */
export async function sendCardMessage(
  receiverId: string,
  receiverIdType: 'open_id' | 'user_id' | 'email' = 'open_id',
  card: object
): Promise<SendMessageResult> {
  try {
    const token = await getTenantAccessToken();

    const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiverIdType}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receive_id: receiverId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      }),
    });

    const result = await response.json();

    if (result.code !== 0) {
      console.error('[Feishu] Send message failed:', result.msg);
      return {
        success: false,
        error: result.msg || 'Failed to send message',
      };
    }

    console.log(`[Feishu] Message sent successfully to ${receiverId}`);
    return {
      success: true,
      message_id: result.data?.message_id,
    };
  } catch (error) {
    console.error('[Feishu] Send message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Share feedback to multiple users
 */
export async function shareFeedback(
  feedback: FeedbackItem,
  receiverIds: string[],
  receiverIdType: 'open_id' | 'user_id' | 'email' = 'open_id',
  shareMessage?: string
): Promise<{ success: number; failed: number; results: SendMessageResult[] }> {
  const card = buildFeedbackCard(feedback, shareMessage);
  const results: SendMessageResult[] = [];

  // Send to all receivers in parallel (max 5 concurrent)
  const concurrency = 5;
  for (let i = 0; i < receiverIds.length; i += concurrency) {
    const batch = receiverIds.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(id => sendCardMessage(id, receiverIdType, card))
    );
    results.push(...batchResults);
  }

  const success = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return { success, failed, results };
}
