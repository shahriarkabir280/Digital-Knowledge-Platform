const AccessTier = require("../../../../shared/types/AccessTier");
const Role = require("../../../../shared/types/Role");

exports.seed = async function seed(knex) {
  await knex("citations").del();
  await knex("loans").del();
  await knex("items").del();
  await knex("annotations").del();
  await knex("research_papers").del();
  await knex("metadata").del();
  await knex("documents").del();
  await knex("labs").del();
  await knex("users").del();

  const [adminUser] = await knex("users")
    .insert({
      email: "admin@dkp.local",
      full_name: "Local Admin",
      role: Role.ADMIN,
      status: "ACTIVE",
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .returning(["id"]);

  const [lab] = await knex("labs")
    .insert({
      name: "Digital Knowledge Lab",
      head_id: adminUser.id,
      description: "Seed lab for local development",
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .returning(["id"]);

  const [document] = await knex("documents")
    .insert({
      uploader_id: adminUser.id,
      title: "Seeded Research Paper",
      document_type: "research-paper",
      file_format: "pdf",
      file_path: "/seed/research-paper.pdf",
      version: 1,
      state: "published",
      access_tier: AccessTier.REGISTERED,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .returning(["id"]);

  await knex("metadata").insert({
    document_id: document.id,
    summary: "Seeded metadata record for local development",
    keywords: JSON.stringify(["seed", "research", "local"]),
    published_year: 2026,
    extra_data: JSON.stringify({ source: "seed" }),
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });

  const [paper] = await knex("research_papers")
    .insert({
      document_id: document.id,
      lab_id: lab.id,
      citation_count: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .returning(["id"]);

  await knex("citations").insert({
    source_paper_id: paper.id,
    target_paper_id: paper.id,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });
};