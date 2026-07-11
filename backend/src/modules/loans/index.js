/**
 * Loans Module Router
 * Handles checkout, return, renewal, and loan history routes.
 */

const { Router } = require("express");
const requireAuth = require("../../api/middlewares/requireAuth");
const requireRole = require("../../api/middlewares/requireRole");
const loansRepository = require("../../db/repositories/loans");
const auditLog = require("../../db/repositories/auditLog");

const router = Router();

// ── Checkout (STAFF+) ───────────────────────────────────────────────

router.post(
  "/checkout",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const { catalog_item_id, member_id, loan_days } = req.body;

      if (!catalog_item_id || !member_id) {
        return next({
          statusCode: 400,
          code: "MISSING_FIELDS",
          message: "catalog_item_id and member_id are required",
        });
      }

      const loan = await loansRepository.checkout(
        parseInt(catalog_item_id, 10),
        parseInt(member_id, 10),
        loan_days ? parseInt(loan_days, 10) : undefined
      );

      // Audit log
      await auditLog.record({
        entityType: "loan",
        entityId: loan.id,
        action: "CREATE",
        changedBy: req.auth?.id,
        newValues: loan,
      });

      res.status(201).json(loan);
    } catch (error) {
      next(error);
    }
  }
);

// ── Return (STAFF+) ─────────────────────────────────────────────────

router.post(
  "/:id/return",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const loanId = parseInt(req.params.id, 10);
      const loan = await loansRepository.returnItem(loanId);

      // Audit log
      await auditLog.record({
        entityType: "loan",
        entityId: loan.id,
        action: "UPDATE",
        changedBy: req.auth?.id,
        oldValues: { status: "ACTIVE" },
        newValues: { status: loan.status, return_date: loan.return_date },
      });

      res.json(loan);
    } catch (error) {
      next(error);
    }
  }
);

// ── Renew (MEMBER+, or owner check) ────────────────────────────────

router.post(
  "/:id/renew",
  requireAuth,
  async (req, res, next) => {
    try {
      const loanId = parseInt(req.params.id, 10);

      // Verify ownership (member can only renew their own loans)
      const loan = await loansRepository.findById(loanId);
      if (!loan) {
        return next({
          statusCode: 404,
          code: "LOAN_NOT_FOUND",
          message: "Loan not found",
        });
      }

      const staffRoles = ["STAFF", "LAB_MANAGER", "ADMIN"];
      if (loan.member_id !== req.auth.id && !staffRoles.includes(req.auth.role)) {
        return next({
          statusCode: 403,
          code: "NOT_YOUR_LOAN",
          message: "You can only renew your own loans",
        });
      }

      const renewed = await loansRepository.renew(loanId);

      await auditLog.record({
        entityType: "loan",
        entityId: renewed.id,
        action: "UPDATE",
        changedBy: req.auth?.id,
        oldValues: { renewed_count: renewed.renewed_count - 1 },
        newValues: {
          renewed_count: renewed.renewed_count,
          due_date: renewed.due_date,
        },
      });

      res.json(renewed);
    } catch (error) {
      next(error);
    }
  }
);

// ── My Loans (MEMBER+) ──────────────────────────────────────────────

router.get("/my", requireAuth, async (req, res, next) => {
  try {
    const status = req.query.status || null;
    const loans = await loansRepository.findByMember(req.auth.id, status);
    res.json(loans);
  } catch (error) {
    next(error);
  }
});

// ── Overdue Loans (STAFF+) ──────────────────────────────────────────

router.get(
  "/overdue",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const overdueLoans = await loansRepository.findOverdue();
      res.json(overdueLoans);
    } catch (error) {
      next(error);
    }
  }
);

// ── Borrowing History Export (MEMBER+) ─────────────────────────────

