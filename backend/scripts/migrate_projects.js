require("dotenv").config();
const { getDb } = require("../src/db/connection");
const fs = require("fs");
const path = require("path");

async function main() {
  const db = getDb();
  const sqlPath = path.join(__dirname, "create_projects_table.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  
  console.log("Applying projects table migration...");
  await db.raw(sql);
  console.log("Projects table migration applied successfully!");
  await db.destroy();
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
