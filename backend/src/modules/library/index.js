/**
 * Library Module Router
 * Handles catalog CRUD, search, fines, holds, wishlists, barcode, import, reports.
 */

const { Router } = require("express");
const requireAuth = require("../../api/middlewares/requireAuth");
const requireRole = require("../../api/middlewares/requireRole");
const catalogController = require("./catalogController");
const {
  createCatalogItemSchema,
  updateCatalogItemSchema,
  searchQuerySchema,
  validateBody,
  validateQuery,
} = require("./catalogValidator");
const finesRepo = require("../../db/repositories/fines");
const holdsRepo = require("../../db/repositories/holds");
const wishlistsRepo = require("../../db/repositories/wishlists");
const auditLog = require("../../db/repositories/auditLog");
const reportService = require("./reportService");
const importService = require("./importService");
const barcodeService = require("../../services/barcodeService");

const router = Router();

// ── Health ─────────────────────────────────────────────────────────

router.get("/health", (_req, res) => {
  res.status(200).json({ module: "library", status: "ready" });
});

// ── Public routes (search & read) ──────────────────────────────────

router.get(
  "/catalog",
  validateQuery(searchQuerySchema),
  catalogController.searchCatalog
);

router.get("/catalog/facets", catalogController.getCatalogFacets);

router.get("/catalog/stats", catalogController.getCatalogStats);

// ── Catalog barcode/QR (STAFF+) ─────────────────────────────────────

router.get(
  "/catalog/:id/barcode",
  // Accept token via query param for <img> tag usage (fallback when Authorization header can't be set)
  (req, res, next) => {
    if (!req.headers.authorization && req.query._token) {
      req.headers.authorization = `Bearer ${req.query._token}`;
    }
    next();
  },
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const catalogItems = require("../../db/repositories/catalogItems");
      const item = await catalogItems.findById(req.params.id);

      if (!item) {
        return next({
          statusCode: 404,
          code: "CATALOG_ITEM_NOT_FOUND",
          message: "Catalog item not found",
        });
      }

      const barcodeValue = item.barcode || `ITEM-${item.id}`;
      const format = req.query.format === "qr" ? "qr" : "barcode";

      const pngBuffer = await barcodeService.generate(barcodeValue, format);

      res.setHeader("Content-Type", "image/png");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${barcodeValue}.png"`
      );
      res.send(pngBuffer);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/catalog/:id", catalogController.getCatalogItem);

// ── Protected catalog CRUD (STAFF+) ────────────────────────────────

router.post(
  "/catalog",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  validateBody(createCatalogItemSchema),
  catalogController.createCatalogItem
);

router.put(
  "/catalog/:id",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  validateBody(updateCatalogItemSchema),
  catalogController.updateCatalogItem
);

router.delete(
  "/catalog/:id",
  requireAuth,
  requireRole("ADMIN"),
  catalogController.deleteCatalogItem
);

// ── Bulk Import (STAFF+) ────────────────────────────────────────────

