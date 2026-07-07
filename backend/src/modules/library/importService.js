/**
 * Import Service
 * Handles bulk CSV import of catalog items.
 * Validates, deduplicates, and inserts in batches of 500.
 */

const multer = require("multer");
const { z } = require("zod");
const catalogItems = require("../../db/repositories/catalogItems");
const auditLog = require("../../db/repositories/auditLog");

// Use memory storage for CSV files (up to 20 MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter(_req, file, cb) {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(
        Object.assign(new Error("Only CSV files are supported"), {
          statusCode: 415,
          code: "INVALID_FILE_TYPE",
        })
      );
    }
  },
});

const uploadMiddleware = upload.single("file");

// Zod schema for a single CSV row (maps to actual DB schema)
const importRowSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  authors: z.string().max(500).optional().default(""),
  author: z.string().max(500).optional().default(""),   // alias
  isbn: z.string().max(20).optional().default(""),
  subject: z.string().max(255).optional().default(""),
  description: z.string().optional().default(""),
  location: z.string().max(255).optional().default(""),
  category: z.string().max(50).default("textbook"),
  item_type: z.string().max(50).optional(),              // alias for category
  language: z.string().max(50).default("EN"),
  publisher: z.string().max(255).optional().default(""),
  publication_year: z.coerce.number().int().min(1000).max(2100).optional().nullable(),
  publish_year: z.coerce.number().int().min(1000).max(2100).optional().nullable(), // alias
  total_copies: z.coerce.number().int().min(1).default(1),
  cover_image: z.string().max(1000).optional().nullable().or(z.literal("")),
  cover_image_url: z.string().max(1000).optional().nullable().or(z.literal("")), // alias
});

/**
 * Parse a CSV buffer into an array of row objects.
 */
function parseCsv(buffer) {
  const text = buffer.toString("utf-8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw Object.assign(new Error("CSV must have a header row and at least one data row"), {
      statusCode: 400,
      code: "INVALID_CSV",
    });
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = (values[i] || "").trim();
    });
    obj._lineNumber = index + 2; // 2 because line 1 is header
    return obj;
  });
}

/**
 * Parse a single CSV line handling quoted fields.
 */
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Process a CSV import buffer.
 * Returns { total, imported, duplicates, errors }.
 */
async function processCsvImport(buffer, changedBy) {
  const rows = parseCsv(buffer);
  const BATCH_SIZE = 500;
  const MAX_ROWS = 10000;

  if (rows.length > MAX_ROWS) {
    throw Object.assign(
      new Error(`Maximum ${MAX_ROWS} rows allowed per import`),
      { statusCode: 400, code: "TOO_MANY_ROWS" }
    );
  }

  let imported = 0;
  let duplicates = 0;
  const errors = [];

  // Validate and collect valid rows
  const validRows = [];

  for (const row of rows) {
    const { _lineNumber, ...data } = row;

    // Normalize empty strings to null/undefined
    const cleanData = {};
    for (const [key, val] of Object.entries(data)) {
      cleanData[key] = val === "" ? undefined : val;
    }

    const result = importRowSchema.safeParse(cleanData);
    if (!result.success) {
      errors.push({
        line: _lineNumber,
        row: data.title || `Row ${_lineNumber}`,
        errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
      continue;
    }

    validRows.push({ ...result.data, _lineNumber });
  }

  // Check for duplicate ISBNs in the existing database
  const isbnsToCheck = validRows
    .map((r) => r.isbn)
    .filter((isbn) => isbn && isbn.length > 0);

  const existingIsbnRows =
    isbnsToCheck.length > 0
      ? await Promise.all(
          isbnsToCheck.map((isbn) => catalogItems.findByIsbn(isbn))
        )
      : [];

  const existingIsbns = new Set(
    existingIsbnRows.flat().map((r) => r.isbn)
  );

  // Process in batches
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const { _lineNumber, ...itemData } = row;

      // Skip duplicates (by ISBN)
      if (itemData.isbn && existingIsbns.has(itemData.isbn)) {
        duplicates++;
        continue;
      }

      // Skip duplicate barcodes in this import batch
      if (itemData.barcode && !itemData.barcode) {
        delete itemData.barcode;
      }

      try {
        // Normalize aliases before creating
        const normalized = { ...itemData };
        if (!normalized.authors && normalized.author) normalized.authors = normalized.author;
        delete normalized.author;
        if (!normalized.publication_year && normalized.publish_year) normalized.publication_year = normalized.publish_year;
        delete normalized.publish_year;
        if (!normalized.category && normalized.item_type) normalized.category = normalized.item_type;
        delete normalized.item_type;
        if (!normalized.cover_image && normalized.cover_image_url) normalized.cover_image = normalized.cover_image_url;
        delete normalized.cover_image_url;

        const created = await catalogItems.create(normalized, []);

        // Audit log each creation
        await auditLog.record({
          entityType: "catalog_item",
          entityId: created.id,
          action: "CREATE",
          changedBy,
          newValues: { imported_from: "csv", title: created.title },
        });

        imported++;

        // Add to seen ISBNs to prevent in-batch duplicates
        if (itemData.isbn) {
          existingIsbns.add(itemData.isbn);
        }
      } catch (err) {
        errors.push({
          line: _lineNumber,
          row: itemData.title,
          errors: [err.message],
        });
      }
    }
  }

  return {
    total: rows.length,
    imported,
    duplicates,
    error_count: errors.length,
    errors: errors.slice(0, 100), // Return first 100 errors only
  };
}

module.exports = {
  uploadMiddleware,
  processCsvImport,
};
