/**
 * Migration: Create loans and notifications tables
 * Phase 2 of Library Management implementation
 *
 * NOTE: Column names match the loans repository exactly:
 *   item_id (not catalog_item_id), renewed_count (not renewal_count)
 *   copy_id, issued_by, returned_to, fine_amount, fine_paid
 */

exports.up = async function (knex) {
  // ── catalog_copies (needed by loans for per-copy tracking) ───────
  const copiesExists = await knex.schema.hasTable("catalog_copies");
  if (!copiesExists) {
    await knex.schema.createTable("catalog_copies", (table) => {
      table.increments("id").primary();
      table
        .integer("item_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("catalog_items")
        .onDelete("CASCADE");
      table.string("barcode", 100).unique();
      table.string("status", 30).notNullable().defaultTo("AVAILABLE"); // AVAILABLE, CHECKED_OUT, LOST, DAMAGED
      table.string("condition", 50);
      table.timestamps(true, true);
    });
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_catalog_copies_item_id ON catalog_copies(item_id)`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_catalog_copies_status ON catalog_copies(status)`);
  }

  // ── loans (replace the simple stub version if it exists) ─────────
  const loansExists = await knex.schema.hasTable("loans");
  if (!loansExists) {
    await knex.schema.createTable("loans", (table) => {
      table.increments("id").primary();
      table
        .integer("item_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("catalog_items")
        .onDelete("RESTRICT");
      table
        .integer("member_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("RESTRICT");
      table
        .integer("copy_id")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("catalog_copies")
        .onDelete("SET NULL");
      table.timestamp("checkout_date").notNullable().defaultTo(knex.fn.now());
      table.timestamp("due_date").notNullable();
      table.timestamp("return_date").nullable();
      table.integer("renewed_count").unsigned().defaultTo(0);
      table
        .string("status", 30)
        .notNullable()
        .defaultTo("ACTIVE"); // ACTIVE, RETURNED, OVERDUE, LOST
      table
        .integer("issued_by")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
      table
        .integer("returned_to")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
      table.decimal("fine_amount", 10, 2).defaultTo(0);
      table.boolean("fine_paid").defaultTo(false);
      table.timestamps(true, true);
    });
  }

  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_loans_member_id ON loans(member_id)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_loans_catalog_item_id ON loans(catalog_item_id)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date)`
  );

  // ── notifications ────────────────────────────────────────────────
  await knex.schema.createTable("notifications", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .string("type", 50)
      .notNullable(); // DUE_REMINDER, OVERDUE, HOLD_READY, FINE, GENERAL
    table.string("title", 255).notNullable();
    table.text("message").notNullable();
    table.boolean("is_read").defaultTo(false);
    table.jsonb("metadata").defaultTo("{}"); // extra context (loan_id, item_id, etc.)
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.raw(
    `CREATE INDEX idx_notifications_user_id ON notifications(user_id)`
  );
  await knex.raw(
    `CREATE INDEX idx_notifications_type ON notifications(type)`
  );
  await knex.raw(
    `CREATE INDEX idx_notifications_is_read ON notifications(is_read)`
  );
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("notifications");
  await knex.schema.dropTableIfExists("loans");
  await knex.schema.dropTableIfExists("catalog_copies");
};
