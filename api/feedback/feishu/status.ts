import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;

  return res.status(200).json({
    success: true,
    data: {
      configured: !!webhookUrl,
      webhookUrl: webhookUrl ? '***configured***' : null,
    },
  });
}
