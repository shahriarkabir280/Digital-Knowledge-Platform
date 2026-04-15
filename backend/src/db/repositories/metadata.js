/**
 * Metadata Repository
 * Handles CRUD operations for document metadata
 * One-to-one relationship with documents table
 */

const db = require('../database');

class MetadataRepository {
  /**
   * Create new metadata record
   * @param {Object} metadata - Metadata fields
   * @returns {Promise<Object>} Created metadata record
   */
  static async create(metadata) {
    const [id] = await db('metadata').insert(metadata);
    return this.findById(id);
  }

  /**
   * Find metadata by ID
   * @param {number} id - Metadata ID
   * @returns {Promise<Object>} Metadata record or null
   */
  static async findById(id) {
    return db('metadata').where({ id }).first();
  }

  /**
   * Find metadata by document ID (one-to-one relationship)
   * @param {number} documentId - Document ID
   * @returns {Promise<Object>} Metadata record or null
   */
  static async findByDocumentId(documentId) {
    return db('metadata').where({ document_id: documentId }).first();
  }

  /**
   * Update metadata record
   * @param {number} id - Metadata ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated metadata record
   */
  static async update(id, updates) {
    await db('metadata').where({ id }).update(updates);
    return this.findById(id);
  }

  /**
   * Update metadata by document ID
   * @param {number} documentId - Document ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated metadata record
   */
  static async updateByDocumentId(documentId, updates) {
    const metadata = await this.findByDocumentId(documentId);
    if (!metadata) {
      throw new Error(`No metadata found for document ${documentId}`);
    }
    return this.update(metadata.id, updates);
  }

  /**
   * Delete metadata record
   * @param {number} id - Metadata ID
   * @returns {Promise<number>} Number of rows deleted
   */
  static async delete(id) {
    return db('metadata').where({ id }).delete();
  }

  /**
   * Delete metadata by document ID (cascade handled by DB)
   * @param {number} documentId - Document ID
   * @returns {Promise<number>} Number of rows deleted
   */
  static async deleteByDocumentId(documentId) {
    return db('metadata').where({ document_id: documentId }).delete();
  }

  /**
   * Find metadata by multiple filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of metadata records
   */
  static async findByFilters(filters) {
    let query = db('metadata');

    if (filters.author) {
      query = query.where('author', 'ILIKE', `%${filters.author}%`);
    }

    if (filters.subject) {
      query = query.where('subject', 'ILIKE', `%${filters.subject}%`);
    }

    if (filters.language) {
      query = query.where('language', filters.language);
    }

    if (filters.license) {
      query = query.where('license', filters.license);
    }

    if (filters.institution) {
      query = query.where('institution', 'ILIKE', `%${filters.institution}%`);
    }

    if (filters.publisher) {
      query = query.where('publisher', 'ILIKE', `%${filters.publisher}%`);
    }

    if (filters.minPublicationDate) {
      query = query.where('publication_date', '>=', filters.minPublicationDate);
    }

    if (filters.maxPublicationDate) {
      query = query.where('publication_date', '<=', filters.maxPublicationDate);
    }

    return query;
  }

  /**
   * Search metadata by keywords or abstract
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching metadata
   */
  static async search(searchTerm) {
    return db('metadata')
      .where('keywords', 'ILIKE', `%${searchTerm}%`)
      .orWhere('abstract', 'ILIKE', `%${searchTerm}%`)
      .orWhere('description', 'ILIKE', `%${searchTerm}%`)
      .orWhere('author', 'ILIKE', `%${searchTerm}%`)
      .orWhere('subject', 'ILIKE', `%${searchTerm}%`);
  }

  /**
   * Get all metadata with pagination
   * @param {number} limit - Records per page
   * @param {number} offset - Pagination offset
   * @returns {Promise<Array>} Paginated metadata records
   */
  static async findAll(limit = 20, offset = 0) {
    return db('metadata')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get total count of metadata records
   * @returns {Promise<number>} Total count
   */
  static async count() {
    const result = await db('metadata').count('* as total').first();
    return result.total;
  }

  /**
   * Get metadata with associated document info
   * @param {number} documentId - Document ID
   * @returns {Promise<Object>} Metadata with document details
   */
  static async findWithDocument(documentId) {
    return db('metadata')
      .join('documents', 'metadata.document_id', '=', 'documents.id')
      .select(
        'metadata.*',
        db.raw('documents.title as document_title'),
        db.raw('documents.type as document_type'),
        db.raw('documents.format as document_format'),
        db.raw('documents.state as document_state')
      )
      .where('metadata.document_id', documentId)
      .first();
  }

  /**
   * Bulk insert metadata records
   * @param {Array<Object>} records - Array of metadata objects
   * @returns {Promise<Array>} Array of created records with IDs
   */
  static async bulkCreate(records) {
    const ids = await db('metadata').insert(records);
    return Promise.all(ids.map((id) => this.findById(id)));
  }

  /**
   * Export metadata to JSON
   * @param {Array<number>} documentIds - Document IDs to export
   * @returns {Promise<Array>} Metadata records in JSON format
   */
  static async exportToJSON(documentIds = null) {
    let query = db('metadata');

    if (documentIds && documentIds.length > 0) {
      query = query.whereIn('document_id', documentIds);
    }

    return query.select('*');
  }
}

module.exports = MetadataRepository;
