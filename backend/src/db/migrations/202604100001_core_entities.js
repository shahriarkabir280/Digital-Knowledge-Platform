const AccessTier = require("../../../../shared/types/AccessTier");
const Role = require("../../../../shared/types/Role");

const DOCUMENT_STATES = ["draft", "review", "published", "archived"];
const LOAN_STATUS = ["ACTIVE", "RETURNED", "OVERDUE"];
const USER_STATUS = ["ACTIVE", "INACTIVE", "ARCHIVED"];

async function addCheckConstraint(knex, tableName, columnName, values, constraintName) {
  const allowed = values.map((value) => `'${value}'`).join(", ");
  await knex.raw(
    `alter table "${tableName}" add constraint "${constraintName}" check ("${columnName}" in (${allowed}))`,
  );
}

exports.up = async function up(knex) {
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("email", 255).notNullable().unique();
    table.string("full_name", 255).notNullable();
    table.string("role", 50).notNullable();
    table.string("status", 50).notNullable().defaultTo("ACTIVE");
    table.timestamps(true, true);
  });

  await addCheckConstraint(knex, "users", "role", Object.values(Role), "users_role_check");
  await addCheckConstraint(knex, "users", "status", USER_STATUS, "users_status_check");

  await knex.schema.createTable("labs", (table) => {
    table.increments("id").primary();
    table.string("name", 255).notNullable().unique();
    table.integer("head_id").unsigned().references("id").inTable("users").onDelete("SET NULL");
    table.text("description");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("documents", (table) => {
    table.increments("id").primary();
    table.integer("uploader_id").unsigned().notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("title", 255).notNullable();
    table.string("document_type", 100).notNullable();
    table.string("file_format", 50).notNullable();
    table.string("file_path", 512).notNullable();
    table.integer("version").notNullable().defaultTo(1);
    table.string("state", 50).notNullable().defaultTo("draft");
    table.string("access_tier", 50).notNullable().defaultTo(AccessTier.REGISTERED);
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

  await knex.schema.createTable("metadata", (table) => {
    table.increments("id").primary();
    table.integer("document_id").unsigned().notNullable().unique().references("id").inTable("documents").onDelete("CASCADE");
    table.text("summary");
    table.jsonb("keywords").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.integer("published_year");
    table.jsonb("extra_data").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamps(true, true);
  });

  await knex.schema.createTable("research_papers", (table) => {
    table.increments("id").primary();
    table.integer("document_id").unsigned().notNullable().unique().references("id").inTable("documents").onDelete("CASCADE");
    table.integer("lab_id").unsigned().references("id").inTable("labs").onDelete("SET NULL");
    table.integer("citation_count").notNullable().defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("annotations", (table) => {
    table.increments("id").primary();
    table.integer("document_id").unsigned().notNullable().references("id").inTable("documents").onDelete("CASCADE");
    table.integer("user_id").unsigned().notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.integer("parent_id").unsigned().references("id").inTable("annotations").onDelete("CASCADE");
    table.integer("page_number");
    table.jsonb("coordinates");
    table.text("content").notNullable();
    table.string("visibility", 50).notNullable().defaultTo(AccessTier.REGISTERED);
    table.timestamps(true, true);
  });

  await addCheckConstraint(
    knex,
    "annotations",
    "visibility",
    Object.values(AccessTier),
    "annotations_visibility_check",
  );

  await knex.schema.createTable("items", (table) => {
    table.increments("id").primary();
    table.string("barcode", 120).notNullable().unique();
    table.string("title", 255).notNullable();
    table.string("status", 50).notNullable().defaultTo("AVAILABLE");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("loans", (table) => {
    table.increments("id").primary();
    table.integer("item_id").unsigned().notNullable().references("id").inTable("items").onDelete("CASCADE");
    table.integer("member_id").unsigned().notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.date("checkout_date").notNullable();
    table.date("due_date").notNullable();
    table.date("return_date");
    table.string("status", 50).notNullable().defaultTo("ACTIVE");
    table.timestamps(true, true);
  });

  await addCheckConstraint(knex, "loans", "status", LOAN_STATUS, "loans_status_check");

  await knex.schema.createTable("citations", (table) => {
    table.increments("id").primary();
    table.integer("source_paper_id").unsigned().notNullable().references("id").inTable("research_papers").onDelete("CASCADE");
    table.integer("target_paper_id").unsigned().notNullable().references("id").inTable("research_papers").onDelete("CASCADE");
    table.timestamps(true, true);

    table.unique(["source_paper_id", "target_paper_id"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("citations");
  await knex.schema.dropTableIfExists("loans");
  await knex.schema.dropTableIfExists("items");
  await knex.schema.dropTableIfExists("annotations");
  await knex.schema.dropTableIfExists("research_papers");
  await knex.schema.dropTableIfExists("metadata");
  await knex.schema.dropTableIfExists("documents");
  await knex.schema.dropTableIfExists("labs");
  await knex.schema.dropTableIfExists("users");
};