/**
 * Report Service — adapted to actual Supabase schema.
 * Uses actual column names: item_id (not catalog_item_id), authors (not author)
 */

const db = require("../../db");

/**
 * Return the exclusive upper bound for a `to` filter. A date-only value like
 * "2026-07-11" means "include all of July 11", so we compare `< 2026-07-12`
 * instead of `<= 2026-07-11` (which is midnight and drops the whole last day).
 */
function endExclusive(to) {
  if (!to) return null;
  const s = String(to);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString();
  }
  return s; // already a full timestamp — use as-is
}

/** Apply an inclusive [from, to] date-range filter to a query. */
function applyRange(query, col, from, to) {
  if (from) query.where(col, ">=", from);
  const end = endExclusive(to);
  if (end) query.where(col, "<", end);
  return query;
}

// ── Circulation Report ─────────────────────────────────────────────

async function getCirculationReport({ from, to } = {}) {
  let query = db("loans")
    .select(
      db.raw("DATE_TRUNC('day', checkout_date) as date"),
      db.raw("COUNT(*) as checkouts"),
      db.raw("COUNT(*) FILTER (WHERE status = 'RETURNED') as returns"),
      db.raw("COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue")
    )
    .groupByRaw("DATE_TRUNC('day', checkout_date)")
    .orderBy("date", "asc");

  applyRange(query, "checkout_date", from, to);

  const rows = await query;

  const totals = await db("loans")
    .select(
      db.raw("COUNT(*) as total_loans"),
      db.raw("COUNT(*) FILTER (WHERE status = 'RETURNED') as total_returns"),
      db.raw("COUNT(*) FILTER (WHERE status = 'OVERDUE') as total_overdue"),
      db.raw("COUNT(*) FILTER (WHERE status = 'ACTIVE') as total_active")
    )
    .modify((q) => applyRange(q, "checkout_date", from, to))
    .first();

  return { daily: rows, totals };
}

// ── Popular Items ──────────────────────────────────────────────────

async function getPopularItems({ from, to, limit = 10 } = {}) {
  let query = db("loans")
    .join("catalog_items", "loans.item_id", "catalog_items.id")
    .select(
      "catalog_items.id",
      "catalog_items.title",
      "catalog_items.authors as author",
      "catalog_items.category as item_type",
      db.raw("COUNT(*) as checkout_count")
    )
    .groupBy("catalog_items.id", "catalog_items.title", "catalog_items.authors", "catalog_items.category")
    .orderBy("checkout_count", "desc")
    .limit(Math.min(limit, 50));

  applyRange(query, "loans.checkout_date", from, to);

  return query;
}

// ── Overdue Report ─────────────────────────────────────────────────

async function getOverdueReport({ from, to } = {}) {
  let query = db("loans")
    .join("catalog_items", "loans.item_id", "catalog_items.id")
    .join("users", "loans.member_id", "users.id")
    .select(
      "loans.id as loan_id",
      "loans.checkout_date",
      "loans.due_date",
      "loans.renewed_count",
      "catalog_items.title as item_title",
      "catalog_items.authors as item_author",
      "users.name as member_name",
      "users.email as member_email",
      db.raw(
        "EXTRACT(DAY FROM NOW() - loans.due_date)::integer as days_overdue"
      ),
      db.raw(
        "LEAST(EXTRACT(DAY FROM NOW() - loans.due_date)::integer, 30) * ? as estimated_fine",
        [RATE]
      )
    )
    .whereIn("loans.status", ["OVERDUE", "ACTIVE"])
    .where("loans.due_date", "<", db.fn.now())
    .orderBy("loans.due_date", "asc");

  applyRange(query, "loans.checkout_date", from, to);

  return query;
}

// ── Collection Stats ───────────────────────────────────────────────

async function getCollectionStats() {
  const [byType, totalStats] = await Promise.all([
    db("catalog_items")
      .whereNot("state", "WITHDRAWN")
      .select(
        "category as item_type",
        db.raw("COUNT(*) as item_count"),
        db.raw("SUM(total_copies) as total_copies"),
        db.raw("SUM(available_copies) as available_copies")
      )
      .groupBy("category")
      .orderBy("item_count", "desc"),

    db("catalog_items")
      .whereNot("state", "WITHDRAWN")
      .select(
        db.raw("COUNT(*) as total_titles"),
        db.raw("SUM(total_copies) as total_copies"),
        db.raw("SUM(available_copies) as available_copies"),
        db.raw(
          "COUNT(*) FILTER (WHERE available_copies > 0) as available_titles"
        ),
        db.raw(
          "COUNT(*) FILTER (WHERE available_copies = 0) as checked_out_titles"
        )
      )
      .first(),
  ]);

  return { byType, totals: totalStats };
}

