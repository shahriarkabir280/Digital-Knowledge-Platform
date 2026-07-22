/**
 * Book Donations Repository — offline/physical library donation pipeline.
 *
 * Two entry points feed the same tables: a donor can submit an offer
 * themselves via the public form (createFromDonor), or a librarian can log
 * a donation directly after a walk-in/phone/email conversation
 * (createByStaff, which may start already ACCEPTED or RECEIVED).
 *
 * Lifecycle: SUBMITTED -> ACCEPTED -> RECEIVED -> COMPLETED
 *            SUBMITTED -> DECLINED (terminal)
 *            SUBMITTED/ACCEPTED -> CANCELLED (terminal)
 */

const crypto = require("crypto");
const db = require("../index");
const notificationsRepo = require("./notifications");
const catalogItemsRepo = require("./catalogItems");
const emailService = require("../../services/emailService");

function generateReferenceCode() {
  return `DON-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function generateUniqueReferenceCode(trx) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferenceCode();
    const existing = await trx("book_donations").where({ reference_code: code }).first();
    if (!existing) return code;
  }
  throw Object.assign(new Error("Could not generate a unique reference code"), { statusCode: 500 });
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      title: String(item?.title || "").trim(),
      authors: item?.authors ? String(item.authors).trim() : null,
      isbn: item?.isbn ? String(item.isbn).trim() : null,
      publisher: item?.publisher ? String(item.publisher).trim() : null,
      publication_year: item?.publicationYear ? Number(item.publicationYear) : null,
      quantity: Math.max(1, parseInt(item?.quantity, 10) || 1),
      condition_notes: item?.conditionNotes ? String(item.conditionNotes).trim() : null,
    }))
    .filter((item) => item.title.length > 0);
}

async function insertDonation(trx, fields, items) {
  const sanitizedItems = sanitizeItems(items);
  if (sanitizedItems.length === 0) {
    throw Object.assign(new Error("At least one book with a title is required"), {
      statusCode: 400,
      code: "NO_ITEMS",
    });
  }

  const referenceCode = await generateUniqueReferenceCode(trx);

  const [donation] = await trx("book_donations")
    .insert({
      ...fields,
      reference_code: referenceCode,
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })
    .returning("*");

  const itemRows = sanitizedItems.map((item) => ({
    donation_id: donation.id,
    ...item,
    created_at: trx.fn.now(),
    updated_at: trx.fn.now(),
  }));

  const insertedItems = await trx("book_donation_items").insert(itemRows).returning("*");

  return { ...donation, items: insertedItems };
}

async function attachItems(donations) {
  if (donations.length === 0) return [];

  const ids = donations.map((donation) => donation.id);
  const items = await db("book_donation_items").whereIn("donation_id", ids).orderBy("id", "asc");

  const itemsByDonation = new Map();
  for (const item of items) {
    if (!itemsByDonation.has(item.donation_id)) {
      itemsByDonation.set(item.donation_id, []);
    }
    itemsByDonation.get(item.donation_id).push(item);
  }

  return donations.map((donation) => ({ ...donation, items: itemsByDonation.get(donation.id) || [] }));
}

/**
 * Public path: a donor submits an offer themselves.
 */
async function createFromDonor({
  donorName,
  donorEmail,
  donorPhone,
  donorAffiliation,
  deliveryMethod,
  notes,
  items,
  donorUserId,
}) {
  if (!donorName || !donorName.trim()) {
    throw Object.assign(new Error("Your name is required"), { statusCode: 400, code: "MISSING_DONOR_NAME" });
  }
  if (!donorEmail || !donorEmail.trim()) {
    throw Object.assign(new Error("Your email is required"), { statusCode: 400, code: "MISSING_DONOR_EMAIL" });
  }

  const normalizedEmail = donorEmail.trim().toLowerCase();

  // Lightweight anti-abuse: cap pending public submissions per email per day.
  const recentCount = await db("book_donations")
    .where({ donor_email: normalizedEmail, status: "SUBMITTED" })
    .andWhere("created_at", ">", db.raw("NOW() - INTERVAL '24 hours'"))
    .count("* as count")
    .first();

  if (Number(recentCount?.count || 0) >= 3) {
    throw Object.assign(
      new Error("You already have several pending donation offers — a librarian will review them soon before you submit more."),
      { statusCode: 429, code: "TOO_MANY_PENDING" },
    );
  }

  const donation = await db.transaction((trx) =>
    insertDonation(
      trx,
      {
        origin: "PUBLIC_FORM",
        donor_user_id: donorUserId || null,
        donor_name: donorName.trim(),
        donor_email: normalizedEmail,
        donor_phone: donorPhone ? String(donorPhone).trim() : null,
        donor_affiliation: donorAffiliation || null,
        delivery_method: deliveryMethod || "DROP_OFF",
        notes: notes ? String(notes).trim() : null,
        status: "SUBMITTED",
      },
      items,
    ),
  );

  await notificationsRepo.notifyLibrarians({
    eventType: "book_donation_submitted",
    title: "New book donation offer",
    message: `${donation.donor_name} offered ${donation.items.length} book(s) for donation (ref ${donation.reference_code}).`,
    metadata: { donationId: donation.id, referenceCode: donation.reference_code },
  });

  await emailService
    .sendEmail({
      to: donation.donor_email,
      subject: `Thank you — we received your book donation offer (${donation.reference_code})`,
      text:
        `Hello ${donation.donor_name},\n\n` +
        `Thank you for offering to donate books to the CSEDU library!\n\n` +
        `Your reference code is: ${donation.reference_code}\n` +
        `You can track the status of your donation anytime at /donate-books/track using this code and your email address.\n\n` +
        `A librarian will review your offer soon.\n\nThank you,\nDigital Knowledge Platform Library`,
    })
    .catch(() => {});

  return donation;
}

/**
 * Librarian path: log a donation after a walk-in/phone/email conversation.
 * May start ACCEPTED (a commitment was made) or RECEIVED (books already in hand).
 */
async function createByStaff({
  staffId,
  donorName,
  donorEmail,
  donorPhone,
  donorAffiliation,
  deliveryMethod,
  notes,
  items,
  initialStatus,
}) {
  if (!donorName || !donorName.trim()) {
    throw Object.assign(new Error("Donor name is required"), { statusCode: 400, code: "MISSING_DONOR_NAME" });
  }
  if (!donorEmail || !donorEmail.trim()) {
    throw Object.assign(new Error("Donor email is required"), { statusCode: 400, code: "MISSING_DONOR_EMAIL" });
  }

  const status = ["ACCEPTED", "RECEIVED"].includes(initialStatus) ? initialStatus : "ACCEPTED";
  const now = db.fn.now();

  const fields = {
    origin: "STAFF_ENTERED",
    donor_user_id: null,
    donor_name: donorName.trim(),
    donor_email: donorEmail.trim().toLowerCase(),
    donor_phone: donorPhone ? String(donorPhone).trim() : null,
    donor_affiliation: donorAffiliation || null,
    delivery_method: deliveryMethod || "ALREADY_RECEIVED",
    notes: notes ? String(notes).trim() : null,
    status,
    logged_by: staffId,
    decided_by: staffId,
    decided_at: now,
  };

  if (status === "RECEIVED") {
    fields.received_by = staffId;
    fields.received_at = now;
  }

  return db.transaction((trx) => insertDonation(trx, fields, items));
}

async function findByReferenceCode(code, email) {
  const donation = await db("book_donations")
    .whereRaw("UPPER(reference_code) = UPPER(?)", [String(code || "").trim()])
    .andWhereRaw("LOWER(donor_email) = LOWER(?)", [String(email || "").trim()])
    .first();

  if (!donation) return null;

  const items = await db("book_donation_items").where({ donation_id: donation.id }).orderBy("id", "asc");
  return { ...donation, items };
}

async function findPending() {
  const donations = await db("book_donations").where("status", "SUBMITTED").orderBy("created_at", "asc");
  return attachItems(donations);
}

async function findAll({ status } = {}) {
  let query = db("book_donations").orderBy("created_at", "desc");
  if (status) {
    query = query.where("status", status);
  }
  return attachItems(await query);
}

async function findById(id) {
  const donation = await db("book_donations").where({ id }).first();
  if (!donation) return null;

  const items = await db("book_donation_items").where({ donation_id: id }).orderBy("id", "asc");
  return { ...donation, items };
}

async function accept(id, staffId, staffNote) {
  const donation = await findById(id);
  if (!donation) {
    throw Object.assign(new Error("Donation not found"), { statusCode: 404, code: "DONATION_NOT_FOUND" });
  }
  if (donation.status !== "SUBMITTED") {
    throw Object.assign(new Error("Only submitted offers can be accepted"), { statusCode: 409, code: "INVALID_STATUS" });
  }

  const [updated] = await db("book_donations")
    .where({ id })
    .update({
      status: "ACCEPTED",
      decided_by: staffId,
      decided_at: db.fn.now(),
      staff_note: staffNote || null,
      updated_at: db.fn.now(),
    })
    .returning("*");

  await emailService
    .sendEmail({
      to: donation.donor_email,
      subject: `Your book donation offer was accepted (${donation.reference_code})`,
      text:
        `Hello ${donation.donor_name},\n\n` +
        `Great news — the library has accepted your donation offer.\n` +
        (staffNote ? `Note from the librarian: ${staffNote}\n\n` : "\n") +
        `Please bring or send the books to the library. We'll let you know once they've been received and added to the catalog.\n\n` +
        `Thank you,\nDigital Knowledge Platform Library`,
    })
    .catch(() => {});

  if (donation.donor_user_id) {
    await notificationsRepo.notifyUser({
      userId: donation.donor_user_id,
      eventType: "book_donation_accepted",
      title: "Donation offer accepted",
      message: `Your book donation offer (${donation.reference_code}) was accepted.`,
      metadata: { donationId: id },
    });
  }

  return { ...updated, items: donation.items };
}

async function decline(id, staffId, reason) {
  const donation = await findById(id);
  if (!donation) {
    throw Object.assign(new Error("Donation not found"), { statusCode: 404, code: "DONATION_NOT_FOUND" });
  }
  if (donation.status !== "SUBMITTED") {
    throw Object.assign(new Error("Only submitted offers can be declined"), { statusCode: 409, code: "INVALID_STATUS" });
  }

  const [updated] = await db("book_donations")
    .where({ id })
    .update({
      status: "DECLINED",
      decided_by: staffId,
      decided_at: db.fn.now(),
      staff_note: reason || null,
      updated_at: db.fn.now(),
    })
    .returning("*");

  await emailService
    .sendEmail({
      to: donation.donor_email,
      subject: `Update on your book donation offer (${donation.reference_code})`,
      text:
        `Hello ${donation.donor_name},\n\n` +
        `Thank you again for thinking of the CSEDU library. We're not able to accept this donation offer right now` +
        (reason ? `: ${reason}` : ".") +
        `\n\nWe really appreciate your generosity and hope you'll consider us again in the future.\n\n` +
        `Thank you,\nDigital Knowledge Platform Library`,
    })
    .catch(() => {});

  if (donation.donor_user_id) {
    await notificationsRepo.notifyUser({
      userId: donation.donor_user_id,
      eventType: "book_donation_declined",
      title: "Donation offer declined",
      message: reason
        ? `Your book donation offer (${donation.reference_code}) was declined: ${reason}`
        : `Your book donation offer (${donation.reference_code}) was declined.`,
      metadata: { donationId: id },
    });
  }

  return { ...updated, items: donation.items };
}

