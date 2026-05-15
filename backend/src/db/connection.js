const knex = require("knex");
const { createConfig } = require("./env");

let instance;

function getDb() {
  if (!instance) {
    instance = knex(createConfig());
  }
  return instance;
}

async function ping() {
  try {
    await getDb().raw("select 1 as ok");
    return true;
  } catch (error) {
    console.error("Database ping failed:", error);
    throw error;
  }
}

async function close() {
  if (instance) {
    const current = instance;
    instance = undefined;
    await current.destroy();
  }
}

module.exports = {
  getDb,
  ping,
  close,
};