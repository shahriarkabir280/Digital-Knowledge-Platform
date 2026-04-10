const db = require("../index");

async function createDocumentWithMetadata(document, metadata = {}) {
  return db.transaction(async (trx) => {
    const [createdDocument] = await trx("documents")
      .insert({
        uploader_id: document.uploaderId,
        title: document.title,
        document_type: document.documentType,
        file_format: document.fileFormat,
        file_path: document.filePath,
        version: document.version || 1,
        state: document.state || "draft",
        access_tier: document.accessTier || "REGISTERED",
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      })
      .returning(["id"]);

    const [createdMetadata] = await trx("metadata")
      .insert({
        document_id: createdDocument.id,
        summary: metadata.summary || null,
        keywords: metadata.keywords || [],
        published_year: metadata.publishedYear || null,
        extra_data: metadata.extraData || {},
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      })
      .returning(["id"]);

    return {
      document: createdDocument,
      metadata: createdMetadata,
    };
  });
}

module.exports = {
  createDocumentWithMetadata,
};