require("dotenv").config();
const { getDb } = require("../src/db/connection");
const fs = require("fs");
const path = require("path");

async function main() {
  const db = getDb();
  const sqlPath = path.join(__dirname, "create_collaborative_tables.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  
  console.log("Applying collaborative tables migration...");
  await db.raw(sql);
  console.log("Collaborative tables migration applied successfully!");
  await db.destroy();
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
