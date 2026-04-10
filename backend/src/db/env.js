const { z } = require("zod");

const envSchema = z.object({
  BACKEND_PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_SSL: z.enum(["true", "false"]).optional().default("false"),
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

function createConfig(source = process.env) {
  const env = parseEnv(source);

  return {
    client: "pg",
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl: env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    },
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

module.exports = {
  parseEnv,
  createConfig,
};