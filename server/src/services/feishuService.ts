import { FeedbackItem, Sentiment } from '../types.js';

// ============================================
// Feishu Webhook Configuration
// ============================================

// Feishu Webhook URL - configure in environment or use default
const FEISHU_WEBHOOK_URL = process.env.FEISHU_WEBHOOK_URL || '';

// ============================================
// Webhook Status
// ============================================

/**
 * Check if Feishu webhook is configured
 */
export function isFeishuConfigured(): boolean {
  return !!FEISHU_WEBHOOK_URL;
}

/**
 * Get webhook status for frontend
 */
export function getWebhookStatus(): {
  configured: boolean;
  webhookUrl: string | null;
} {
  return {
    configured: isFeishuConfigured(),
    webhookUrl: FEISHU_WEBHOOK_URL ? '***configured***' : null,
  };
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
 * Build interactive card message for feedback (webhook format)
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
              content: `**用户ID**: ${feedback.userId}`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**时间**: ${date}`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**版本**: ${feedback.appVersion || '未知'}`,
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
      // Image link (if exists) - use markdown link since webhook doesn't support external images directly
      ...(feedback.imageUrl ? [{
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**附件图片**: [点击查看图片](${feedback.imageUrl})`,
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
      // Footer
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
// Send Message via Webhook
// ============================================

export interface SendMessageResult {
  success: boolean;
  error?: string;
}

/**
 * Send card message via Feishu webhook
 */
export async function sendViaWebhook(
  feedback: FeedbackItem,
  shareMessage?: string
): Promise<SendMessageResult> {
  if (!FEISHU_WEBHOOK_URL) {
    return {
      success: false,
      error: 'Feishu webhook URL not configured. Please set FEISHU_WEBHOOK_URL environment variable.',
    };
  }

  try {
    const card = buildFeedbackCard(feedback, shareMessage);

    const response = await fetch(FEISHU_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msg_type: 'interactive',
        card,
      }),
    });

    const result = await response.json();

    // Feishu webhook returns { code: 0 } on success
    if (result.code !== 0 && result.StatusCode !== 0) {
      console.error('[Feishu Webhook] Send failed:', result);
      return {
        success: false,
        error: result.msg || result.StatusMessage || 'Failed to send message',
      };
    }

    console.log('[Feishu Webhook] Message sent successfully');
    return { success: true };
  } catch (error) {
    console.error('[Feishu Webhook] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
