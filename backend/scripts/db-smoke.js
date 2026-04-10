require("dotenv").config();

const db = require("../src/db");

(async () => {
  await db.ping();
  const result = await db.getDb().raw("select current_database() as database, version() as version");

  console.log(JSON.stringify(result.rows[0], null, 2));
  await db.close();
})().catch(async (error) => {
  console.error(error);

  try {
    await db.close();
  } catch (_closeError) {
    // ignore close failures in smoke mode
  }

  process.exit(1);
});