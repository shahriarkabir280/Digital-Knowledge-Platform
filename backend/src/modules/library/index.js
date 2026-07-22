/**
 * Library Module Router
 * Handles catalog CRUD, search, fines, holds, wishlists, barcode, import, reports.
 */

const { Router } = require("express");
const requireAuth = require("../../api/middlewares/requireAuth");
const requireRole = require("../../api/middlewares/requireRole");
const optionalAuth = require("../../api/middlewares/optionalAuth");
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
const subscriptionsRepo = require("../../db/repositories/subscriptions");
const borrowRequestsRepo = require("../../db/repositories/borrowRequests");
const bookDonationsRepo = require("../../db/repositories/bookDonations");
const reviewsRepo = require("../../db/repositories/reviews");
const catalogItems = require("../../db/repositories/catalogItems");
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

// ── Scan lookup: resolve a scanned barcode/QR or ISBN to an item (STAFF+) ──
// Must be registered before "/catalog/:id" so "lookup" isn't captured as :id.
router.get(
  "/catalog/lookup",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const code = (req.query.code || req.query.barcode || "").toString().trim();
      if (!code) {
        return next({
          statusCode: 400,
          code: "MISSING_CODE",
          message: "Provide a ?code= barcode/QR or ISBN value",
        });
      }

      const catalogItems = require("../../db/repositories/catalogItems");

      // 1) Try a per-copy barcode (catalog_copies). 2) Fall back to ISBN.
      // 3) Fall back to the ITEM-<id> value emitted by the barcode generator.
      let item = await catalogItems.findByBarcode(code);
      let matchedBy = "barcode";

      if (!item) {
        const byIsbn = await catalogItems.findByIsbn(code);
        if (byIsbn && byIsbn.length) {
          item = byIsbn[0];
          matchedBy = "isbn";
        }
      }

      if (!item) {
        const m = code.match(/^ITEM-(\d+)$/i);
        if (m) {
          item = await catalogItems.findById(m[1]);
          matchedBy = "item_id";
        }
      }

      if (!item) {
        return next({
          statusCode: 404,
          code: "ITEM_NOT_FOUND",
          message: `No catalog item matched "${code}"`,
        });
      }

      res.json({ matchedBy, item });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/catalog/:id", catalogController.getCatalogItem);

// ── Reviews (books) ──────────────────────────────────────────────

// GET /api/library/catalog/:id/reviews — public: list + summary
router.get("/catalog/:id/reviews", async (req, res, next) => {
  try {
    const catalogItemId = parseInt(req.params.id, 10);
    const [reviews, summary] = await Promise.all([
      reviewsRepo.findByCatalogItem(catalogItemId),
      reviewsRepo.getSummary(catalogItemId),
    ]);
    res.json({ reviews, summary });
  } catch (error) {
    next(error);
  }
});

// GET /api/library/catalog/:id/reviews/mine — the caller's own review, if any
router.get("/catalog/:id/reviews/mine", requireAuth, async (req, res, next) => {
  try {
    const catalogItemId = parseInt(req.params.id, 10);
    const mine = await reviewsRepo.findMine(catalogItemId, req.auth.id);
    res.json(mine || null);
  } catch (error) {
    next(error);
  }
});

// POST /api/library/catalog/:id/reviews — create/update the caller's review
router.post("/catalog/:id/reviews", requireAuth, async (req, res, next) => {
  try {
    const catalogItemId = parseInt(req.params.id, 10);
    const rating = parseInt(req.body.rating, 10);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return next({
        statusCode: 400,
        code: "INVALID_RATING",
        message: "rating must be an integer between 1 and 5",
      });
    }

    const item = await catalogItems.findById(catalogItemId);
    if (!item) {
      return next({
        statusCode: 404,
        code: "CATALOG_ITEM_NOT_FOUND",
        message: "Catalog item not found",
      });
    }

    const review = await reviewsRepo.upsert(catalogItemId, req.auth.id, rating, req.body.comment);
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

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

      // Prefer a real per-copy barcode; fall back to a stable ITEM-<id> value
      // that /catalog/lookup can also resolve.
      const db = require("../../db");
      const copy = await db("catalog_copies")
        .where({ item_id: item.id })
        .whereNotNull("barcode")
        .first();
      const barcodeValue = copy?.barcode || item.barcode || `ITEM-${item.id}`;
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
          message: "Please upload a CSV or MARC (.mrc/.marc/.xml) file",
        });
      }

      const result = await importService.processImport(
        req.file.buffer,
        req.file.originalname,
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
      Number(fine.member_id) !== Number(req.auth.id) &&
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

// ── Subscriptions (offline/physical library membership) ────────────

// GET /api/library/subscriptions/my — Member's current subscription
router.get("/subscriptions/my", requireAuth, async (req, res, next) => {
  try {
    const subscription = await subscriptionsRepo.findByMember(req.auth.id);
    const active = await subscriptionsRepo.getActive(req.auth.id);
    res.json({ subscription: subscription || null, isActive: Boolean(active) });
  } catch (error) {
    next(error);
  }
});

// POST /api/library/subscriptions/request-renewal — Member requests renewal
router.post("/subscriptions/request-renewal", requireAuth, async (req, res, next) => {
  try {
    const subscription = await subscriptionsRepo.requestRenewal(req.auth.id);
    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

// POST /api/library/subscriptions/:memberId/reject-renewal — Reject a pending renewal request (STAFF+)
router.post(
  "/subscriptions/:memberId/reject-renewal",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const subscription = await subscriptionsRepo.rejectRenewal(memberId, req.auth.id, req.body.reason);

      await auditLog.record({
        entityType: "subscription",
        entityId: subscription.id,
        action: "UPDATE",
        changedBy: req.auth?.id,
        newValues: { renewal_requested_at: null, reject_reason: req.body.reason || null },
      });

      res.json(subscription);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/library/subscriptions — List subscriptions (STAFF+)
router.get(
  "/subscriptions",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      const status = req.query.status || undefined;
      const result = await subscriptionsRepo.findAll({ page, limit, status });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/library/subscriptions/:memberId/activate — Activate/renew (STAFF+)
router.post(
  "/subscriptions/:memberId/activate",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const months = parseInt(req.body.months, 10) || 1;

      const subscription = await subscriptionsRepo.activate(memberId, req.auth.id, months);

      await auditLog.record({
        entityType: "subscription",
        entityId: subscription.id,
        action: "UPDATE",
        changedBy: req.auth?.id,
        newValues: subscription,
      });

      res.status(201).json(subscription);
    } catch (error) {
      next(error);
    }
  }
);

// ── Borrow Requests (member-initiated, librarian-approved) ─────────

// POST /api/library/borrow-requests — Request to borrow an available item
router.post("/borrow-requests", requireAuth, async (req, res, next) => {
  try {
    const { catalog_item_id } = req.body;
    if (!catalog_item_id) {
      return next({
        statusCode: 400,
        code: "MISSING_FIELDS",
        message: "catalog_item_id is required",
      });
    }

    const request = await borrowRequestsRepo.create(
      parseInt(catalog_item_id, 10),
      req.auth.id
    );
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

// GET /api/library/borrow-requests/my — Member's own requests
router.get("/borrow-requests/my", requireAuth, async (req, res, next) => {
  try {
    const requests = await borrowRequestsRepo.findByMember(req.auth.id);
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// GET /api/library/borrow-requests/pending — Librarian queue (STAFF+)
router.get(
  "/borrow-requests/pending",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const requests = await borrowRequestsRepo.findPending();
      res.json(requests);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/library/borrow-requests/:id/approve — Approve & checkout (STAFF+)
router.post(
  "/borrow-requests/:id/approve",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      const loanDays = req.body.loan_days ? parseInt(req.body.loan_days, 10) : undefined;

      const { request, loan } = await borrowRequestsRepo.approve(requestId, req.auth.id, loanDays);

      await auditLog.record({
        entityType: "borrow_request",
        entityId: request.id,
        action: "UPDATE",
        changedBy: req.auth?.id,
        oldValues: { status: "PENDING" },
        newValues: { status: request.status, loan_id: request.loan_id },
      });

      res.json({ request, loan });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/library/borrow-requests/:id/reject — Reject (STAFF+)
router.post(
  "/borrow-requests/:id/reject",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      const request = await borrowRequestsRepo.reject(requestId, req.auth.id, req.body.reason);

      await auditLog.record({
        entityType: "borrow_request",
        entityId: request.id,
        action: "UPDATE",
        changedBy: req.auth?.id,
        oldValues: { status: "PENDING" },
        newValues: { status: request.status, reject_reason: request.reject_reason },
      });

      res.json(request);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/library/borrow-requests/:id — Member cancels own pending request
router.delete("/borrow-requests/:id", requireAuth, async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const request = await borrowRequestsRepo.cancel(requestId, req.auth.id);
    res.json(request);
  } catch (error) {
    next(error);
  }
});

// ── Book Donations (offline/physical library) ───────────────────────
// Two entry points feed the same pipeline: a donor submitting an offer
// themselves (public, no login required), or a librarian logging one after
// a walk-in/phone/email conversation.

// POST /api/library/donations — public: donor submits an offer
router.post("/donations", optionalAuth, async (req, res, next) => {
  try {
    // Honeypot: a hidden field real users never fill in; bots that fill
    // every field will trip it. Silently pretend success either way.
    if (req.body.website) {
      return res.status(201).json({ success: true, message: "Thank you for your offer." });
    }

    const donation = await bookDonationsRepo.createFromDonor({
      donorName: req.body.donorName,
      donorEmail: req.body.donorEmail,
      donorPhone: req.body.donorPhone,
      donorAffiliation: req.body.donorAffiliation,
      deliveryMethod: req.body.deliveryMethod,
      notes: req.body.notes,
      items: req.body.items,
      donorUserId: req.auth?.id,
    });

    res.status(201).json({ success: true, data: { donation } });
  } catch (error) {
    next(error.statusCode ? error : { statusCode: 500, message: error.message });
  }
});

// GET /api/library/donations/track — public: donor status lookup
router.get("/donations/track", async (req, res, next) => {
  try {
    const { code, email } = req.query;
    if (!code || !email) {
      return next({ statusCode: 400, code: "MISSING_FIELDS", message: "code and email are required" });
    }

    const donation = await bookDonationsRepo.findByReferenceCode(code, email);
    if (!donation) {
      return next({ statusCode: 404, code: "DONATION_NOT_FOUND", message: "No donation matched that code and email" });
    }

    res.json({ success: true, data: { donation } });
  } catch (error) {
    next(error);
  }
});

// POST /api/library/donations/log — librarian logs a walk-in/phone/email donation (STAFF+)
router.post(
  "/donations/log",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const donation = await bookDonationsRepo.createByStaff({
        staffId: req.auth.id,
        donorName: req.body.donorName,
        donorEmail: req.body.donorEmail,
        donorPhone: req.body.donorPhone,
        donorAffiliation: req.body.donorAffiliation,
        deliveryMethod: req.body.deliveryMethod,
        notes: req.body.notes,
        items: req.body.items,
        initialStatus: req.body.initialStatus,
      });

      res.status(201).json({ success: true, data: { donation } });
    } catch (error) {
      next(error.statusCode ? error : { statusCode: 500, message: error.message });
    }
  },
);

// GET /api/library/donations/pending — librarian review queue (STAFF+)
router.get(
  "/donations/pending",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (_req, res, next) => {
    try {
      res.json({ success: true, data: { items: await bookDonationsRepo.findPending() } });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/library/donations — full list w/ optional ?status filter (STAFF+)
router.get(
  "/donations",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const items = await bookDonationsRepo.findAll({ status: req.query.status });
      res.json({ success: true, data: { items } });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/library/donations/:id — detail (STAFF+)
router.get(
  "/donations/:id",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const donation = await bookDonationsRepo.findById(parseInt(req.params.id, 10));
      if (!donation) {
        return next({ statusCode: 404, code: "DONATION_NOT_FOUND", message: "Donation not found" });
      }
      res.json({ success: true, data: { donation } });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/library/donations/:id/accept (STAFF+)
router.post(
  "/donations/:id/accept",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const donation = await bookDonationsRepo.accept(parseInt(req.params.id, 10), req.auth.id, req.body.staffNote);
      res.json({ success: true, data: { donation } });
    } catch (error) {
      next(error.statusCode ? error : { statusCode: 500, message: error.message });
    }
  },
);

// POST /api/library/donations/:id/decline (STAFF+)
router.post(
  "/donations/:id/decline",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const donation = await bookDonationsRepo.decline(parseInt(req.params.id, 10), req.auth.id, req.body.reason);
      res.json({ success: true, data: { donation } });
    } catch (error) {
      next(error.statusCode ? error : { statusCode: 500, message: error.message });
    }
  },
);

// POST /api/library/donations/:id/receive — mark received + decide each item (STAFF+)
router.post(
  "/donations/:id/receive",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const donation = await bookDonationsRepo.markReceived(
        parseInt(req.params.id, 10),
        req.auth.id,
        req.body.decisions,
      );
      res.json({ success: true, data: { donation } });
    } catch (error) {
      next(error.statusCode ? error : { statusCode: 500, message: error.message });
    }
  },
);

// POST /api/library/donations/:id/items/:itemId/catalog — catalog a WANTED item (STAFF+)
router.post(
  "/donations/:id/items/:itemId/catalog",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const result = await bookDonationsRepo.catalogItem(parseInt(req.params.itemId, 10), req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error.statusCode ? error : { statusCode: 500, message: error.message });
    }
  },
);

// POST /api/library/donations/:id/cancel — donor (own) or STAFF+
router.post("/donations/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const isStaff = ["STAFF", "LAB_MANAGER", "ADMIN"].includes(req.auth.role);
    const donation = await bookDonationsRepo.cancel(parseInt(req.params.id, 10), req.auth.id, isStaff);
    res.json({ success: true, data: { donation } });
  } catch (error) {
    next(error.statusCode ? error : { statusCode: 500, message: error.message });
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

router.get(
  "/reports/active-loans",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const { from, to } = req.query;
      res.json(await reportService.getActiveLoansReport({ from, to }));
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/reports/inventory",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (_req, res, next) => {
    try {
      res.json(await reportService.getInventoryReport());
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/reports/new-acquisitions",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const { from, to } = req.query;
      res.json(await reportService.getNewAcquisitionsReport({ from, to }));
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/reports/holds",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (_req, res, next) => {
    try {
      res.json(await reportService.getHoldsReport());
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/reports/fines-detail",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  async (req, res, next) => {
    try {
      const { from, to } = req.query;
      res.json(await reportService.getFinesReport({ from, to }));
    } catch (error) {
      next(error);
    }
  }
);

// Machine-readable list of available report types (drives the reports UI).
router.get(
  "/reports/types",
  requireAuth,
  requireRole("STAFF", "LAB_MANAGER", "ADMIN"),
  (_req, res) => {
    res.json({
      types: [
        { key: "circulation", label: "Circulation", dateRange: true, exportable: true },
        { key: "popular-items", label: "Popular Items", dateRange: true, exportable: true },
        { key: "overdue", label: "Overdue Items", dateRange: true, exportable: true },
        { key: "collection-stats", label: "Collection Statistics", dateRange: false, exportable: true },
        { key: "member-activity", label: "Member Activity", dateRange: true, exportable: true },
        { key: "fines-summary", label: "Fines Summary", dateRange: true, exportable: true },
        { key: "active-loans", label: "Active Loans", dateRange: true, exportable: true },
        { key: "inventory", label: "Inventory (Low Stock)", dateRange: false, exportable: true },
        { key: "new-acquisitions", label: "New Acquisitions", dateRange: true, exportable: true },
        { key: "holds", label: "Holds Queue", dateRange: false, exportable: true },
      ],
    });
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
