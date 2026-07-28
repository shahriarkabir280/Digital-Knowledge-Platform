/**
 * OpenAPI 3.0 spec for the Digital Knowledge Platform API, built programmatically
 * from the Express route definitions in src/modules/*\/index.js and
 * src/api/routes/index.js. Served via swagger-ui-express at /api-docs.
 *
 * If you add/change/remove a route, update the matching `op(...)` call below.
 */

const paths = {};

function ensurePath(p) {
  if (!paths[p]) paths[p] = {};
  return paths[p];
}

// Convert Express-style ":id" params to OpenAPI "{id}" and collect param defs.
function convertPath(expressPath) {
  const params = [];
  const converted = expressPath.replace(/:([A-Za-z][A-Za-z0-9]*)/g, (_m, name) => {
    params.push(name);
    return `{${name}}`;
  });
  return { converted, params };
}

function jsonBody(example, required = true) {
  return {
    required,
    content: {
      "application/json": {
        schema: { type: "object", example },
      },
    },
  };
}

function formBody(fields) {
  const properties = {};
  fields.forEach((f) => {
    properties[f.key] = f.type === "file"
      ? { type: "string", format: "binary" }
      : { type: "string", example: f.example };
  });
  return {
    required: true,
    content: {
      "multipart/form-data": {
        schema: { type: "object", properties },
      },
    },
  };
}

const defaultResponses = {
  200: { description: "OK" },
  201: { description: "Created" },
  400: { description: "Validation error" },
  401: { description: "Missing or invalid access token" },
  403: { description: "Forbidden — insufficient role" },
  404: { description: "Not found" },
};

function op(method, expressPath, opts = {}) {
  const {
    summary,
    tag,
    auth = true, // false => public, no bearer required
    body = null,
    formdata = null,
    query = [],
    description = "",
    responses = defaultResponses,
  } = opts;

  const { converted, params } = convertPath(expressPath);
  const pathItem = ensurePath(converted);

  const parameters = [
    ...params.map((name) => ({
      name,
      in: "path",
      required: true,
      schema: { type: name.toLowerCase().includes("id") ? "integer" : "string" },
    })),
    ...query.map((q) => ({
      name: q.key,
      in: "query",
      required: false,
      description: q.description,
      schema: { type: "string", example: q.value || undefined },
    })),
  ];

  const operation = {
    summary,
    tags: [tag],
    parameters: parameters.length ? parameters : undefined,
    responses,
  };

  if (description) operation.description = description;
  if (!auth) operation.security = [];

  if (body) operation.requestBody = jsonBody(body);
  else if (formdata) operation.requestBody = formBody(formdata);

  pathItem[method] = operation;
}

// ─────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────
op("get", "/auth/health", { tag: "Auth", auth: false, summary: "Auth module health check" });
op("post", "/auth/register", {
  tag: "Auth",
  auth: false,
  summary: "Register a new account",
  description: "Institutional email must end with `@cs.du.ac.bd`. New users are created with role MEMBER.",
  body: { name: "Jane Student", email: "jane.student@cs.du.ac.bd", password: "StrongPass1!" },
});
op("post", "/auth/login", {
  tag: "Auth",
  auth: false,
  summary: "Log in and receive access/refresh tokens",
  body: { email: "jane.student@cs.du.ac.bd", password: "StrongPass1!" },
});
op("post", "/auth/refresh", {
  tag: "Auth",
  auth: false,
  summary: "Exchange a refresh token for a new access token",
  body: { refreshToken: "your-refresh-token" },
});

// ─────────────────────────────────────────────────────────────────
// DOCUMENTS / REPOSITORY  (mounted at both /repository and /documents)
// ─────────────────────────────────────────────────────────────────
const DOC = "Documents";
op("get", "/repository/health", { tag: DOC, auth: false, summary: "Documents module health check" });
op("get", "/repository/published", {
  tag: DOC,
  auth: false,
  summary: "List published documents",
  description: "Public read; access-tier enforcement happens based on optional auth.",
  query: [{ key: "type", description: "Optional resource type filter" }, { key: "page", value: "1" }, { key: "limit", value: "20" }],
});
op("get", "/repository/files/{documentId}", { tag: DOC, auth: false, summary: "Get file info" });
op("get", "/repository/files/{documentId}/signed-url", { tag: DOC, auth: false, summary: "Get a signed file URL" });
op("get", "/repository/files/{documentId}/content", { tag: DOC, auth: false, summary: "Stream file content" });

