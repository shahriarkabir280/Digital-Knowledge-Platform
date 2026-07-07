/**
 * Catalog Controller — Handles HTTP request/response for catalog operations.
 */

const catalogItems = require("../../db/repositories/catalogItems");
const auditLog = require("../../db/repositories/auditLog");

/**
 * GET /api/library/catalog
 * Search and list catalog items with faceted filters.
 */
async function searchCatalog(req, res, next) {
  try {
    const result = await catalogItems.search(req.validatedQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/library/catalog/facets
 * Get available facet values for filter dropdowns.
 */
async function getCatalogFacets(_req, res, next) {
  try {
    const facets = await catalogItems.getFacets();
    res.json(facets);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/library/catalog/stats
 * Get catalog availability statistics.
 */
async function getCatalogStats(_req, res, next) {
  try {
    const stats = await catalogItems.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/library/catalog/:id
 * Get a single catalog item by ID.
 */
async function getCatalogItem(req, res, next) {
  try {
    const item = await catalogItems.findById(req.params.id);
    if (!item) {
      return next({
        statusCode: 404,
        code: "CATALOG_ITEM_NOT_FOUND",
        message: `Catalog item with id ${req.params.id} not found`,
      });
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/library/catalog
 * Create a new catalog item (STAFF+ only).
 */
async function createCatalogItem(req, res, next) {
  try {
    const { tags, ...itemData } = req.validated;
    const item = await catalogItems.create(itemData, tags || []);

    // Audit log
    await auditLog.record({
      entityType: "catalog_item",
      entityId: item.id,
      action: "CREATE",
      changedBy: req.auth?.id,
      newValues: item,
    });

    res.status(201).json(item);
  } catch (error) {
    // Handle duplicate barcode
    if (error.code === "23505" && error.constraint?.includes("barcode")) {
      return next({
        statusCode: 409,
        code: "DUPLICATE_BARCODE",
        message: "A catalog item with this barcode already exists",
      });
    }
    next(error);
  }
}

/**
 * PUT /api/library/catalog/:id
 * Update a catalog item (STAFF+ only).
 */
async function updateCatalogItem(req, res, next) {
  try {
    const existing = await catalogItems.findById(req.params.id);
    if (!existing) {
      return next({
        statusCode: 404,
        code: "CATALOG_ITEM_NOT_FOUND",
        message: `Catalog item with id ${req.params.id} not found`,
      });
    }

    const { tags, ...updateData } = req.validated;
    const updated = await catalogItems.update(
      req.params.id,
      updateData,
      tags // undefined means don't touch tags, [] means clear tags
    );

    // Audit log
    await auditLog.record({
      entityType: "catalog_item",
      entityId: updated.id,
      action: "UPDATE",
      changedBy: req.auth?.id,
      oldValues: existing,
      newValues: updated,
    });

    res.json(updated);
  } catch (error) {
    if (error.code === "23505" && error.constraint?.includes("barcode")) {
      return next({
        statusCode: 409,
        code: "DUPLICATE_BARCODE",
        message: "A catalog item with this barcode already exists",
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/library/catalog/:id
 * Soft-delete a catalog item (ADMIN only).
 */
async function deleteCatalogItem(req, res, next) {
  try {
    const existing = await catalogItems.findById(req.params.id);
    if (!existing) {
      return next({
        statusCode: 404,
        code: "CATALOG_ITEM_NOT_FOUND",
        message: `Catalog item with id ${req.params.id} not found`,
      });
    }

    await catalogItems.softDelete(req.params.id);

    // Audit log
    await auditLog.record({
      entityType: "catalog_item",
      entityId: existing.id,
      action: "DELETE",
      changedBy: req.auth?.id,
      oldValues: existing,
    });

    res.json({ message: "Catalog item deleted successfully" });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/library/audit-log
 * Get recent audit log entries (STAFF+ only).
 */
async function getAuditLog(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const entityType = req.query.entity_type || undefined;

    const entries = await auditLog.findRecent({ page, limit, entityType });
    res.json(entries);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchCatalog,
  getCatalogFacets,
  getCatalogStats,
  getCatalogItem,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  getAuditLog,
};