async function markReceived(id, staffId, decisions = []) {
  const donation = await findById(id);
  if (!donation) {
    throw Object.assign(new Error("Donation not found"), { statusCode: 404, code: "DONATION_NOT_FOUND" });
  }
  if (donation.status !== "ACCEPTED") {
    throw Object.assign(new Error("Only accepted donations can be marked received"), {
      statusCode: 409,
      code: "INVALID_STATUS",
    });
  }

  await db.transaction(async (trx) => {
    for (const decision of Array.isArray(decisions) ? decisions : []) {
      if (!["WANTED", "NOT_NEEDED"].includes(decision?.decision)) continue;
      await trx("book_donation_items")
        .where({ id: decision.itemId, donation_id: id })
        .update({ decision: decision.decision, updated_at: trx.fn.now() });
    }

    await trx("book_donations")
      .where({ id })
      .update({ status: "RECEIVED", received_by: staffId, received_at: trx.fn.now(), updated_at: trx.fn.now() });
  });

  return maybeComplete(id);
}

/**
 * If a RECEIVED donation has no items left PENDING/WANTED (everything is
 * either CATALOGED or NOT_NEEDED), flip it to COMPLETED and thank the donor.
 */
async function maybeComplete(donationId) {
  const donation = await findById(donationId);
  if (!donation || donation.status !== "RECEIVED") {
    return donation;
  }

  const unresolved = donation.items.some((item) => item.decision === "PENDING" || item.decision === "WANTED");
  if (unresolved) {
    return donation;
  }

  const [updated] = await db("book_donations")
    .where({ id: donationId })
    .update({ status: "COMPLETED", updated_at: db.fn.now() })
    .returning("*");

  const catalogedTitles = donation.items.filter((item) => item.decision === "CATALOGED").map((item) => item.title);

  await emailService
    .sendEmail({
      to: donation.donor_email,
      subject: `Thank you — your donated books are now in our library! (${donation.reference_code})`,
      text:
        `Hello ${donation.donor_name},\n\n` +
        (catalogedTitles.length
          ? `Thank you! The following donated book(s) are now part of the CSEDU library collection:\n\n${catalogedTitles
              .map((title) => `  - ${title}`)
              .join("\n")}\n\n`
          : "Thank you for your donation.\n\n") +
        `We truly appreciate your generosity.\n\nThank you,\nDigital Knowledge Platform Library`,
    })
    .catch(() => {});

  if (donation.donor_user_id) {
    await notificationsRepo.notifyUser({
      userId: donation.donor_user_id,
      eventType: "book_donation_completed",
      title: "Donation completed — thank you!",
      message: `Your donated books (ref ${donation.reference_code}) have been added to the library.`,
      metadata: { donationId },
    });
  }

  return { ...updated, items: donation.items };
}