op("get", "/repository/notifications", { tag: DOC, summary: "Get my notifications" });
op("patch", "/repository/notifications/read-all", { tag: DOC, summary: "Mark all notifications read" });
op("patch", "/repository/notifications/{notificationId}/read", { tag: DOC, summary: "Mark one notification read" });

op("post", "/repository/upload", {
  tag: DOC,
  summary: "Upload a new document file",
  formdata: [
    { key: "file", type: "file" },
    { key: "title", example: "Sample Resource Title" },
    { key: "description", example: "Short description" },
    { key: "author", example: "Jane Student" },
    { key: "year", example: "2026" },
    { key: "department", example: "Computer Science" },
    { key: "course", example: "CSE101" },
    { key: "language", example: "English" },
    { key: "keywords", example: "machine learning, nlp" },
    { key: "tags", example: "thesis, 2026" },
    { key: "resourceCategory", example: "thesis" },
    { key: "accessTier", example: "PUBLIC" },
    { key: "state", example: "pending" },
  ],
});
op("delete", "/repository/files/{documentId}", { tag: DOC, summary: "Delete a file" });
op("put", "/repository/{id}/file", {
  tag: DOC,
  summary: "Replace file and increment version",
  formdata: [{ key: "file", type: "file" }],
});

op("post", "/repository/{id}/metadata", {
  tag: DOC,
  summary: "Create document metadata",
  body: { title: "Updated Title", author: "Jane Student", abstract: "Abstract text.", keywords: ["ml", "nlp"], year: 2026, department: "Computer Science", accessTier: "PUBLIC" },
});
op("get", "/repository/{id}/metadata", { tag: DOC, summary: "Get document metadata" });
op("put", "/repository/{id}/metadata", { tag: DOC, summary: "Update document metadata", body: { title: "Updated Title", abstract: "Revised abstract." } });

op("patch", "/repository/{id}/state", {
  tag: DOC,
  summary: "Change document lifecycle state",
  description: "Valid states: pending, draft, review, published, archived, paused. A note is required for several transitions.",
  body: { state: "review", note: "Ready for reviewer feedback" },
});
op("get", "/repository/{id}/audit-logs", { tag: DOC, summary: "Get document audit logs" });

op("get", "/repository/my-uploads", { tag: DOC, summary: "List my uploads", query: [{ key: "state" }, { key: "type" }] });
op("get", "/repository/review-queue", { tag: DOC, summary: "Reviewer queue (Staff+)", query: [{ key: "type" }] });
op("get", "/repository/pending", { tag: DOC, summary: "Pending documents (Admin)", query: [{ key: "type" }] });
op("get", "/repository/all-uploads", {
  tag: DOC,
  summary: "All uploads listing (Staff+)",
  query: [{ key: "state" }, { key: "type" }, { key: "uploaderId" }, { key: "accessTier" }],
});

op("post", "/repository/{id}/access-requests", { tag: DOC, summary: "Request access to a restricted document", body: { reason: "I need this for my coursework" } });
op("get", "/repository/access-requests/mine", { tag: DOC, summary: "My submitted access requests" });
op("get", "/repository/access-requests/incoming", { tag: DOC, summary: "Incoming access requests (my documents)", query: [{ key: "status" }] });
op("patch", "/repository/access-requests/{requestId}/decision", { tag: DOC, summary: "Approve/reject an access request", body: { decision: "APPROVED" } });

// ─────────────────────────────────────────────────────────────────
// LIBRARY
// ─────────────────────────────────────────────────────────────────
const LIB = "Library";
op("get", "/library/health", { tag: LIB, auth: false, summary: "Library module health check" });
op("get", "/library/catalog", {
  tag: LIB,
  auth: false,
  summary: "Search the catalog",
  query: [{ key: "q" }, { key: "author" }, { key: "isbn" }, { key: "subject" }, { key: "status" }, { key: "available" }, { key: "location" }, { key: "item_type" }, { key: "language" }, { key: "tag" }, { key: "page", value: "1" }, { key: "limit", value: "20" }, { key: "sort_by", value: "created_at" }, { key: "sort_order", value: "desc" }],
});
op("get", "/library/catalog/facets", { tag: LIB, auth: false, summary: "Catalog facets" });
op("get", "/library/catalog/stats", { tag: LIB, auth: false, summary: "Catalog stats" });
op("get", "/library/catalog/lookup", { tag: LIB, summary: "Resolve scanned barcode/QR/ISBN (Staff+)", query: [{ key: "code" }] });
op("get", "/library/catalog/{id}", { tag: LIB, auth: false, summary: "Get a catalog item" });

