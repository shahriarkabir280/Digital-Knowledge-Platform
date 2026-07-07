require("dotenv").config();

const app = require("./app");
const db = require("./db");
const dueTrackingJob = require("./jobs/dueTrackingJob");
const fineCalculationJob = require("./jobs/fineCalculationJob");

const PORT = process.env.BACKEND_PORT || 3000;

(async () => {
  await db.ping();

  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);

    // Start background jobs after server is up
    dueTrackingJob.start();
    fineCalculationJob.start();
  });
})().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
