/**
 * Catalog Validators — Zod schemas adapted to actual Supabase schema.
 * The API accepts "friendly" field names which are mapped to DB columns internally.
 */

const { z } = require("zod");

// Actual catalog_items.category values seen in the DB
const ITEM_TYPES = ["textbook", "reference", "journal", "magazine", "thesis", "dvd", "other", "BOOK", "JOURNAL", "MAGAZINE", "THESIS", "DVD", "OTHER"];
const STATES = ["ACTIVE", "RESERVED", "WITHDRAWN", "MAINTENANCE"];

const createCatalogItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  author: z.string().max(500).optional().nullable(),    // maps to authors
  isbn: z.string().max(20).optional().nullable(),
  subject: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  item_type: z.string().max(50).default("textbook"),    // maps to category
  language: z.string().max(50).default("EN"),
  publisher: z.string().max(255).optional().nullable(),
  publish_year: z.coerce.number().int().min(1000).max(2100).optional().nullable(), // maps to publication_year
  total_copies: z.coerce.number().int().min(1).default(1),
  available_copies: z.coerce.number().int().min(0).optional(),
  cover_image_url: z.string().max(1000).optional().nullable(),  // maps to cover_image
  tags: z.array(z.string().max(100)).max(20).default([]).optional(),
});

const updateCatalogItemSchema = createCatalogItemSchema.partial();

const searchQuerySchema = z.object({
  q: z.string().optional(),
  author: z.string().optional(),
  isbn: z.string().optional(),
  subject: z.string().optional(),
  status: z.string().optional(),           // maps to state
  location: z.string().optional(),
  item_type: z.string().optional(),        // maps to category
  language: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z
    .enum(["title", "author", "publish_year", "created_at", "available_copies"])
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Express middleware: validate request body against a Zod schema.
 */
function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        errors: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }
    req.validated = result.data;
    return next();
  };
}

/**
 * Express middleware: validate request query against a Zod schema.
 */
function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        errors: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }
    req.validatedQuery = result.data;
    return next();
  };
}

module.exports = {
  createCatalogItemSchema,
  updateCatalogItemSchema,
  searchQuerySchema,
  validateBody,
  validateQuery,
  ITEM_TYPES,
  STATES,
};