// ── Member Activity ────────────────────────────────────────────────

async function getMemberActivity({ from, to } = {}) {
  let query = db("loans")
    .join("users", "loans.member_id", "users.id")
    .select(
      "users.id as member_id",
      "users.name as member_name",
      "users.email as member_email",
      db.raw("COUNT(*) as total_loans"),
      db.raw(
        "COUNT(*) FILTER (WHERE loans.status = 'OVERDUE') as overdue_count"
      ),
      db.raw(
        "COUNT(*) FILTER (WHERE loans.status = 'RETURNED') as returned_count"
      )
    )
    .groupBy("users.id", "users.name", "users.email")
    .orderBy("total_loans", "desc")
    .limit(50);

  applyRange(query, "loans.checkout_date", from, to);

  return query;
}

// ── Fine rate (kept consistent with the fines module) ──────────────
const { FINE_RATE_PER_DAY } = require("../../db/repositories/fines");
const RATE = FINE_RATE_PER_DAY || 5;

// ── New report types (bring total to 11) ───────────────────────────

/** 7. Fines summary + per-member outstanding balances. */
async function getFinesReport({ from, to } = {}) {
  const summaryQ = db("fines").select(
    db.raw("COUNT(*) as total_fines"),
    db.raw("COALESCE(SUM(amount), 0) as total_amount"),
    db.raw("COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0) as pending_amount"),
    db.raw("COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) as paid_amount"),
    db.raw("COALESCE(SUM(amount) FILTER (WHERE status = 'WAIVED'), 0) as waived_amount")
  );
  applyRange(summaryQ, "fines.created_at", from, to);

  const byMemberQ = db("fines")
    .join("users", "fines.member_id", "users.id")
    .select(
      "users.name as member_name",
      "users.email as member_email",
      db.raw("COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0) as outstanding"),
      db.raw("COUNT(*) as fine_count")
    )
    .groupBy("users.id", "users.name", "users.email")
    .havingRaw("SUM(amount) FILTER (WHERE status = 'PENDING') > 0")
    .orderBy("outstanding", "desc")
    .limit(50);
  applyRange(byMemberQ, "fines.created_at", from, to);

  const [summary, byMember] = await Promise.all([summaryQ.first(), byMemberQ]);
  return { summary, byMember };
}

/** 8. Active loans currently out (not yet returned). */
async function getActiveLoansReport({ from, to } = {}) {
  const query = db("loans")
    .join("catalog_items", "loans.item_id", "catalog_items.id")
    .join("users", "loans.member_id", "users.id")
    .select(
      "loans.id as loan_id",
      "catalog_items.title as item_title",
      "users.name as member_name",
      "loans.checkout_date",
      "loans.due_date",
      "loans.renewed_count"
    )
    .whereIn("loans.status", ["ACTIVE", "OVERDUE"])
    .orderBy("loans.due_date", "asc")
    .limit(500);

  applyRange(query, "loans.checkout_date", from, to);
  return query;
}

/** 9. Inventory / low-availability report. */
async function getInventoryReport() {
  const [lowStock, totals] = await Promise.all([
    db("catalog_items")
      .whereNot("state", "WITHDRAWN")
      .whereRaw("available_copies <= 1")
      .select("id", "title", "authors as author", "location", "total_copies", "available_copies")
      .orderBy("available_copies", "asc")
      .limit(200),
    db("catalog_items")
      .whereNot("state", "WITHDRAWN")
      .select(
        db.raw("COUNT(*) as total_titles"),
        db.raw("SUM(total_copies) as total_copies"),
        db.raw("SUM(available_copies) as available_copies"),
        db.raw("COUNT(*) FILTER (WHERE available_copies = 0) as out_of_stock")
      )
      .first(),
  ]);
  return { lowStock, totals };
}

/** 10. New acquisitions in a date range (by created_at). */
async function getNewAcquisitionsReport({ from, to } = {}) {
  const query = db("catalog_items")
    .whereNot("state", "WITHDRAWN")
    .select("id", "title", "authors as author", "category as item_type", "created_at")
    .orderBy("created_at", "desc")
    .limit(500);

  applyRange(query, "created_at", from, to);
  return query;
}

