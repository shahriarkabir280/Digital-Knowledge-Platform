/**
 * Knex configuration file.
 * Used by the knex CLI for migrations and seeds.
 * Reads DATABASE_URL from .env
 */
require("dotenv").config();

const { createConfig } = require("./src/db/env");

module.exports = createConfig();
