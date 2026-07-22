/**
 * Library API Service
 * Frontend API client functions for catalog, loans, fines, holds, and wishlists.
 */

import { apiRequest } from './client.js'
import { loadAuthSession } from '../../app/auth-session.js'

// ── Catalog Search & Read ──────────────────────────────────────────

/**
 * Search catalog items with faceted filters.
 * @param {Object} params — query parameters matching searchQuerySchema
 */
export async function searchCatalog(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })
  return apiRequest(`/library/catalog?${query.toString()}`)
}

/**
 * Get a single catalog item by ID.
 */
export async function getCatalogItem(id) {
  return apiRequest(`/library/catalog/${id}`)
}

/**
 * Resolve a scanned barcode/QR value or ISBN to a catalog item.
 * @param {string} code
 * @returns {Promise<{ matchedBy: string, item: object }>}
 */
export async function lookupCatalog(code) {
  return apiRequest(`/library/catalog/lookup?code=${encodeURIComponent(code)}`)
}

/**
 * Get available facet values for filter dropdowns.
 */
export async function getCatalogFacets() {
  return apiRequest('/library/catalog/facets')
}

/**
 * Get catalog availability statistics.
 */
export async function getCatalogStats() {
  return apiRequest('/library/catalog/stats')
}

// ── Catalog CRUD (STAFF+) ──────────────────────────────────────────

/**
 * Create a new catalog item.
 */
export async function createCatalogItem(data) {
  return apiRequest('/library/catalog', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update a catalog item.
 */
export async function updateCatalogItem(id, data) {
  return apiRequest(`/library/catalog/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Soft-delete a catalog item (ADMIN only).
 */
export async function deleteCatalogItem(id) {
  return apiRequest(`/library/catalog/${id}`, {
    method: 'DELETE',
  })
}

// ── Audit Log ──────────────────────────────────────────────────────

/**
 * Get audit log entries (STAFF+).
 */
export async function getAuditLog(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page)
  if (params.limit) query.set('limit', params.limit)
  if (params.entity_type) query.set('entity_type', params.entity_type)
  return apiRequest(`/library/audit-log?${query.toString()}`)
}

// ── Reviews (books) ───────────────────────────────────────────────

/**
 * @returns {Promise<{ reviews: Array, summary: { average, count, breakdown } }>}
 */
export async function getCatalogItemReviews(catalogItemId) {
  return apiRequest(`/library/catalog/${catalogItemId}/reviews`)
}

export async function getMyCatalogItemReview(catalogItemId) {
  return apiRequest(`/library/catalog/${catalogItemId}/reviews/mine`)
}

export async function submitCatalogItemReview(catalogItemId, { rating, comment }) {
  return apiRequest(`/library/catalog/${catalogItemId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  })
}

// ── Loans ──────────────────────────────────────────────────────────

/**
 * Checkout an item to a member.
 */
export async function checkoutItem(catalogItemId, memberId) {
  return apiRequest('/loans/checkout', {
    method: 'POST',
    body: JSON.stringify({ catalog_item_id: catalogItemId, member_id: memberId }),
  })
}

/**
 * Return a loaned item.
 */
export async function returnItem(loanId) {
  return apiRequest(`/loans/${loanId}/return`, {
    method: 'POST',
  })
}

/**
 * Renew a loan (max 2 times).
 */
export async function renewLoan(loanId) {
  return apiRequest(`/loans/${loanId}/renew`, {
    method: 'POST',
  })
}

/**
 * Get current user's active loans.
 */
export async function getMyLoans() {
  return apiRequest('/loans/my')
}

/**
 * Get all overdue loans (STAFF+).
 */
export async function getOverdueLoans() {
  return apiRequest('/loans/overdue')
}

/**
 * Get borrowing history for current user.
 */
export async function getBorrowingHistory(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page)
  if (params.limit) query.set('limit', params.limit)
  return apiRequest(`/loans/history?${query.toString()}`)
}

/**
 * Export borrowing history as CSV or PDF.
 * Triggers a file download in the browser.
 * @param {'csv'|'pdf'} format
 * @param {{ from?: string, to?: string }} params
 */
export async function exportBorrowingHistory(format = 'csv', params = {}) {
  const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')
  const token = loadAuthSession()?.token || ''

  const query = new URLSearchParams({ format })
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)

  const res = await fetch(`${base}/loans/history/export?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Export failed')
  }

  const blob = await res.blob()
  const cd = res.headers.get('content-disposition') || ''
  const match = cd.match(/filename="([^"]+)"/)
  const filename = match?.[1] || `borrowing_history_${new Date().toISOString().slice(0, 10)}.${format}`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Fines ──────────────────────────────────────────────────────────

export async function getMyFines() {
  return apiRequest('/library/fines/my')
}

export async function payFine(fineId) {
  return apiRequest(`/library/fines/${fineId}/pay`, { method: 'POST' })
}

// ── Holds ──────────────────────────────────────────────────────────

export async function placeHold(catalogItemId) {
  return apiRequest('/library/holds', {
    method: 'POST',
    body: JSON.stringify({ catalog_item_id: catalogItemId }),
  })
}

export async function cancelHold(holdId) {
  return apiRequest(`/library/holds/${holdId}`, { method: 'DELETE' })
}

export async function getMyHolds() {
  return apiRequest('/library/holds/my')
}

// ── Members (STAFF+) ───────────────────────────────────────────────

export async function searchMembers(query) {
  return apiRequest(`/loans/members/search?q=${encodeURIComponent(query)}`)
}

// ── Subscriptions (offline/physical library membership) ────────────

/**
 * Get the current user's subscription status.
 * @returns {Promise<{ subscription: object|null, isActive: boolean }>}
 */
export async function getMySubscription() {
  return apiRequest('/library/subscriptions/my')
}

/**
 * List subscriptions (STAFF+).
 */
export async function listSubscriptions(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page)
  if (params.limit) query.set('limit', params.limit)
  if (params.status) query.set('status', params.status)
  return apiRequest(`/library/subscriptions?${query.toString()}`)
}

/**
 * Activate or renew a member's subscription (STAFF+).
 */
export async function activateSubscription(memberId, months = 1) {
  return apiRequest(`/library/subscriptions/${memberId}/activate`, {
    method: 'POST',
    body: JSON.stringify({ months }),
  })
}

/**
 * Member requests a renewal of their own subscription — notifies librarians.
 */
export async function requestSubscriptionRenewal() {
  return apiRequest('/library/subscriptions/request-renewal', { method: 'POST' })
}

/**
 * Librarian rejects a member's pending renewal request.
 */
export async function rejectSubscriptionRenewal(memberId, reason) {
  return apiRequest(`/library/subscriptions/${memberId}/reject-renewal`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

// ── Borrow Requests (member-initiated, librarian-approved) ─────────

export async function createBorrowRequest(catalogItemId) {
  return apiRequest('/library/borrow-requests', {
    method: 'POST',
    body: JSON.stringify({ catalog_item_id: catalogItemId }),
  })
}

export async function getMyBorrowRequests() {
  return apiRequest('/library/borrow-requests/my')
}

export async function getPendingBorrowRequests() {
  return apiRequest('/library/borrow-requests/pending')
}

export async function approveBorrowRequest(requestId, loanDays) {
  return apiRequest(`/library/borrow-requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ loan_days: loanDays }),
  })
}

