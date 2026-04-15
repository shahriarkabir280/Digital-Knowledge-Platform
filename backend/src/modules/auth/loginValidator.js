const { z } = require("zod");

const loginSchema = z
  .object({
    email: z.string().trim().email().optional(),
    identifier: z.string().trim().optional(),
    password: z.string().min(8).max(128),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.identifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Email is required",
      });
    }

    if (!value.email && value.identifier) {
      const parsed = z.string().email().safeParse(value.identifier);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["identifier"],
          message: "Identifier must be a valid email",
        });
      }
    }
  });

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function mapValidationError(result) {
  const details = result.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

  return {
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message: "Invalid request payload",
    details,
  };
}

function validateLoginPayload(payload) {
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: mapValidationError(parsed),
    };
  }

  const email = normalizeEmail(parsed.data.email || parsed.data.identifier);

  return {
    ok: true,
    data: {
      email,
      password: parsed.data.password,
    },
  };
}

function validateRefreshPayload(payload) {
  const parsed = refreshSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: mapValidationError(parsed),
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}

module.exports = {
  validateLoginPayload,
  validateRefreshPayload,
};
