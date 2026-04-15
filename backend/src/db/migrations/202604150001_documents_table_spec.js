const AccessTier = require("../../../../shared/types/AccessTier");

const DOCUMENT_STATES = ["draft", "review", "published", "archived"];

async function addCheckConstraint(knex, tableName, columnName, values, constraintName) {
  const allowed = values.map((value) => `'${value}'`).join(", ");
  await knex.raw(
    `alter table "${tableName}" add constraint "${constraintName}" check ("${columnName}" in (${allowed}))`,
  );
}

async function ensureDocumentsTable(knex) {
  const hasDocumentsTable = await knex.schema.hasTable("documents");

  if (!hasDocumentsTable) {
    await knex.schema.createTable("documents", (table) => {
      table.increments("id").primary();
      table.string("title", 255).notNullable();
      table.string("type", 100).notNullable();
      table.string("format", 50).notNullable();
      table.string("file_path", 512).notNullable();
      table.integer("version").notNullable().defaultTo(1);
      table.string("state", 50).notNullable().defaultTo("draft");
      table.string("access_tier", 50).notNullable().defaultTo(AccessTier.REGISTERED);
      table.integer("uploader_id").unsigned().notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.timestamps(true, true);
    });

    await addCheckConstraint(knex, "documents", "state", DOCUMENT_STATES, "documents_state_check");
    await addCheckConstraint(
      knex,
      "documents",
      "access_tier",
      Object.values(AccessTier),
      "documents_access_tier_check",
    );

    return;
  }

  const hasType = await knex.schema.hasColumn("documents", "type");
  const hasDocumentType = await knex.schema.hasColumn("documents", "document_type");

  if (!hasType && hasDocumentType) {
    await knex.raw('alter table "documents" rename column "document_type" to "type"');
  }

  const hasFormat = await knex.schema.hasColumn("documents", "format");
  const hasFileFormat = await knex.schema.hasColumn("documents", "file_format");

  if (!hasFormat && hasFileFormat) {
    await knex.raw('alter table "documents" rename column "file_format" to "format"');
  }
}

exports.up = async function up(knex) {
  await ensureDocumentsTable(knex);
};

exports.down = async function down(knex) {
  const hasDocumentsTable = await knex.schema.hasTable("documents");

  if (!hasDocumentsTable) {
    return;
  }

  const hasType = await knex.schema.hasColumn("documents", "type");
  const hasDocumentType = await knex.schema.hasColumn("documents", "document_type");

  if (hasType && !hasDocumentType) {
    await knex.raw('alter table "documents" rename column "type" to "document_type"');
  }

  const hasFormat = await knex.schema.hasColumn("documents", "format");
  const hasFileFormat = await knex.schema.hasColumn("documents", "file_format");

  if (hasFormat && !hasFileFormat) {
    await knex.raw('alter table "documents" rename column "format" to "file_format"');
  }
};
