import express from 'express';
import cors from 'cors';
import feedbackRoutes, { forceRefreshFeedback } from './routes/feedback.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/feedback', feedbackRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// Scheduled Task: Force refresh last 2 days every 3 hours
// ============================================
const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

function getLastTwoDaysRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 2);

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

async function scheduledRefresh(): Promise<void> {
  const { from, to } = getLastTwoDaysRange();
  console.log(`\n========================================`);
  console.log(`[Scheduler] Running scheduled refresh at ${new Date().toISOString()}`);
  console.log(`[Scheduler] Date range: ${from} to ${to}`);
  console.log(`========================================\n`);

  const result = await forceRefreshFeedback(from, to);

  if (result.success) {
    console.log(`[Scheduler] Success! Refreshed ${result.count} feedback items`);
  } else {
    console.error(`[Scheduler] Failed: ${result.error}`);
  }

  console.log(`[Scheduler] Next refresh in 3 hours\n`);
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Run initial refresh after 10 seconds (give server time to fully start)
  setTimeout(() => {
    console.log(`[Scheduler] Starting initial scheduled refresh...`);
    scheduledRefresh();
  }, 10000);

  // Schedule subsequent refreshes every 3 hours
  setInterval(scheduledRefresh, REFRESH_INTERVAL_MS);
  console.log(`[Scheduler] Scheduled refresh task registered (every 3 hours)`);
});
