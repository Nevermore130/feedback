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

interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  date: string;
  content: string;
  rating: number;
  category: string;
  sentiment: Sentiment;
  tags: string[];
  aiSummary?: string;
  status: string;
  type?: string;
  imageUrl?: string;
  contentType?: number;
  appVersion?: string;
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
// Feishu Card Builder
// ============================================

function getSentimentColor(sentiment: Sentiment): string {
  switch (sentiment) {
    case Sentiment.POSITIVE: return 'green';
    case Sentiment.NEGATIVE: return 'red';
    case Sentiment.NEUTRAL: return 'blue';
    default: return 'grey';
  }
}

function getSentimentEmoji(sentiment: Sentiment): string {
  switch (sentiment) {
    case Sentiment.POSITIVE: return '😊';
    case Sentiment.NEGATIVE: return '😞';
    case Sentiment.NEUTRAL: return '😐';
    default: return '❓';
  }
}

function buildFeedbackCard(feedback: FeedbackItem, shareMessage?: string): object {
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

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '📋 用户反馈分享' },
      template: sentimentColor,
    },
    elements: [
      ...(shareMessage ? [{
        tag: 'div',
        text: { tag: 'lark_md', content: `💬 **分享留言**: ${shareMessage}` },
      }, { tag: 'hr' }] : []),
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: `**用户**: ${feedback.userName}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**用户ID**: ${feedback.userId}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**时间**: ${date}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**版本**: ${feedback.appVersion || '未知'}` } },
        ],
      },
      { tag: 'div', text: { tag: 'lark_md', content: `**反馈内容**:\n${feedback.content}` } },
      ...(feedback.imageUrl ? [{
        tag: 'div',
        text: { tag: 'lark_md', content: `**附件图片**: [点击查看图片](${feedback.imageUrl})` },
      }] : []),
      { tag: 'hr' },
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: `**情感**: ${sentimentEmoji} ${feedback.sentiment}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**分类**: ${feedback.category}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**类型**: ${contentTypeLabel}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**状态**: ${feedback.status}` } },
        ],
      },
      ...(feedback.tags && feedback.tags.length > 0 ? [{
        tag: 'div',
        text: { tag: 'lark_md', content: `**标签**: ${feedback.tags.map(t => `\`${t}\``).join(' ')}` },
      }] : []),
      ...(feedback.aiSummary ? [{
        tag: 'div',
        text: { tag: 'lark_md', content: `**AI 摘要**: ${feedback.aiSummary}` },
      }] : []),
      { tag: 'hr' },
      {
        tag: 'note',
        elements: [{ tag: 'plain_text', content: `反馈 ID: ${feedback.id} | 来自 InsightFlow 反馈管理系统` }],
      },
    ],
  };
}

// ============================================
// Handler
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;

  if (!webhookUrl) {
    return res.status(503).json({
      success: false,
      error: 'Feishu webhook is not configured',
    });
  }

  try {
    const { feedbackId, shareMessage, from, to } = req.body;

    if (!feedbackId) {
      return res.status(400).json({
        success: false,
        error: 'feedbackId is required',
      });
    }

    // Get feedback from Supabase
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('feedback')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found',
      });
    }

    const feedback: FeedbackItem = {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      userAvatar: data.user_avatar,
      date: data.date,
      content: data.content,
      rating: data.rating,
      category: data.category,
      sentiment: data.sentiment as Sentiment,
      tags: data.tags || [],
      aiSummary: data.ai_summary || undefined,
      status: data.status,
      type: data.type || undefined,
      imageUrl: data.image_url || undefined,
      contentType: data.content_type ?? undefined,
      appVersion: data.app_version || undefined,
    };

    // Build and send card
    const card = buildFeedbackCard(feedback, shareMessage);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'interactive', card }),
    });

    const result = await response.json();

    if (result.code !== 0 && result.StatusCode !== 0) {
      return res.status(500).json({
        success: false,
        error: result.msg || result.StatusMessage || 'Failed to send message',
      });
    }

    return res.status(200).json({
      success: true,
      data: { sent: true },
    });
  } catch (error) {
    console.error('Share error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
