require("dotenv").config();

const app = require("./app");
const db = require("./db");

const PORT = process.env.BACKEND_PORT || 3000;

(async () => {
  await db.ping();

  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
})().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
