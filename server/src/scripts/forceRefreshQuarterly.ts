/**
 * Force Refresh Quarterly Script
 *
 * Manually trigger a force refresh of feedback data for the last 3 months.
 * Bypasses all caches and fetches fresh data.
 * Processes data in weekly chunks to avoid API limits and memory issues.
 *
 * Usage: npm run refresh:quarterly
 */

import { forceRefreshFeedback } from '../routes/feedback.js';

// Get date range for last 3 months (end date is tomorrow to ensure today's data is included)
function getLastThreeMonthsRange(): { from: string; to: string } {
  const to = new Date();
  to.setDate(to.getDate() + 1); // Tomorrow
  const from = new Date();
  from.setMonth(from.getMonth() - 3);

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

// Split date range into weekly chunks
function splitIntoWeeks(from: string, to: string): { from: string; to: string }[] {
  const chunks: { from: string; to: string }[] = [];
  const startDate = new Date(from);
  const endDate = new Date(to);

  let currentStart = new Date(startDate);

  while (currentStart <= endDate) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 6); // 7 days per chunk

    // Don't exceed the end date
    if (currentEnd > endDate) {
      currentEnd.setTime(endDate.getTime());
    }

    chunks.push({
      from: currentStart.toISOString().split('T')[0],
      to: currentEnd.toISOString().split('T')[0],
    });

    // Move to next chunk
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return chunks;
}

async function main(): Promise<void> {
  const { from, to } = getLastThreeMonthsRange();
  const weeks = splitIntoWeeks(from, to);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Force Refresh Quarterly Script`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Start time: ${new Date().toISOString()}`);
  console.log(`Date range: ${from} to ${to} (last 3 months)`);
  console.log(`Total weeks to process: ${weeks.length}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();
  let totalCount = 0;
  let successWeeks = 0;
  let failedWeeks = 0;
  const errors: string[] = [];

  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    const weekNum = i + 1;

    console.log(`[${weekNum}/${weeks.length}] Processing ${week.from} to ${week.to}...`);

    try {
      const result = await forceRefreshFeedback(week.from, week.to);

      if (result.success) {
        totalCount += result.count;
        successWeeks++;
        console.log(`    ✅ ${result.count} items refreshed`);
      } else {
        failedWeeks++;
        errors.push(`Week ${weekNum} (${week.from} - ${week.to}): ${result.error}`);
        console.log(`    ❌ Failed: ${result.error}`);
      }
    } catch (error) {
      failedWeeks++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Week ${weekNum} (${week.from} - ${week.to}): ${errorMsg}`);
      console.log(`    ❌ Error: ${errorMsg}`);
    }

    // Small delay between weeks to avoid overwhelming the API
    if (i < weeks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const durationMinutes = ((Date.now() - startTime) / 60000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total items refreshed: ${totalCount}`);
  console.log(`Successful weeks: ${successWeeks}/${weeks.length}`);
  console.log(`Failed weeks: ${failedWeeks}/${weeks.length}`);
  console.log(`Duration: ${duration}s (${durationMinutes} minutes)`);

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log(`${'='.repeat(60)}\n`);

  process.exit(failedWeeks === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
