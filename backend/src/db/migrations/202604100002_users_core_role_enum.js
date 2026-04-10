const SRS_ROLES = [
  "GUEST",
  "MEMBER",
  "CONTRIBUTOR",
  "STAFF",
  "LAB_MANAGER",
  "ADMIN",
  "REVIEWER",
];

const LEGACY_ROLES = ["ADMIN", "LIBRARIAN", "MEMBER"];

async function addRoleCheck(knex, values, constraintName) {
  const allowed = values.map((value) => `'${value}'`).join(", ");
  await knex.raw(
    `alter table "users" add constraint "${constraintName}" check ("role" in (${allowed}))`,
  );
}

exports.up = async function up(knex) {
  const hasFullName = await knex.schema.hasColumn("users", "full_name");
  const hasName = await knex.schema.hasColumn("users", "name");
  const hasPasswordHash = await knex.schema.hasColumn("users", "password_hash");

  if (hasFullName && !hasName) {
    await knex.raw('alter table "users" rename column "full_name" to "name"');
  }

  if (!hasPasswordHash) {
    await knex.schema.alterTable("users", (table) => {
      table.string("password_hash", 255).notNullable().defaultTo("SEED_PASSWORD_HASH");
    });
  }

  await knex("users").where({ role: "LIBRARIAN" }).update({ role: "STAFF" });

  await knex.raw('alter table "users" drop constraint if exists "users_role_check"');
  await addRoleCheck(knex, SRS_ROLES, "users_role_check");
};

exports.down = async function down(knex) {
  const hasName = await knex.schema.hasColumn("users", "name");
  const hasFullName = await knex.schema.hasColumn("users", "full_name");
  const hasPasswordHash = await knex.schema.hasColumn("users", "password_hash");

  await knex("users")
    .whereNotIn("role", LEGACY_ROLES)
    .update({ role: "MEMBER" });

  await knex.raw('alter table "users" drop constraint if exists "users_role_check"');
  await addRoleCheck(knex, LEGACY_ROLES, "users_role_check");

  if (hasPasswordHash) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("password_hash");
    });
  }

  if (hasName && !hasFullName) {
    await knex.raw('alter table "users" rename column "name" to "full_name"');
  }
};