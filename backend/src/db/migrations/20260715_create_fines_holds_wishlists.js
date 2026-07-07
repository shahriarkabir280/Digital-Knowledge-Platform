/**
 * Migration: Create fines, hold_requests, and wishlists tables
 * Phase 3 of Library Management implementation
 */

exports.up = async function (knex) {
  // ── fines ────────────────────────────────────────────────────────
  await knex.schema.createTable("fines", (table) => {
    table.increments("id").primary();
    table
      .integer("loan_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("loans")
      .onDelete("RESTRICT");
    table
      .integer("member_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.decimal("amount", 10, 2).notNullable().defaultTo(0);
    table.string("currency", 10).defaultTo("BDT");
    table.string("reason", 500);
    table.string("status", 30).notNullable().defaultTo("PENDING"); // PENDING, PAID, WAIVED
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("paid_at").nullable();
  });

  await knex.raw(`CREATE INDEX idx_fines_member_id ON fines(member_id)`);
  await knex.raw(`CREATE INDEX idx_fines_loan_id ON fines(loan_id)`);
  await knex.raw(`CREATE INDEX idx_fines_status ON fines(status)`);

  // ── hold_requests ────────────────────────────────────────────────
  await knex.schema.createTable("hold_requests", (table) => {
    table.increments("id").primary();
    table
      .integer("catalog_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("catalog_items")
      .onDelete("CASCADE");
    table
      .integer("member_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.integer("position").unsigned().notNullable().defaultTo(1);
    table.string("status", 30).notNullable().defaultTo("QUEUED"); // QUEUED, READY, FULFILLED, CANCELLED
    table.timestamp("notified_at").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // A member can only have one active hold per item
    table.unique(["catalog_item_id", "member_id"]);
  });

  await knex.raw(`CREATE INDEX idx_hold_requests_catalog_item_id ON hold_requests(catalog_item_id)`);
  await knex.raw(`CREATE INDEX idx_hold_requests_member_id ON hold_requests(member_id)`);
  await knex.raw(`CREATE INDEX idx_hold_requests_status ON hold_requests(status)`);

  // ── wishlists ────────────────────────────────────────────────────
  await knex.schema.createTable("wishlists", (table) => {
    table.increments("id").primary();
    table
      .integer("member_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .integer("catalog_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("catalog_items")
      .onDelete("CASCADE");
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.unique(["member_id", "catalog_item_id"]);
  });

  await knex.raw(`CREATE INDEX idx_wishlists_member_id ON wishlists(member_id)`);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("wishlists");
  await knex.schema.dropTableIfExists("hold_requests");
  await knex.schema.dropTableIfExists("fines");
};