op("get", "/library/catalog/{id}/reviews", { tag: LIB, auth: false, summary: "List reviews for an item" });
op("get", "/library/catalog/{id}/reviews/mine", { tag: LIB, summary: "My review for an item" });
op("post", "/library/catalog/{id}/reviews", { tag: LIB, summary: "Create/update my review", body: { rating: 5, comment: "Great resource!" } });

op("get", "/library/catalog/{id}/barcode", {
  tag: LIB,
  summary: "Get item barcode/QR image (Staff+)",
  query: [{ key: "format", value: "barcode", description: "'barcode' or 'qr'" }, { key: "_token", description: "Optional bearer token for <img> tag usage" }],
});

op("post", "/library/catalog", {
  tag: LIB,
  summary: "Create catalog item (Staff+)",
  body: { title: "Introduction to Algorithms", author: "Cormen et al.", isbn: "9780262046305", item_type: "textbook", total_copies: 3, publish_year: 2022 },
});
op("put", "/library/catalog/{id}", { tag: LIB, summary: "Update catalog item (Staff+)", body: { total_copies: 4 } });
op("delete", "/library/catalog/{id}", { tag: LIB, summary: "Delete catalog item (Admin)" });
op("post", "/library/catalog/import", { tag: LIB, summary: "Bulk import catalog (CSV/MARC) (Staff+)", formdata: [{ key: "file", type: "file" }] });
op("get", "/library/audit-log", { tag: LIB, summary: "Catalog audit log (Staff+)" });

op("get", "/library/fines/my", { tag: LIB, summary: "My fines" });
op("post", "/library/fines/{id}/pay", { tag: LIB, summary: "Pay a fine" });
op("post", "/library/fines/{id}/waive", { tag: LIB, summary: "Waive a fine (Staff+)" });

op("get", "/library/holds/my", { tag: LIB, summary: "My holds" });
op("post", "/library/holds", { tag: LIB, summary: "Place a hold", body: { catalog_item_id: 1 } });
op("delete", "/library/holds/{id}", { tag: LIB, summary: "Cancel a hold" });

op("get", "/library/subscriptions/my", { tag: LIB, summary: "My subscription" });
op("post", "/library/subscriptions/request-renewal", { tag: LIB, summary: "Request subscription renewal" });
op("post", "/library/subscriptions/{memberId}/reject-renewal", { tag: LIB, summary: "Reject renewal request (Staff+)", body: { reason: "Outstanding fines" } });
op("get", "/library/subscriptions", { tag: LIB, summary: "List subscriptions (Staff+)", query: [{ key: "page", value: "1" }, { key: "limit", value: "20" }, { key: "status" }] });
op("post", "/library/subscriptions/{memberId}/activate", { tag: LIB, summary: "Activate/renew subscription (Staff+)", body: { months: 12 } });

op("post", "/library/borrow-requests", { tag: LIB, summary: "Request to borrow an item", body: { catalog_item_id: 1 } });
op("get", "/library/borrow-requests/my", { tag: LIB, summary: "My borrow requests" });
op("get", "/library/borrow-requests/pending", { tag: LIB, summary: "Pending borrow requests (Staff+)" });
op("post", "/library/borrow-requests/{id}/approve", { tag: LIB, summary: "Approve borrow request (Staff+)", body: { loan_days: 14 } });
op("post", "/library/borrow-requests/{id}/reject", { tag: LIB, summary: "Reject borrow request (Staff+)", body: { reason: "Item reserved" } });
op("delete", "/library/borrow-requests/{id}", { tag: LIB, summary: "Cancel my borrow request" });

