async function ensureDocumentStateLogsTable(knex) {
  const hasTable = await knex.schema.hasTable("document_state_logs");
  if (hasTable) {
    return;
  }

  await knex.schema.createTable("document_state_logs", (table) => {
    table.increments("id").primary();
    table
      .integer("document_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("documents")
      .onDelete("CASCADE");
    table.string("from_state", 50).notNullable();
    table.string("to_state", 50).notNullable();
    table.text("note");
    table
      .integer("changed_by")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index(["document_id", "created_at"], "idx_document_state_logs_document_created_at");
    table.index(["changed_by"], "idx_document_state_logs_changed_by");
  });
}

async function ensureNotificationsTable(knex) {
  const hasTable = await knex.schema.hasTable("notifications");
  if (hasTable) {
    return;
  }

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
      .integer("document_id")
      .unsigned()
      .references("id")
      .inTable("documents")
      .onDelete("CASCADE");
    table.string("event_type", 50).notNullable();
    table.string("title", 255).notNullable();
    table.text("message").notNullable();
    table.boolean("is_read").notNullable().defaultTo(false);
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index(["user_id", "is_read", "created_at"], "idx_notifications_user_read_created_at");
    table.index(["document_id"], "idx_notifications_document_id");
  });
}

exports.up = async function up(knex) {
  await ensureDocumentStateLogsTable(knex);
  await ensureNotificationsTable(knex);
};

exports.down = async function down(knex) {
  const hasNotifications = await knex.schema.hasTable("notifications");
  if (hasNotifications) {
    await knex.schema.dropTable("notifications");
  }

  const hasLogs = await knex.schema.hasTable("document_state_logs");
  if (hasLogs) {
    await knex.schema.dropTable("document_state_logs");
  }
};
