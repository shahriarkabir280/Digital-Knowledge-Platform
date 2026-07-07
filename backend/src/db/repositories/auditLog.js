/**
 * Audit Log Repository — minimal implementation using console logging.
 * In production, you would use document_state_logs or a dedicated audit table.
 * For now, we log to console and optionally store in a simple JSON format.
 */

const db = require("../index");

/**
 * Record an audit log entry (currently logs to console).
 * @param {Object} entry
 * @param {string} entry.entityType  — e.g. 'catalog_item', 'loan', 'fine'
 * @param {number} entry.entityId    — ID of the affected record
 * @param {string} entry.action      — 'CREATE', 'UPDATE', or 'DELETE'
 * @param {number} [entry.changedBy] — User ID who performed the action
 * @param {Object} [entry.oldValues] — Previous state (for updates/deletes)
 * @param {Object} [entry.newValues] — New state (for creates/updates)
 * @param {Object} [trx]            — Optional Knex transaction
 */
async function record(entry, trx = db) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action: entry.action,
    changed_by: entry.changedBy || null,
    old_values: entry.oldValues || {},
    new_values: entry.newValues || {},
  };

  console.log("[AUDIT]", JSON.stringify(logEntry));

  // Optional: store in document_state_logs if applicable
  // Or create a dedicated audit_logs table in future migration
  
  return logEntry;
}

/**
 * Fetch audit log entries for a specific entity (stub — returns empty).
 */
async function findByEntity(entityType, entityId, { page = 1, limit = 50 } = {}) {
  // Stub: in production, query from audit table
  return {
    items: [],
    pagination: { page, limit, total: 0 },
  };
}

/**
 * Fetch recent audit log entries (stub — returns empty).
 */
async function findRecent({ page = 1, limit = 50, entityType } = {}) {
  // Stub: in production, query from audit table
  return [];
}

module.exports = {
  record,
  findByEntity,
  findRecent,
};