op("post", "/library/donations", {
  tag: LIB,
  auth: false,
  summary: "Submit a book donation (public)",
  description: "`website` is a honeypot field — leave empty.",
  body: { donorName: "John Donor", donorEmail: "john.donor@example.com", deliveryMethod: "drop-off", items: [{ title: "Clean Code", author: "Robert C. Martin", quantity: 1 }], website: "" },
});
op("get", "/library/donations/track", { tag: LIB, auth: false, summary: "Track donation status (public)", query: [{ key: "code" }, { key: "email" }] });
op("post", "/library/donations/log", { tag: LIB, summary: "Log a walk-in/phone donation (Staff+)", body: { donorName: "Jane Walk-in", deliveryMethod: "walk-in", items: [{ title: "The Pragmatic Programmer", quantity: 1 }] } });
op("get", "/library/donations/pending", { tag: LIB, summary: "Pending donations (Staff+)" });
op("get", "/library/donations", { tag: LIB, summary: "List donations (Staff+)", query: [{ key: "status" }] });
op("get", "/library/donations/{id}", { tag: LIB, summary: "Donation detail (Staff+)" });
op("post", "/library/donations/{id}/accept", { tag: LIB, summary: "Accept donation (Staff+)", body: { staffNote: "Looks good" } });
op("post", "/library/donations/{id}/decline", { tag: LIB, summary: "Decline donation (Staff+)", body: { reason: "Out of scope" } });
op("post", "/library/donations/{id}/receive", { tag: LIB, summary: "Mark donation received (Staff+)", body: { decisions: [{ itemId: 1, decision: "ACCEPT" }] } });
op("post", "/library/donations/{id}/items/{itemId}/catalog", { tag: LIB, summary: "Catalog a donated item (Staff+)", body: { total_copies: 1, location: "Main Library", item_type: "textbook" } });
op("post", "/library/donations/{id}/cancel", { tag: LIB, summary: "Cancel a donation" });

op("get", "/library/wishlist", { tag: LIB, summary: "My wishlist" });
op("post", "/library/wishlist", { tag: LIB, summary: "Add to wishlist", body: { catalog_item_id: 1 } });
op("delete", "/library/wishlist/{id}", { tag: LIB, summary: "Remove from wishlist" });

const reportDateQuery = [{ key: "from" }, { key: "to" }];
op("get", "/library/reports/circulation", { tag: LIB, summary: "Report: circulation (Staff+)", query: reportDateQuery });
op("get", "/library/reports/popular-items", { tag: LIB, summary: "Report: popular items (Staff+)", query: [...reportDateQuery, { key: "limit", value: "10" }] });
op("get", "/library/reports/overdue", { tag: LIB, summary: "Report: overdue (Staff+)", query: reportDateQuery });
op("get", "/library/reports/collection-stats", { tag: LIB, summary: "Report: collection stats (Staff+)" });
op("get", "/library/reports/member-activity", { tag: LIB, summary: "Report: member activity (Staff+)", query: reportDateQuery });
op("get", "/library/reports/fines-summary", { tag: LIB, summary: "Report: fines summary (Staff+)", query: reportDateQuery });
op("get", "/library/reports/active-loans", { tag: LIB, summary: "Report: active loans (Staff+)", query: reportDateQuery });
op("get", "/library/reports/inventory", { tag: LIB, summary: "Report: inventory (Staff+)" });
op("get", "/library/reports/new-acquisitions", { tag: LIB, summary: "Report: new acquisitions (Staff+)", query: reportDateQuery });
op("get", "/library/reports/holds", { tag: LIB, summary: "Report: holds queue (Staff+)" });
op("get", "/library/reports/fines-detail", { tag: LIB, summary: "Report: fines detail (Staff+)", query: reportDateQuery });
op("get", "/library/reports/types", { tag: LIB, summary: "List available report types (Staff+)" });
op("get", "/library/reports/export", {
  tag: LIB,
  summary: "Export a report as PDF/XLSX (Staff+)",
  query: [{ key: "type", value: "circulation" }, { key: "format", value: "pdf", description: "'pdf' or 'xlsx'" }, ...reportDateQuery],
});

