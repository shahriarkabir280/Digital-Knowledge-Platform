/**
 * Migration: Collaborative features (SRS 5.6 — FR-DKP-037..040)
 *
 * Creates the annotation / discussion / reading-room table set and the
 * reading_room_members table that backs "invite members" (FR-DKP-040).
 *
 * Every createTable is guarded by hasTable so this is safe to run even when
 * the tables were previously provisioned by
 * backend/scripts/create_collaborative_tables.sql. document_id is stored as
 * TEXT to match the existing collaboration controller, which references
 * documents by string id across research/academic resource tables.
 */

exports.up = async function (knex) {
  if (!(await knex.schema.hasTable("annotations"))) {
    await knex.schema.createTable("annotations", (table) => {
      table.bigIncrements("id").primary();
      table.text("document_id").notNullable();
      table
        .bigInteger("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.text("section_ref").notNullable();
      table.text("quoted_text");
      table.text("comment_text").notNullable();
      table.text("highlight_color").notNullable().defaultTo("yellow");
      table.boolean("is_public").notNullable().defaultTo(true);
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_annotations_document_id ON annotations(document_id)`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id)`);
  }

  if (!(await knex.schema.hasTable("annotation_replies"))) {
    await knex.schema.createTable("annotation_replies", (table) => {
      table.bigIncrements("id").primary();
      table
        .bigInteger("annotation_id")
        .notNullable()
        .references("id")
        .inTable("annotations")
        .onDelete("CASCADE");
      table
        .bigInteger("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.text("reply_text").notNullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    });
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_replies_annotation_id ON annotation_replies(annotation_id)`);
  }

  if (!(await knex.schema.hasTable("reading_rooms"))) {
    await knex.schema.createTable("reading_rooms", (table) => {
      table.bigIncrements("id").primary();
      table.text("name").notNullable();
      table.text("document_id").notNullable();
      table
        .bigInteger("host_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    });
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_reading_rooms_document_id ON reading_rooms(document_id)`);
  }

  if (!(await knex.schema.hasTable("reading_room_messages"))) {
    await knex.schema.createTable("reading_room_messages", (table) => {
      table.bigIncrements("id").primary();
      table
        .bigInteger("room_id")
        .notNullable()
        .references("id")
        .inTable("reading_rooms")
        .onDelete("CASCADE");
      table
        .bigInteger("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.text("message_text").notNullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    });
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON reading_room_messages(room_id)`);
  }

  if (!(await knex.schema.hasTable("reading_room_presence"))) {
    await knex.schema.createTable("reading_room_presence", (table) => {
      table.bigIncrements("id").primary();
      table
        .bigInteger("room_id")
        .notNullable()
        .references("id")
        .inTable("reading_rooms")
        .onDelete("CASCADE");
      table
        .bigInteger("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.timestamp("last_seen_at").notNullable().defaultTo(knex.fn.now());
      table.unique(["room_id", "user_id"], { indexName: "unique_room_user" });
    });
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_room_presence_room_id ON reading_room_presence(room_id)`);
  }

  // ── reading_room_members (FR-DKP-040: invite members) ────────────
  if (!(await knex.schema.hasTable("reading_room_members"))) {
    await knex.schema.createTable("reading_room_members", (table) => {
      table.bigIncrements("id").primary();
      table
        .bigInteger("room_id")
        .notNullable()
        .references("id")
        .inTable("reading_rooms")
        .onDelete("CASCADE");
      table
        .bigInteger("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table
        .bigInteger("invited_by")
        .nullable()
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
      table.text("role").notNullable().defaultTo("MEMBER"); // HOST or MEMBER
      table.text("status").notNullable().defaultTo("INVITED"); // INVITED or JOINED
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.unique(["room_id", "user_id"], { indexName: "unique_room_member" });
    });
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON reading_room_members(room_id)`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON reading_room_members(user_id)`);
  }
};

exports.down = async function (knex) {
  // Only drop the members table this migration introduced; the shared
  // collaboration tables may predate this migration (SQL-script provisioned),
  // so leave them intact to avoid destroying pre-existing data.
  await knex.schema.dropTableIfExists("reading_room_members");
};
