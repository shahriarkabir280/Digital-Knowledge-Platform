/**
 * Fine Calculation Job
 * Runs daily to update fine amounts for active overdue loans.
 * Ensures fines are kept current as days accumulate.
 */

const db = require("../db");
const finesRepository = require("../db/repositories/fines");

const JOB_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Run a single fine recalculation cycle.
 */
async function runOnce() {
  console.log("[fineCalculationJob] Running fine calculation cycle...");

  try {
    // Get all overdue loans
    const overdueLoans = await db("loans")
      .whereIn("status", ["OVERDUE"])
      .select("id");

    let updated = 0;
    let created = 0;

    for (const loan of overdueLoans) {
      const fine = await finesRepository.calculateFine(loan.id);
      if (fine) {
        // calculateFine handles both insert and update
        if (fine.created_at && new Date(fine.created_at) > new Date(Date.now() - 60 * 1000)) {
          created++;
        } else {
          updated++;
        }
      }
    }

    console.log(
      `[fineCalculationJob] Processed ${overdueLoans.length} overdue loans: ${created} fines created, ${updated} updated`
    );
  } catch (error) {
    console.error("[fineCalculationJob] Error:", error.message);
  }
}

/**
 * Start the fine calculation job.
 * Runs once at startup (after due tracking job), then every 24 hours.
 */
function start() {
  let intervalId = null;

  // Slight delay to avoid racing with dueTrackingJob on startup
  const timeoutId = setTimeout(() => {
    runOnce();
    intervalId = setInterval(runOnce, JOB_INTERVAL_MS);
  }, 5 * 60 * 1000); // 5-minute delay after startup

  console.log("[fineCalculationJob] Started — runs every 24 hours (5-minute startup delay)");

  const stop = () => {
    clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
  };
  return { stop };
}

module.exports = { start, runOnce };