/** 11. Active holds queue report. */
async function getHoldsReport() {
  return db("holds")
    .join("catalog_items", "holds.item_id", "catalog_items.id")
    .join("users", "holds.member_id", "users.id")
    .select(
      "holds.id as hold_id",
      "catalog_items.title as item_title",
      "users.name as member_name",
      "holds.status",
      "holds.placed_at"
    )
    .whereIn("holds.status", ["QUEUED", "READY"])
    .orderBy("holds.placed_at", "asc")
    .limit(500);
}

// ── Export ─────────────────────────────────────────────────────────

async function exportReport({ type, format, from, to }) {
  let data;
  let reportTitle;
  let columns;

  switch (type) {
    case "circulation": {
      const report = await getCirculationReport({ from, to });
      data = report.daily.map((r) => ({
        Date: r.date ? new Date(r.date).toLocaleDateString() : "",
        Checkouts: r.checkouts,
        Returns: r.returns,
        Overdue: r.overdue,
      }));
      reportTitle = "Circulation Report";
      columns = ["Date", "Checkouts", "Returns", "Overdue"];
      break;
    }
    case "popular-items": {
      data = (await getPopularItems({ from, to, limit: 50 })).map((r) => ({
        Title: r.title,
        Author: r.author || "",
        Type: r.item_type,
        Checkouts: r.checkout_count,
      }));
      reportTitle = "Popular Items Report";
      columns = ["Title", "Author", "Type", "Checkouts"];
      break;
    }
    case "overdue": {
      data = (await getOverdueReport({ from, to })).map((r) => ({
        "Item Title": r.item_title,
        "Member Name": r.member_name,
        "Member Email": r.member_email,
        "Due Date": new Date(r.due_date).toLocaleDateString(),
        "Days Overdue": r.days_overdue,
        "Estimated Fine (BDT)": r.estimated_fine,
      }));
      reportTitle = "Overdue Items Report";
      columns = ["Item Title", "Member Name", "Member Email", "Due Date", "Days Overdue", "Estimated Fine (BDT)"];
      break;
    }
    case "member-activity": {
      data = (await getMemberActivity({ from, to })).map((r) => ({
        Name: r.member_name,
        Email: r.member_email,
        "Total Loans": r.total_loans,
        Returned: r.returned_count,
        Overdue: r.overdue_count,
      }));
      reportTitle = "Member Activity Report";
      columns = ["Name", "Email", "Total Loans", "Returned", "Overdue"];
      break;
    }
    case "collection-stats": {
      const report = await getCollectionStats();
      data = report.byType.map((r) => ({
        Type: r.item_type || "(uncategorized)",
        Titles: r.item_count,
        "Total Copies": r.total_copies,
        "Available Copies": r.available_copies,
      }));
      reportTitle = "Collection Statistics Report";
      columns = ["Type", "Titles", "Total Copies", "Available Copies"];
      break;
    }
    case "fines-summary": {
      const report = await getFinesReport({ from, to });
      data = report.byMember.map((r) => ({
        "Member Name": r.member_name,
        "Member Email": r.member_email,
        "Outstanding (BDT)": r.outstanding,
        "Fine Count": r.fine_count,
      }));
      reportTitle = "Fines Summary Report";
      columns = ["Member Name", "Member Email", "Outstanding (BDT)", "Fine Count"];
      break;
    }
    case "active-loans": {
      data = (await getActiveLoansReport({ from, to })).map((r) => ({
        "Item Title": r.item_title,
        "Member Name": r.member_name,
        "Checkout Date": new Date(r.checkout_date).toLocaleDateString(),
        "Due Date": new Date(r.due_date).toLocaleDateString(),
        Renewals: r.renewed_count,
      }));
      reportTitle = "Active Loans Report";
      columns = ["Item Title", "Member Name", "Checkout Date", "Due Date", "Renewals"];
      break;
    }
    case "inventory": {
      const report = await getInventoryReport();
      data = report.lowStock.map((r) => ({
        Title: r.title,
        Author: r.author || "",
        Location: r.location || "",
        "Total Copies": r.total_copies,
        "Available Copies": r.available_copies,
      }));
      reportTitle = "Inventory (Low Stock) Report";
      columns = ["Title", "Author", "Location", "Total Copies", "Available Copies"];
      break;
    }
    case "new-acquisitions": {
      data = (await getNewAcquisitionsReport({ from, to })).map((r) => ({
        Title: r.title,
        Author: r.author || "",
        Type: r.item_type || "",
        "Added On": new Date(r.created_at).toLocaleDateString(),
      }));
      reportTitle = "New Acquisitions Report";
      columns = ["Title", "Author", "Type", "Added On"];
      break;
    }
    case "holds": {
      data = (await getHoldsReport()).map((r) => ({
        "Item Title": r.item_title,
        "Member Name": r.member_name,
        Status: r.status,
        "Placed On": new Date(r.placed_at).toLocaleDateString(),
      }));
      reportTitle = "Holds Queue Report";
      columns = ["Item Title", "Member Name", "Status", "Placed On"];
      break;
    }
    default:
      throw Object.assign(new Error(`Unknown report type: ${type}`), {
        statusCode: 400,
        code: "UNKNOWN_REPORT_TYPE",
      });
  }

  if (format === "xlsx") {
    return buildExcel(reportTitle, columns, data);
  }
  return buildPdf(reportTitle, columns, data);
}

