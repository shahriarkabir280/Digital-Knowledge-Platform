require("dotenv").config();

const { createConfig } = require("./src/db/env");

module.exports = createConfig();