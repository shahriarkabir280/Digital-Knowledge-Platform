/**
 * Migration: Upgrade metadata table to support 20+ fields
 * Purpose: Extend metadata table with rich fields per SRS FR-DKP-004
 * 
 * Metadata Fields (20+ per specification):
 * - Document association: document_id (FK)
 * - Authorship: author, contributors, editor
 * - Content info: abstract, description, keywords, tags, language
 * - Publication: publisher, publication_date, isbn, issn, doi
 * - Classification: subject, classification, field_of_study
 * - Rights: copyright_holder, license, rights_statement
 * - Source: institution, department, source_url
 * - Audit: created_at, updated_at
 */

exports.up = async function (knex) {
  // Check if metadata table already exists
  const tableExists = await knex.schema.hasTable('metadata');

  if (tableExists) {
    // Check if columns already exist to make migration idempotent
    const hasAuthorColumn = await knex.schema.hasColumn('metadata', 'author');

    if (!hasAuthorColumn) {
      // Alter existing table to add new columns
      await knex.schema.alterTable('metadata', (table) => {
        // Authorship fields
        table.string('author', 500); // Primary author
        table.specificType('contributors', 'jsonb').defaultTo(knex.raw("'[]'::jsonb")); // Array of additional authors/contributors
        table.string('editor', 500); // Editor name

        // Content description fields
        table.text('abstract'); // Brief summary
        table.text('description'); // Longer description
        // keywords and tags will be modified below
        table.specificType('tags', 'jsonb').defaultTo(knex.raw("'[]'::jsonb")); // Additional tags as JSON array

        // Language information
        table.string('language', 20).defaultTo('en'); // Language code: en, bn, etc.
        table.string('original_language', 20); // Original language if translated

        // Publication information
        table.string('publisher', 255);
        table.date('publication_date');
        table.string('isbn', 20); // International Standard Book Number
        table.string('issn', 9); // International Standard Serial Number
        table.string('doi', 255); // Digital Object Identifier

        // Classification and subject
        table.string('subject', 255); // Subject area
        table.string('classification', 100); // Dewey Decimal, UDC, etc.
        table.string('field_of_study', 255); // Academic field

        // Rights and licensing
        table.string('copyright_holder', 300);
        table.string('license', 100); // CC-BY, CC-BY-SA, proprietary, etc.
        table.text('rights_statement'); // Detailed rights information

        // Source and institutional information
        table.string('institution', 300); // Institution name
        table.string('department', 255); // Department/Faculty
        table.string('source_url', 500); // Original source URL if available
      });

      console.log('✓ Extended metadata table with 20+ rich metadata fields');
    } else {
      console.log('✓ Metadata table already has new columns, skipping');
    }
  } else {
    // Create new metadata table with full schema (fallback for fresh DB)
    await knex.schema.createTable('metadata', (table) => {
      // Primary key
      table.increments('id').primary();

      // Foreign key to documents (one-to-one)
      table.integer('document_id').unsigned().notNullable().unique();
      table.foreign('document_id').references('documents.id').onDelete('CASCADE');

      // Authorship fields
      table.string('author', 500); // Primary author
      table.specificType('contributors', 'jsonb').defaultTo(knex.raw("'[]'::jsonb")); // Array of additional authors/contributors
      table.string('editor', 500); // Editor name

      // Content description fields
      table.text('abstract'); // Brief summary
      table.text('description'); // Longer description
      table.text('keywords'); // Comma-separated or stored as JSON array
      table.specificType('tags', 'jsonb').defaultTo(knex.raw("'[]'::jsonb")); // Additional tags as JSON array

      // Language information
      table.string('language', 20).defaultTo('en'); // Language code: en, bn, etc.
      table.string('original_language', 20); // Original language if translated

      // Publication information
      table.string('publisher', 255);
      table.date('publication_date');
      table.string('isbn', 20); // International Standard Book Number
      table.string('issn', 9); // International Standard Serial Number
      table.string('doi', 255); // Digital Object Identifier

      // Classification and subject
      table.string('subject', 255); // Subject area
      table.string('classification', 100); // Dewey Decimal, UDC, etc.
      table.string('field_of_study', 255); // Academic field

      // Rights and licensing
      table.string('copyright_holder', 300);
      table.string('license', 100); // CC-BY, CC-BY-SA, proprietary, etc.
      table.text('rights_statement'); // Detailed rights information

      // Source and institutional information
      table.string('institution', 300); // Institution name
      table.string('department', 255); // Department/Faculty
      table.string('source_url', 500); // Original source URL if available

      // Audit timestamps
      table.timestamps(true, true); // created_at, updated_at with CURRENT_TIMESTAMP
    });

    console.log('✓ Created metadata table with 20+ fields');
  }
};

exports.down = async function (knex) {
  // For rollback on existing table, drop all new columns
  const tableExists = await knex.schema.hasTable('metadata');

  if (tableExists) {
    const hasAuthorColumn = await knex.schema.hasColumn('metadata', 'author');

    if (hasAuthorColumn) {
      // Drop new columns added by this migration
      await knex.schema.alterTable('metadata', (table) => {
        table.dropColumn('author');
        table.dropColumn('contributors');
        table.dropColumn('editor');
        table.dropColumn('abstract');
        table.dropColumn('description');
        table.dropColumn('tags');
        table.dropColumn('language');
        table.dropColumn('original_language');
        table.dropColumn('publisher');
        table.dropColumn('publication_date');
        table.dropColumn('isbn');
        table.dropColumn('issn');
        table.dropColumn('doi');
        table.dropColumn('subject');
        table.dropColumn('classification');
        table.dropColumn('field_of_study');
        table.dropColumn('copyright_holder');
        table.dropColumn('license');
        table.dropColumn('rights_statement');
        table.dropColumn('institution');
        table.dropColumn('department');
        table.dropColumn('source_url');
      });

      console.log('✓ Rolled back metadata table columns');
    }
  }
};