export async function rejectBorrowRequest(requestId, reason) {
  return apiRequest(`/library/borrow-requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function cancelBorrowRequest(requestId) {
  return apiRequest(`/library/borrow-requests/${requestId}`, { method: 'DELETE' })
}

// ── Wishlist ───────────────────────────────────────────────────────

export async function getMyWishlist() {
  return apiRequest('/library/wishlist')
}

export async function addToWishlist(catalogItemId) {
  return apiRequest('/library/wishlist', {
    method: 'POST',
    body: JSON.stringify({ catalog_item_id: catalogItemId }),
  })
}

export async function removeFromWishlist(wishlistId) {
  return apiRequest(`/library/wishlist/${wishlistId}`, { method: 'DELETE' })
}

// ── Book Donations (offline/physical library) ───────────────────────

/**
 * Public: submit a donation offer. No auth required — a logged-in donor's
 * user_id is attached automatically server-side if a token is present.
 */
export async function submitBookDonation(payload) {
  return apiRequest('/library/donations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Public: look up a donation's status by reference code + donor email.
 */
export async function trackBookDonation(code, email) {
  const query = new URLSearchParams({ code, email })
  return apiRequest(`/library/donations/track?${query.toString()}`)
}

/**
 * Librarian logs a walk-in/phone/email donation directly (STAFF+).
 */
export async function logBookDonation(payload) {
  return apiRequest('/library/donations/log', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Librarian review queue — SUBMITTED offers (STAFF+).
 */
export async function fetchPendingDonations() {
  return apiRequest('/library/donations/pending')
}

/**
 * All donations, optionally filtered by status (STAFF+).
 */
export async function fetchDonations(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiRequest(`/library/donations${query}`)
}

export async function fetchDonation(id) {
  return apiRequest(`/library/donations/${id}`)
}

export async function acceptDonation(id, staffNote) {
  return apiRequest(`/library/donations/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify({ staffNote }),
  })
}

export async function declineDonation(id, reason) {
  return apiRequest(`/library/donations/${id}/decline`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/**
 * Mark a donation received and decide each book (WANTED / NOT_NEEDED).
 * @param {Array<{itemId:number, decision:'WANTED'|'NOT_NEEDED'}>} decisions
 */
export async function receiveDonation(id, decisions) {
  return apiRequest(`/library/donations/${id}/receive`, {
    method: 'POST',
    body: JSON.stringify({ decisions }),
  })
}

/**
 * Catalog a WANTED donation item — either `{ mode: 'existing', catalogItemId }`
 * or `{ mode: 'new', ...catalog item fields }`.
 */
export async function catalogDonationItem(donationId, itemId, payload) {
  return apiRequest(`/library/donations/${donationId}/items/${itemId}/catalog`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function cancelDonation(id) {
  return apiRequest(`/library/donations/${id}/cancel`, { method: 'POST' })
}

// ── Reports (STAFF+) ───────────────────────────────────────────────

/**
 * List the report types the backend supports (drives the reports UI).
 * @returns {Promise<{ types: Array<{key,label,dateRange,exportable}> }>}
 */
export async function getReportTypes() {
  return apiRequest('/library/reports/types')
}