// ─────────────────────────────────────────────────────────────────
// USERS (Admin)
// ─────────────────────────────────────────────────────────────────
op("get", "/users", { tag: "Users", summary: "List users (Admin)" });
op("patch", "/users/{id}/role", { tag: "Users", summary: "Update a user's role (Admin)", body: { role: "STAFF" } });

// ─────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────
op("get", "/profile/me", { tag: "Profile", summary: "Get my profile" });
op("patch", "/profile/me", {
  tag: "Profile",
  summary: "Update my profile",
  body: { name: "Jane Student", bio: "CS undergrad.", department: "Computer Science", phone: "+8801XXXXXXXXX", linkedin_url: "https://linkedin.com/in/janestudent" },
});
op("post", "/profile/me/avatar", {
  tag: "Profile",
  summary: "Upload my avatar",
  description: "Max 5MB. Allowed: JPEG, PNG, WEBP, GIF.",
  formdata: [{ key: "avatar", type: "file" }],
});

// ─────────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────────
op("get", "/projects", { tag: "Projects", auth: false, summary: "List published projects" });
op("get", "/projects/pending", { tag: "Projects", summary: "List pending projects (Admin)" });
op("post", "/projects", {
  tag: "Projects",
  summary: "Submit a project",
  body: { title: "Automated Essay Scoring System", description: "Short summary.", longDescription: "Detailed description.", category: "Machine Learning", academicYear: "2025-2026", teamMembers: ["Jane Student"], tags: ["nlp", "ml"] },
});
op("patch", "/projects/{id}/review", { tag: "Projects", summary: "Approve/reject a project (Admin)", body: { state: "published", note: "Looks good" } });
op("patch", "/projects/{id}/comment", { tag: "Projects", summary: "Comment or reply on a project", body: { commentText: "How did you handle class imbalance?" } });
op("patch", "/projects/{id}/resource", { tag: "Projects", summary: "Add a learning resource to a project", body: { title: "Attention Is All You Need", url: "https://arxiv.org/abs/1706.03762", type: "paper" } });

// ─────────────────────────────────────────────────────────────────
// COLLABORATION
// ─────────────────────────────────────────────────────────────────
const COL = "Collaboration";
op("get", "/collaboration/documents/{docId}/annotations", { tag: COL, summary: "Get annotations for a document" });
op("post", "/collaboration/annotations", {
  tag: COL,
  summary: "Create an annotation",
  body: { documentId: 1, sectionRef: "page-3", quotedText: "the quoted passage", commentText: "This claim needs a citation.", highlightColor: "#FFEB3B", isPublic: true },
});
op("delete", "/collaboration/annotations/{id}", { tag: COL, summary: "Delete an annotation" });
op("post", "/collaboration/annotations/{id}/replies", { tag: COL, summary: "Reply to an annotation", body: { replyText: "Agreed, added a reference." } });
op("get", "/collaboration/documents/{docId}/annotations/export", { tag: COL, summary: "Export annotations for a document", query: [{ key: "format", value: "txt" }] });

op("post", "/collaboration/rooms", { tag: COL, summary: "Create a reading room", body: { name: "Thesis Review Room", documentId: 1 } });
op("get", "/collaboration/documents/{docId}/rooms", { tag: COL, summary: "Get reading rooms for a document" });
op("get", "/collaboration/users/search", { tag: COL, summary: "Search users (for invites)", query: [{ key: "q" }] });
op("post", "/collaboration/rooms/{roomId}/invite", { tag: COL, summary: "Invite a user to a room", body: { inviteeId: 2 } });
op("get", "/collaboration/rooms/{roomId}/members", { tag: COL, summary: "Get room members" });
op("post", "/collaboration/rooms/{roomId}/messages", { tag: COL, summary: "Post a room message", body: { messageText: "Let's discuss section 3." } });
op("get", "/collaboration/rooms/{roomId}/messages", { tag: COL, summary: "Get room messages" });
op("post", "/collaboration/rooms/{roomId}/presence", { tag: COL, summary: "Update my presence in a room" });
op("get", "/collaboration/rooms/{roomId}/presence", { tag: COL, summary: "Get room presence" });

