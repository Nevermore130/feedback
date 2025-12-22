/**
 * Force Refresh Script
 *
 * Manually trigger a force refresh of feedback data from source API.
 * Bypasses all caches and fetches fresh data.
 *
 * Usage: npm run refresh
 */

import { forceRefreshFeedback } from '../routes/feedback.js';

// Get date range for last 7 days
function getLastSevenDaysRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

async function main(): Promise<void> {
  const { from, to } = getLastSevenDaysRange();

  console.log(`\n========================================`);
  console.log(`Force Refresh Script`);
  console.log(`========================================`);
  console.log(`Start time: ${new Date().toISOString()}`);
  console.log(`Date range: ${from} to ${to} (last 7 days)`);
  console.log(`========================================\n`);

  const startTime = Date.now();
  const result = await forceRefreshFeedback(from, to);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n========================================`);
  if (result.success) {
    console.log(`✅ Success!`);
    console.log(`   Refreshed ${result.count} feedback items`);
    console.log(`   Duration: ${duration}s`);
  } else {
    console.log(`❌ Failed!`);
    console.log(`   Error: ${result.error}`);
  }
  console.log(`========================================\n`);

  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