router.get("/history/export", requireAuth, async (req, res, next) => {
  try {
    const format = req.query.format === "pdf" ? "pdf" : "csv";
    const from = req.query.from || null;
    const to = req.query.to || null;

    // Fetch ALL history for this member (no pagination for export)
    const db = require("../../db");
    let query = db("loans")
      .join("catalog_items", "loans.item_id", "catalog_items.id")
      .select(
        "loans.id",
        "catalog_items.title as item_title",
        "catalog_items.authors as item_author",
        "catalog_items.isbn as item_isbn",
        "loans.checkout_date",
        "loans.due_date",
        "loans.return_date",
        "loans.status",
        "loans.renewed_count"
      )
      .where("loans.member_id", req.auth.id)
      .orderBy("loans.checkout_date", "desc");

    if (from) query = query.where("loans.checkout_date", ">=", from);
    if (to) query = query.where("loans.checkout_date", "<=", to);

    const loans = await query;

    const memberName = req.auth.name || req.auth.email || "Member";
    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const { Parser } = require("json2csv");
      const fields = [
        { label: "Title", value: "item_title" },
        { label: "Author", value: "item_author" },
        { label: "ISBN", value: "item_isbn" },
        { label: "Checked Out", value: (r) => r.checkout_date ? new Date(r.checkout_date).toLocaleDateString() : "" },
        { label: "Due Date", value: (r) => r.due_date ? new Date(r.due_date).toLocaleDateString() : "" },
        { label: "Returned", value: (r) => r.return_date ? new Date(r.return_date).toLocaleDateString() : "" },
        { label: "Status", value: "status" },
        { label: "Renewals", value: "renewed_count" },
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(loans);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="borrowing_history_${dateStr}.csv"`);
      return res.send(csv);
    }

    // PDF export
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="borrowing_history_${dateStr}.pdf"`);
    doc.pipe(res);

    // Title
    doc.fontSize(16).font("Helvetica-Bold").text("Borrowing History", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").text(`Member: ${memberName}`, { align: "center" });
    doc.fontSize(9).fillColor("#888").text(`Exported: ${new Date().toLocaleString()}`, { align: "center" });
    doc.fillColor("#000").moveDown(1);

    if (loans.length === 0) {
      doc.fontSize(11).text("No borrowing history found.", { align: "center" });
    } else {
      // Table header
      const colWidths = [200, 90, 90, 80, 55];
      const headers = ["Title", "Checked Out", "Due Date", "Returned", "Status"];
      const startX = 40;
      let y = doc.y;

      doc.fontSize(8).font("Helvetica-Bold");
      doc.rect(startX, y, 515, 16).fill("#f1f5f9").stroke();
      let x = startX + 4;
      headers.forEach((h, i) => {
        doc.fillColor("#334155").text(h, x, y + 4, { width: colWidths[i] - 4, lineBreak: false });
        x += colWidths[i];
      });
      y += 16;

      // Rows
      doc.font("Helvetica").fontSize(7.5);
      loans.forEach((loan, idx) => {
        const rowH = 14;
        if (idx % 2 === 0) {
          doc.rect(startX, y, 515, rowH).fill("#f8fafc").stroke();
        }
        const values = [
          String(loan.item_title || "").slice(0, 35),
          loan.checkout_date ? new Date(loan.checkout_date).toLocaleDateString() : "—",
          loan.due_date ? new Date(loan.due_date).toLocaleDateString() : "—",
          loan.return_date ? new Date(loan.return_date).toLocaleDateString() : "—",
          loan.status || "—",
        ];
        x = startX + 4;
        values.forEach((v, i) => {
          doc.fillColor("#1e293b").text(v, x, y + 3, { width: colWidths[i] - 4, lineBreak: false });
          x += colWidths[i];
        });
        y += rowH;

        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 40;
        }
      });
    }

    doc.end();
  } catch (error) {
    next(error);
  }
});

// ── Borrowing History (MEMBER+) ─────────────────────────────────────

router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const result = await loansRepository.findHistory(req.auth.id, {
      page,
      limit,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ── Member search (STAFF+) — for circulation desk lookup ───────────

router.get(
  "/members/search",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const q = (req.query.q || "").trim();
      if (!q) return res.json([]);

      const db = require("../../db");
      const members = await db("users")
        .select("id", "name", "email", "role")
        .where((builder) => {
          builder
            .whereILike("name", `%${q}%`)
            .orWhereILike("email", `%${q}%`);
        })
        .whereNotIn("role", ["ADMIN"])
        .limit(10);

      res.json(members);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
