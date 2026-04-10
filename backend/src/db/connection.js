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
  await getDb().raw("select 1 as ok");
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