/**
 * Catalog a WANTED donation item — either as new copies of an existing
 * catalog title, or as a brand-new catalog item (tagged as donation-sourced).
 */
async function catalogItem(itemId, payload = {}) {
  const item = await db("book_donation_items").where({ id: itemId }).first();
  if (!item) {
    throw Object.assign(new Error("Donation item not found"), { statusCode: 404, code: "ITEM_NOT_FOUND" });
  }
  if (item.decision === "CATALOGED") {
    throw Object.assign(new Error("This item has already been cataloged"), { statusCode: 409, code: "ALREADY_CATALOGED" });
  }
  if (item.decision !== "WANTED") {
    throw Object.assign(new Error("Mark this item as wanted before cataloging it"), { statusCode: 409, code: "NOT_WANTED" });
  }

  let catalogItemId;

  if (payload.mode === "existing") {
    const existingItem = await catalogItemsRepo.findById(payload.catalogItemId);
    if (!existingItem) {
      throw Object.assign(new Error("Catalog item not found"), { statusCode: 404, code: "CATALOG_ITEM_NOT_FOUND" });
    }

    const quantity = item.quantity || 1;
    await db.transaction(async (trx) => {
      await trx("catalog_items")
        .where({ id: payload.catalogItemId })
        .update({
          total_copies: trx.raw("total_copies + ?", [quantity]),
          available_copies: trx.raw("available_copies + ?", [quantity]),
          updated_at: trx.fn.now(),
        });

      const copyRows = Array.from({ length: quantity }, () => ({
        item_id: payload.catalogItemId,
        status: "AVAILABLE",
        condition: payload.condition || "GOOD",
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      }));
      await trx("catalog_copies").insert(copyRows);
    });

    catalogItemId = payload.catalogItemId;
  } else {
    const created = await catalogItemsRepo.create({
      title: payload.title || item.title,
      author: payload.author || item.authors,
      isbn: payload.isbn || item.isbn,
      subject: payload.subject,
      description: payload.description,
      item_type: payload.item_type || "textbook",
      language: payload.language || "EN",
      publisher: payload.publisher || item.publisher,
      publish_year: payload.publish_year || item.publication_year,
      total_copies: item.quantity || 1,
      location: payload.location,
      location_floor: payload.location_floor,
      location_shelf: payload.location_shelf,
      location_column: payload.location_column,
      cover_image_url: payload.cover_image_url,
      acquisition_source: "DONATION",
    });
    catalogItemId = created.id;
  }

  const [updatedItem] = await db("book_donation_items")
    .where({ id: itemId })
    .update({ decision: "CATALOGED", catalog_item_id: catalogItemId, updated_at: db.fn.now() })
    .returning("*");

  const donation = await maybeComplete(item.donation_id);

  return { item: updatedItem, donation };
}

async function cancel(id, actorId, isStaff) {
  const donation = await findById(id);
  if (!donation) {
    throw Object.assign(new Error("Donation not found"), { statusCode: 404, code: "DONATION_NOT_FOUND" });
  }
  if (!isStaff && Number(donation.donor_user_id) !== Number(actorId)) {
    throw Object.assign(new Error("You can only cancel your own donation"), { statusCode: 403, code: "NOT_YOURS" });
  }
  if (!["SUBMITTED", "ACCEPTED"].includes(donation.status)) {
    throw Object.assign(new Error("This donation can no longer be cancelled"), { statusCode: 409, code: "INVALID_STATUS" });
  }

  const [updated] = await db("book_donations")
    .where({ id })
    .update({ status: "CANCELLED", updated_at: db.fn.now() })
    .returning("*");

  return { ...updated, items: donation.items };
}

module.exports = {
  createFromDonor,
  createByStaff,
  findByReferenceCode,
  findPending,
  findAll,
  findById,
  accept,
  decline,
  markReceived,
  catalogItem,
  cancel,
};