// ─────────────────────────────────────────────────────────────────
// LOANS
// ─────────────────────────────────────────────────────────────────
const LOAN = "Loans";
op("post", "/loans/checkout", { tag: LOAN, summary: "Checkout an item (Staff+)", body: { catalog_item_id: 1, member_id: 2, loan_days: 14 } });
op("post", "/loans/{id}/return", { tag: LOAN, summary: "Return a loan (Staff+)" });
op("post", "/loans/{id}/renew", { tag: LOAN, summary: "Renew a loan (owner or Staff+)" });
op("get", "/loans/my", { tag: LOAN, summary: "My loans", query: [{ key: "status" }] });
op("get", "/loans/overdue", { tag: LOAN, summary: "Overdue loans (Staff+)" });
op("get", "/loans/history/export", { tag: LOAN, summary: "Export my borrowing history", query: [{ key: "format", value: "csv", description: "'csv' or 'pdf'" }, { key: "from" }, { key: "to" }] });
op("get", "/loans/history", { tag: LOAN, summary: "My borrowing history", query: [{ key: "page", value: "1" }, { key: "limit", value: "20" }] });
op("get", "/loans/members/search", { tag: LOAN, summary: "Search members (Staff+)", query: [{ key: "q" }] });

// ─────────────────────────────────────────────────────────────────
// ROLE REQUESTS
// ─────────────────────────────────────────────────────────────────
const RR = "Role Requests";
op("post", "/role-requests", { tag: RR, summary: "Submit a role upgrade request", body: { requestedRole: "CONTRIBUTOR", reason: "I regularly publish departmental research." } });
op("get", "/role-requests/mine", { tag: RR, summary: "My role requests" });
op("get", "/role-requests", { tag: RR, summary: "List role requests (Admin)", query: [{ key: "status", description: "PENDING | APPROVED | REJECTED" }] });
op("patch", "/role-requests/{id}/decision", { tag: RR, summary: "Decide a role request (Admin)", body: { decision: "APPROVED" } });

// ─────────────────────────────────────────────────────────────────
// MISC
// ─────────────────────────────────────────────────────────────────
op("get", "/health", { tag: "Misc", auth: false, summary: "API health check" });
op("get", "/status", { tag: "Misc", auth: false, summary: "API status" });
op("post", "/extract-metadata", {
  tag: "Misc",
  auth: false,
  summary: "Extract metadata (title/author/abstract/keywords) from raw text",
  description: "Tries the Python NLP microservice first, falls back to local heuristics.",
  body: { text: "Paste at least 20 characters of document text here." },
});

// ─────────────────────────────────────────────────────────────────
// ASSEMBLE
// ─────────────────────────────────────────────────────────────────
const tagDescriptions = {
  Auth: "Registration, login, token refresh.",
  Documents: "Institutional document repository: upload, metadata, lifecycle state, access requests, notifications.",
  Library: "Library catalog, circulation (holds/loans/fines), donations, wishlist, reports.",
  Users: "Admin-only user role/status management.",
  Profile: "Self-service profile for the logged-in user.",
  Projects: "Student project showcase: submission, review, comments, learning resources.",
  Collaboration: "Document annotations and virtual reading rooms.",
  Loans: "Circulation desk: checkout, return, renew, borrowing history.",
  "Role Requests": "Members requesting elevated roles (CONTRIBUTOR/STAFF/ADMIN), admin decisions.",
  Misc: "Health checks and standalone utilities.",
};

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Digital Knowledge Platform API",
    version: "1.0.0",
    description:
      "REST API for the Digital Knowledge Platform (DKP) — an institutional document repository, library catalog/circulation system, student project showcase, and research collaboration platform.\n\n" +
      "### Auth\nMost endpoints require a Bearer access token obtained from `POST /auth/login`. Registration is restricted to institutional emails ending in `@cs.du.ac.bd`.\n\n" +
      "### Roles\n`MEMBER` < `CONTRIBUTOR` / `STAFF` < `LAB_MANAGER` < `ADMIN`. Endpoints marked \"(Staff+)\" or \"(Admin)\" require the caller to hold that role or higher.",
  },
  servers: [
    { url: "https://csedu-dkp.farefin.com/api", description: "Production" },
    { url: "http://localhost:3000/api", description: "Local development" },
  ],
  tags: Object.entries(tagDescriptions).map(([name, description]) => ({ name, description })),
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  security: [{ bearerAuth: [] }],
  paths,
};

module.exports = spec;
