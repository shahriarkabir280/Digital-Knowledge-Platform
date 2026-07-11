/**
 * Import Service
 * Handles bulk import of catalog items from CSV and MARC (ISO 2709 / MARCXML).
 * Validates, deduplicates, and inserts in batches of 500.
 */

const multer = require("multer");
const { z } = require("zod");
const catalogItems = require("../../db/repositories/catalogItems");
const auditLog = require("../../db/repositories/auditLog");

const SUPPORTED_EXT = [".csv", ".mrc", ".marc", ".xml"];

// Use memory storage for uploads (up to 20 MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter(_req, file, cb) {
    const name = (file.originalname || "").toLowerCase();
    const okExt = SUPPORTED_EXT.some((ext) => name.endsWith(ext));
    const okMime =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/marc" ||
      file.mimetype === "text/xml" ||
      file.mimetype === "application/xml" ||
      file.mimetype === "application/octet-stream";

    if (okExt || okMime) {
      cb(null, true);
    } else {
      cb(
        Object.assign(new Error("Only CSV and MARC (.mrc/.marc/.xml) files are supported"), {
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

// ── MARC parsing ─────────────────────────────────────────────────────
// Supports both ISO 2709 (binary .mrc) and MARCXML (.xml). Both are mapped
// into the same flat row shape the CSV path produces, then run through the
// same validation + insert pipeline.

const ISO = { RT: 0x1d, FT: 0x1e, SF: 0x1f }; // record/field/subfield terminators

/** Map an array of MARC fields → our flat catalog row. */
function marcFieldsToRow(fields, index) {
  // fields: [{ tag, subfields: [{ code, value }], value }]
  const authors = [];
  const row = { _lineNumber: index + 1 };

  const getSub = (tag, code) => {
    const f = fields.find((x) => x.tag === tag);
    if (!f || !f.subfields) return "";
    const sf = f.subfields.find((s) => s.code === code);
    return sf ? sf.value.trim() : "";
  };

  // 245 $a title, $b subtitle
  const title = [getSub("245", "a"), getSub("245", "b")]
    .filter(Boolean)
    .join(" ")
    .replace(/\s*[/:]\s*$/, "")
    .trim();
  row.title = title;

  // 100 / 700 authors ($a)
  for (const f of fields) {
    if ((f.tag === "100" || f.tag === "700") && f.subfields) {
      const a = f.subfields.find((s) => s.code === "a");
      if (a) authors.push(a.value.replace(/[,.]\s*$/, "").trim());
    }
  }
  row.authors = authors.join("; ");

  row.isbn = getSub("020", "a").split(/\s+/)[0] || ""; // strip qualifiers
  row.subject = getSub("650", "a").replace(/\.$/, "");
  row.publisher = getSub("260", "b") || getSub("264", "b");
  const pubYear = (getSub("260", "c") || getSub("264", "c")).match(/\d{4}/);
  row.publication_year = pubYear ? pubYear[0] : undefined;
  row.description = getSub("520", "a");
  row.call_number = getSub("050", "a") || getSub("082", "a");
  const lang = getSub("041", "a");
  if (lang) row.language = lang.slice(0, 3).toUpperCase();

  // Normalize empty strings to undefined so schema defaults apply.
  for (const k of Object.keys(row)) {
    if (row[k] === "") row[k] = undefined;
  }
  return row;
}

/** Parse an ISO 2709 (binary MARC) buffer into an array of flat rows. */
function parseMarcIso2709(buffer) {
  const rows = [];
  let start = 0;
  let recordIndex = 0;

  while (start < buffer.length) {
    // Skip stray whitespace/newlines between records.
    if (buffer[start] === 0x0a || buffer[start] === 0x0d || buffer[start] === 0x20) {
      start++;
      continue;
    }

    const recordLength = parseInt(buffer.toString("ascii", start, start + 5), 10);
    if (!recordLength || recordLength < 26 || start + recordLength > buffer.length) break;

    const record = buffer.subarray(start, start + recordLength);
    const baseAddress = parseInt(record.toString("ascii", 12, 17), 10);

    // Directory: entries of 12 bytes between leader(24) and baseAddress-1(FT).
    const dirEnd = baseAddress - 1;
    const fields = [];
    for (let p = 24; p + 12 <= dirEnd; p += 12) {
      const tag = record.toString("ascii", p, p + 3);
      const len = parseInt(record.toString("ascii", p + 3, p + 7), 10);
      const off = parseInt(record.toString("ascii", p + 7, p + 12), 10);
      const fStart = baseAddress + off;
      const fEnd = fStart + len - 1; // exclude field terminator
      const raw = record.subarray(fStart, fEnd);

      if (tag < "010") {
        fields.push({ tag, value: raw.toString("utf-8") });
      } else {
        // Control indicators (2 bytes) then subfields delimited by 0x1f.
        const body = raw.subarray(2);
        const subfields = [];
        const parts = body.toString("utf-8").split(String.fromCharCode(ISO.SF));
        for (const part of parts) {
          if (!part) continue;
          subfields.push({ code: part[0], value: part.slice(1) });
        }
        fields.push({ tag, subfields });
      }
    }

    rows.push(marcFieldsToRow(fields, recordIndex));
    recordIndex++;
    start += recordLength;
  }

  if (rows.length === 0) {
    throw Object.assign(new Error("No MARC records found in file"), {
      statusCode: 400,
      code: "INVALID_MARC",
    });
  }
  return rows;
}

/** Parse a MARCXML buffer into an array of flat rows (regex-based, no XML dep). */
function parseMarcXml(buffer) {
  const text = buffer.toString("utf-8");
  const recordBlocks = text.match(/<record[\s\S]*?<\/record>/gi) || [];
  const unescape = (s) =>
    s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");

  const rows = recordBlocks.map((block, index) => {
    const fields = [];

    // Control fields: <controlfield tag="008">value</controlfield>
    // Attribute values may use single OR double quotes.
    const ctrlRe = /<controlfield[^>]*tag=["'](\d{3})["'][^>]*>([\s\S]*?)<\/controlfield>/gi;
    let m;
    while ((m = ctrlRe.exec(block))) {
      fields.push({ tag: m[1], value: unescape(m[2]) });
    }

    // Data fields: <datafield tag="245" ...> <subfield code="a">..</subfield> </datafield>
    const dataRe = /<datafield[^>]*tag=["'](\d{3})["'][^>]*>([\s\S]*?)<\/datafield>/gi;
    while ((m = dataRe.exec(block))) {
      const tag = m[1];
      const subfields = [];
      const sfRe = /<subfield[^>]*code=["'](.)["'][^>]*>([\s\S]*?)<\/subfield>/gi;
      let s;
      while ((s = sfRe.exec(m[2]))) {
        subfields.push({ code: s[1], value: unescape(s[2]) });
      }
      fields.push({ tag, subfields });
    }

    return marcFieldsToRow(fields, index);
  });

  if (rows.length === 0) {
    throw Object.assign(new Error("No <record> elements found in MARCXML"), {
      statusCode: 400,
      code: "INVALID_MARC",
    });
  }
  return rows;
}

/**
 * Validate + insert an array of parsed rows (shared by CSV and MARC paths).
 * Returns { total, imported, duplicates, error_count, errors }.
 */
async function insertRows(rows, changedBy, source) {
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
  const validRows = [];

  for (const row of rows) {
    const { _lineNumber, ...data } = row;

    // Normalize empty strings to undefined so schema defaults apply.
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

  // Duplicate detection by ISBN — single query for all ISBNs (no N+1).
  const isbnsToCheck = [
    ...new Set(validRows.map((r) => r.isbn).filter((isbn) => isbn && isbn.length > 0)),
  ];
  const existingIsbns = new Set(
    isbnsToCheck.length > 0 ? await catalogItems.findExistingIsbns(isbnsToCheck) : []
  );

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const { _lineNumber, ...itemData } = row;

      // Skip duplicates (by ISBN) — existing DB rows or earlier in this import.
      if (itemData.isbn && existingIsbns.has(itemData.isbn)) {
        duplicates++;
        continue;
      }

      try {
        // Normalize CSV aliases before creating.
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

        await auditLog.record({
          entityType: "catalog_item",
          entityId: created.id,
          action: "CREATE",
          changedBy,
          newValues: { imported_from: source, title: created.title },
        });

        imported++;

        // Prevent in-batch duplicates.
        if (itemData.isbn) existingIsbns.add(itemData.isbn);
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
    errors: errors.slice(0, 100), // first 100 only
  };
}

/**
 * Process a CSV import buffer.
 */
async function processCsvImport(buffer, changedBy) {
  const rows = parseCsv(buffer);
  return insertRows(rows, changedBy, "csv");
}

/**
 * Detect format from filename/buffer and route to the right parser.
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {number} changedBy
 */
async function processImport(buffer, filename, changedBy) {
  const name = (filename || "").toLowerCase();

  if (name.endsWith(".xml")) {
    return { format: "marcxml", ...(await insertRows(parseMarcXml(buffer), changedBy, "marcxml")) };
  }
  if (name.endsWith(".mrc") || name.endsWith(".marc")) {
    return { format: "marc", ...(await insertRows(parseMarcIso2709(buffer), changedBy, "marc")) };
  }

  // Sniff binary MARC even without extension: first 5 bytes are ASCII digits
  // (the record length in the ISO 2709 leader).
  const head = buffer.subarray(0, 5).toString("ascii");
  if (/^\d{5}$/.test(head)) {
    return { format: "marc", ...(await insertRows(parseMarcIso2709(buffer), changedBy, "marc")) };
  }

  return { format: "csv", ...(await processCsvImport(buffer, changedBy)) };
}

module.exports = {
  uploadMiddleware,
  processCsvImport,
  processImport,
  // exported for testing
  parseMarcIso2709,
  parseMarcXml,
};
