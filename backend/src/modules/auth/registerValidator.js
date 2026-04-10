const { z } = require("zod");

const registerSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128),
  role: z.enum(["MEMBER", "CONTRIBUTOR"]).optional(),
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
      ...data,
      email,
      role: data.role || "MEMBER",
    },
  };
}

module.exports = {
  validateRegisterPayload,
};
