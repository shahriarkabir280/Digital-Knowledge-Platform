/**
 * Migration: Create catalog_items, catalog_tags, and audit_log tables
 * Phase 1 of Library Management implementation
 */

exports.up = async function (knex) {
  // ── catalog_items ────────────────────────────────────────────────
  await knex.schema.createTableIfNotExists("catalog_items", (table) => {
    table.increments("id").primary();
    table.string("title", 500).notNullable();
    table.string("author", 500);
    table.string("isbn", 20);
    table.string("subject", 255);
    table.text("description");
    table.string("location", 255);
    table.string("call_number", 100);
    table.string("item_type", 50).defaultTo("BOOK"); // BOOK, JOURNAL, MAGAZINE, THESIS, DVD, OTHER
    table.string("language", 50).defaultTo("en");
    table.string("publisher", 255);
    table.integer("publish_year");
    table.integer("total_copies").defaultTo(1).unsigned();
    table.integer("available_copies").defaultTo(1).unsigned();
    table.string("cover_image_url", 1000);
    table.string("barcode", 100).unique();
    table
      .string("status", 30)
      .defaultTo("AVAILABLE")
      .notNullable(); // AVAILABLE, CHECKED_OUT, RESERVED, LOST, WITHDRAWN
    table.boolean("is_deleted").defaultTo(false);
    table.timestamps(true, true); // created_at, updated_at
  });

  // Add full-text search index using raw SQL (PostgreSQL tsvector)
  // Use DO block to safely skip if column already exists
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'catalog_items' AND column_name = 'search_vector'
      ) THEN
        ALTER TABLE catalog_items
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(author, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(subject, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(description, '')), 'D')
        ) STORED;
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_catalog_items_search ON catalog_items USING GIN(search_vector)
  `);

  // Additional indexes for faceted filtering
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_catalog_items_isbn ON catalog_items(isbn)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON catalog_items(status)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_catalog_items_item_type ON catalog_items(item_type)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_catalog_items_location ON catalog_items(location)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_catalog_items_language ON catalog_items(language)`);

  // ── catalog_tags ─────────────────────────────────────────────────
  await knex.schema.createTableIfNotExists("catalog_tags", (table) => {
    table.increments("id").primary();
    table
      .integer("catalog_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("catalog_items")
      .onDelete("CASCADE");
    table.string("tag", 100).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.unique(["catalog_item_id", "tag"]);
  });

  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_catalog_tags_tag ON catalog_tags(tag)`
  );

  // ── audit_log ────────────────────────────────────────────────────
  await knex.schema.createTableIfNotExists("audit_log", (table) => {
    table.increments("id").primary();
    table.string("entity_type", 50).notNullable(); // e.g. 'catalog_item', 'loan'
    table.integer("entity_id").notNullable();
    table.string("action", 30).notNullable(); // CREATE, UPDATE, DELETE
    table
      .integer("changed_by")
      .unsigned()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.jsonb("old_values").defaultTo("{}");
    table.jsonb("new_values").defaultTo("{}");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by)`
  );
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("audit_log");
  await knex.schema.dropTableIfExists("catalog_tags");
  await knex.schema.dropTableIfExists("catalog_items");
};
