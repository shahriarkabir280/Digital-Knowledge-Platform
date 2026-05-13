const { z } = require("zod");

const envSchema = z.object({
  BACKEND_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

function parseEnv(source = process.env) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");

    throw new Error(`Invalid backend environment variables: ${details}`);
  }

  return result.data;
}

/**
 * Parse PostgreSQL connection string (URI format)
 * Format: postgresql://user:password@host:port/database?options
 */
function parseConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);
    // Supabase direct connections always require SSL; also honour ?sslmode=require
    const isSupabase = url.hostname.includes("supabase.co") || url.hostname.includes("supabase.com");
    const sslRequired = isSupabase || url.searchParams.get("sslmode") === "require";
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      database: url.pathname.slice(1).split("?")[0], // strip any query params from db name
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: sslRequired ? { rejectUnauthorized: false } : false,
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error.message}`);
  }
}

function createConfig(source = process.env) {
  const env = parseEnv(source);

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required and must point to your Supabase database");
  }

  console.log("📡 Using Supabase database via DATABASE_URL");
  const connection = parseConnectionString(env.DATABASE_URL);

  return {
    client: "pg",
    connection,
    migrations: {
      directory: "./src/db/migrations",
      extension: "js",
    },
    seeds: {
      directory: "./src/db/seeds",
      extension: "js",
    },
    pool: {
      min: 0,
      max: 10,
    },
  };
}

function getSupabaseConfig(source = process.env) {
  const env = parseEnv(source);

  return {
    url: env.SUPABASE_URL || "",
    anonKey: env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

module.exports = {
  parseEnv,
  createConfig,
  parseConnectionString,
  getSupabaseConfig,
};