router.post(
  "/catalog/import",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  importService.uploadMiddleware,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return next({
          statusCode: 400,
          code: "NO_FILE",
          message: "Please upload a CSV file",
        });
      }

      const result = await importService.processCsvImport(
        req.file.buffer,
        req.auth?.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ── Audit log (STAFF+) ────────────────────────────────────────────

router.get(
  "/audit-log",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  catalogController.getAuditLog
);

// ── Fines ──────────────────────────────────────────────────────────

// GET /api/library/fines/my — Member's own fines
router.get("/fines/my", requireAuth, async (req, res, next) => {
  try {
    const fines = await finesRepo.findByMember(req.auth.id);
    res.json(fines);
  } catch (error) {
    next(error);
  }
});

// POST /api/library/fines/:id/pay — Pay a fine
router.post("/fines/:id/pay", requireAuth, async (req, res, next) => {
  try {
    const fineId = parseInt(req.params.id, 10);
    const fine = await finesRepo.findById(fineId);

    if (!fine) {
      return next({
        statusCode: 404,
        code: "FINE_NOT_FOUND",
        message: "Fine not found",
      });
    }

    // Members can only pay their own fines; staff can pay any
    const staffRoles = ["STAFF", "LAB_MANAGER", "ADMIN"];
    if (
      fine.member_id !== req.auth.id &&
      !staffRoles.includes(req.auth.role)
    ) {
      return next({
        statusCode: 403,
        code: "FINE_NOT_YOURS",
        message: "You can only pay your own fines",
      });
    }

    const updated = await finesRepo.markPaid(fineId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// POST /api/library/fines/:id/waive — Waive a fine (STAFF+)
router.post(
  "/fines/:id/waive",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const fineId = parseInt(req.params.id, 10);
      const updated = await finesRepo.waive(fineId);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ── Holds ──────────────────────────────────────────────────────────

// GET /api/library/holds/my — Member's active holds
router.get("/holds/my", requireAuth, async (req, res, next) => {
  try {
    const holds = await holdsRepo.findByMember(req.auth.id);
    res.json(holds);
  } catch (error) {
    next(error);
  }
});

// POST /api/library/holds — Place a hold
router.post("/holds", requireAuth, async (req, res, next) => {
  try {
    const { catalog_item_id } = req.body;
    if (!catalog_item_id) {
      return next({
        statusCode: 400,
        code: "MISSING_FIELDS",
        message: "catalog_item_id is required",
      });
    }

    const hold = await holdsRepo.placeHold(
      parseInt(catalog_item_id, 10),
      req.auth.id
    );
    res.status(201).json(hold);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/library/holds/:id — Cancel a hold
router.delete("/holds/:id", requireAuth, async (req, res, next) => {
  try {
    const holdId = parseInt(req.params.id, 10);
    const result = await holdsRepo.cancelHold(holdId, req.auth.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ── Wishlist ───────────────────────────────────────────────────────

// GET /api/library/wishlist — Get member's wishlist
router.get("/wishlist", requireAuth, async (req, res, next) => {
  try {
    const items = await wishlistsRepo.findByMember(req.auth.id);
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// POST /api/library/wishlist — Add to wishlist
router.post("/wishlist", requireAuth, async (req, res, next) => {
  try {
    const { catalog_item_id } = req.body;
    if (!catalog_item_id) {
      return next({
        statusCode: 400,
        code: "MISSING_FIELDS",
        message: "catalog_item_id is required",
      });
    }

    const entry = await wishlistsRepo.add(
      req.auth.id,
      parseInt(catalog_item_id, 10)
    );
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/library/wishlist/:id — Remove from wishlist
router.delete("/wishlist/:id", requireAuth, async (req, res, next) => {
  try {
    const wishlistId = parseInt(req.params.id, 10);
    const result = await wishlistsRepo.remove(wishlistId, req.auth.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ── Reports (STAFF+) ──────────────────────────────────────────────

router.get(
  "/reports/circulation",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const { from, to } = req.query;
      const data = await reportService.getCirculationReport({ from, to });
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/reports/popular-items",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const { from, to, limit } = req.query;
      const data = await reportService.getPopularItems({ from, to, limit: parseInt(limit, 10) || 10 });
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/reports/overdue",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const { from, to } = req.query;
      const data = await reportService.getOverdueReport({ from, to });
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/reports/collection-stats",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const data = await reportService.getCollectionStats();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/reports/member-activity",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const { from, to } = req.query;
      const data = await reportService.getMemberActivity({ from, to });
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/reports/fines-summary",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const { from, to } = req.query;
      const data = await finesRepo.getSummary({ from, to });
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

// ── Export reports ─────────────────────────────────────────────────

router.get(
  "/reports/export",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const { type = "circulation", format = "pdf", from, to } = req.query;

      if (!["pdf", "xlsx"].includes(format)) {
        return next({
          statusCode: 400,
          code: "INVALID_FORMAT",
          message: "format must be pdf or xlsx",
        });
      }

      const { buffer, contentType, filename } = await reportService.exportReport({
        type,
        format,
        from,
        to,
      });

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
