/**
 * Maps backend error codes (attached to thrown Errors as `err.code` by
 * services/api/client.js) to actionable, staff-facing messages for the
 * circulation desk. Falls back to the raw server message, then a generic line.
 */

const CIRCULATION_ERROR_MESSAGES = {
  NO_COPIES_AVAILABLE: 'No copies available — the member can place a hold instead.',
  ALREADY_CHECKED_OUT: 'This member already has this item checked out.',
  RESERVED_FOR_HOLDS:
    'All available copies are reserved for members with holds. Fulfill the hold or pick a different copy.',
  MAX_RENEWALS_REACHED: 'Renewal limit reached (2 renewals maximum).',
  HOLD_ALREADY_EXISTS: 'This member already has an active hold on this item.',
  ITEM_AVAILABLE: 'This item is available to borrow — no hold needed.',
  ALREADY_RETURNED: 'This item has already been returned.',
  CATALOG_ITEM_NOT_FOUND: 'That catalog item could not be found.',
  ITEM_NOT_FOUND: 'No catalog item matched that code.',
  LOAN_NOT_FOUND: 'That loan could not be found.',
  NOT_YOUR_LOAN: 'You can only act on your own loans.',
  NO_ACTIVE_SUBSCRIPTION: 'An active library subscription is required to borrow physical items.',
  REQUEST_ALREADY_PENDING: 'There is already a pending borrow request for this item.',
  REQUEST_NOT_FOUND: 'That borrow request could not be found.',
  REQUEST_NOT_YOURS: 'You can only act on your own borrow requests.',
  REQUEST_INVALID_STATUS: 'This request has already been decided.',
  NO_SUBSCRIPTION_TO_RENEW: "You don't have a subscription yet — contact a librarian to start one.",
  NO_PENDING_RENEWAL: 'This member has no pending renewal request.',
}

/**
 * @param {Error & { code?: string }} err
 * @param {string} [fallback]
 * @returns {string}
 */
export function circulationErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.code && CIRCULATION_ERROR_MESSAGES[err.code]) {
    return CIRCULATION_ERROR_MESSAGES[err.code]
  }
  return err?.message || fallback
}

export { CIRCULATION_ERROR_MESSAGES }