// ── Excel builder ──────────────────────────────────────────────────

async function buildExcel(title, columns, data) {
  try {
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DKP Library";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(title.substring(0, 31));

    sheet.addRow([title]);
    sheet.getRow(1).font = { bold: true, size: 14 };
    sheet.addRow([]);

    sheet.addRow(columns);
    const headerRow = sheet.getRow(3);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A5F" },
    };

    data.forEach((row) => {
      sheet.addRow(columns.map((col) => row[col] ?? ""));
    });

    sheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const length = cell.value ? String(cell.value).length : 0;
        if (length > maxLength) maxLength = length;
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${title.replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`,
    };
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      const csv = [
        columns.join(","),
        ...data.map((row) =>
          columns
            .map(
              (col) =>
                `"${(row[col] ?? "").toString().replace(/"/g, '""')}"`
            )
            .join(",")
        ),
      ].join("\n");

      return {
        buffer: Buffer.from(csv, "utf-8"),
        contentType: "text/csv",
        filename: `${title.replace(/\s+/g, "_")}_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`,
      };
    }
    throw err;
  }
}

// ── PDF builder ────────────────────────────────────────────────────

async function buildPdf(title, columns, data) {
  try {
    const PDFDocument = require("pdfkit");
    const buffers = [];

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      layout: "landscape",
    });

    doc.on("data", (chunk) => buffers.push(chunk));

    await new Promise((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(title, { align: "center" });
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#666666")
        .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
      doc.moveDown(1);

      const colWidth = Math.floor((doc.page.width - 80) / columns.length);
      const rowHeight = 20;
      let y = doc.y;

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#ffffff");
      doc.rect(40, y, doc.page.width - 80, rowHeight).fill("#1e3a5f");
      columns.forEach((col, i) => {
        doc
          .fillColor("#ffffff")
          .text(col, 40 + i * colWidth + 4, y + 5, {
            width: colWidth - 8,
            ellipsis: true,
          });
      });

      y += rowHeight;

      doc.font("Helvetica").fontSize(8).fillColor("#333333");
      data.forEach((row, rowIdx) => {
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = 40;
        }
        const bg = rowIdx % 2 === 0 ? "#f8f9fa" : "#ffffff";
        doc.rect(40, y, doc.page.width - 80, rowHeight).fill(bg);

        columns.forEach((col, i) => {
          doc
            .fillColor("#333333")
            .text(String(row[col] ?? ""), 40 + i * colWidth + 4, y + 5, {
              width: colWidth - 8,
              ellipsis: true,
            });
        });

        y += rowHeight;
      });

      doc.end();
    });

    return {
      buffer: Buffer.concat(buffers),
      contentType: "application/pdf",
      filename: `${title.replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`,
    };
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      const text = [
        title,
        "=".repeat(title.length),
        columns.join(" | "),
        "-".repeat(columns.length * 15),
        ...data.map((row) =>
          columns.map((col) => row[col] ?? "").join(" | ")
        ),
      ].join("\n");

      return {
        buffer: Buffer.from(text, "utf-8"),
        contentType: "text/plain",
        filename: `${title.replace(/\s+/g, "_")}_${new Date()
          .toISOString()
          .slice(0, 10)}.txt`,
      };
    }
    throw err;
  }
}

module.exports = {
  getCirculationReport,
  getPopularItems,
  getOverdueReport,
  getCollectionStats,
  getMemberActivity,
  getFinesReport,
  getActiveLoansReport,
  getInventoryReport,
  getNewAcquisitionsReport,
  getHoldsReport,
  exportReport,
};
