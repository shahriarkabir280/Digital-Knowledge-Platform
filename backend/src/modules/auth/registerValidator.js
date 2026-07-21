const { z } = require("zod");

const registerSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

const REQUIRED_INSTITUTIONAL_DOMAIN = "cs.du.ac.bd";

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function hasRequiredDomain(email) {
  const domain = email.split("@")[1] || "";
  return domain === REQUIRED_INSTITUTIONAL_DOMAIN;
}

function validateRegisterPayload(payload) {
  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      ok: false,
      error: {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid registration payload",
        details,
      },
    };
  }

  const data = parsed.data;
  const email = normalizeEmail(data.email);
  if (!hasRequiredDomain(email)) {
    return {
      ok: false,
      error: {
        statusCode: 400,
        code: "INVALID_INSTITUTIONAL_EMAIL",
        message: "Use your university email ending with @cs.du.ac.bd",
      },
    };
  }

  return {
    ok: true,
    data: {
      email,
      name: data.name,
      password: data.password,
      role: "MEMBER",
    },
  };
}

module.exports = {
  validateRegisterPayload,
};
