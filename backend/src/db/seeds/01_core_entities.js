const AccessTier = require("../../../../shared/types/AccessTier");

const ROLE = {
  GUEST: "GUEST",
  MEMBER: "MEMBER",
  CONTRIBUTOR: "CONTRIBUTOR",
  STAFF: "STAFF",
  LAB_MANAGER: "LAB_MANAGER",
  ADMIN: "ADMIN",
  REVIEWER: "REVIEWER",
};

const DEFAULT_PASSWORD_HASH = "$2b$10$2Yf4/5CWQwduz6r.4nXn0eS7hXgR8wX94m5N6ynwQyY0f7fD9U3x2";

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

  const seededUsers = [
    { name: "Local Guest", email: "guest@dkp.local", role: ROLE.GUEST },
    { name: "Local Member", email: "member@dkp.local", role: ROLE.MEMBER },
    { name: "Local Contributor", email: "contributor@dkp.local", role: ROLE.CONTRIBUTOR },
    { name: "Local Staff", email: "staff@dkp.local", role: ROLE.STAFF },
    { name: "Local Lab Manager", email: "lab-manager@dkp.local", role: ROLE.LAB_MANAGER },
    { name: "Local Admin", email: "admin@dkp.local", role: ROLE.ADMIN },
    { name: "Local Reviewer", email: "reviewer@dkp.local", role: ROLE.REVIEWER },
  ];

  const createdUsers = await knex("users")
    .insert(
      seededUsers.map((user) => ({
        ...user,
        password_hash: DEFAULT_PASSWORD_HASH,
        status: "ACTIVE",
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      })),
    )
    .returning(["id", "role"]);

  const adminUser = createdUsers.find((user) => user.role === ROLE.ADMIN);

  const [lab] = await knex("labs")
    .insert({
      name: "Digital Knowledge Lab",
      head_id: adminUser ? adminUser.id : null,
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