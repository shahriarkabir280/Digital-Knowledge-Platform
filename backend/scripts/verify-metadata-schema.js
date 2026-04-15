#!/usr/bin/env node
require('dotenv').config();

const knex = require('knex')({
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
});

async function checkSchema() {
  try {
    console.log('\n=== Metadata Table Columns ===');
    const columns = await knex('metadata').columnInfo();
    console.log(JSON.stringify(Object.keys(columns), null, 2));

    console.log('\n=== Sample Metadata Record ===');
    const record = await knex('metadata').first();
    console.log(JSON.stringify(record, null, 2));

    console.log('\n=== Documents Table Columns ===');
    const docColumns = await knex('documents').columnInfo();
    console.log(JSON.stringify(Object.keys(docColumns), null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
