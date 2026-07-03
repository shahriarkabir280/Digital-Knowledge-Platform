const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const db = require('../db');
const { findResourceById } = require('../modules/documents/resourceStorage');

const STOP_WORDS = new Set([
  'the', 'of', 'and', 'to', 'in', 'is', 'for', 'that', 'on', 'with', 'as', 'by', 'an', 'at', 'this', 'from', 'it', 'which', 'or', 'be', 'are', 'was', 'were', 'has', 'have', 'had', 'been', 'but', 'not', 'we', 'they', 'our', 'their', 'more', 'about', 'can', 'will', 'would', 'should', 'other', 'some', 'than', 'into', 'its', 'these', 'those', 'also', 'such', 'only', 'new', 'first', 'two', 'has', 'more', 'how', 'any', 'who', 'very', 'many'
]);

const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Information Science and Library Management',
  'Electrical and Electronic Engineering',
  'Genetic Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Business Administration'
];

/**
 * Extracts raw text from a document buffer based on file extension.
 * @param {Buffer} buffer - File buffer
 * @param {string} ext - File extension (without dot)
 * @returns {Promise<string>} Extracted text or empty string
 */
async function extractTextFromBuffer(buffer, ext) {
  const normalizedExt = ext.toLowerCase();
  try {
    if (normalizedExt === 'pdf') {
      const parsed = await pdfParse(buffer);
      return parsed.text || '';
    } else if (normalizedExt === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }
  } catch (err) {
    console.error(`[MetadataExtractionService] Failed to extract text for .${ext}:`, err.message);
  }
  return '';
}

/**
 * Extracts metadata fields locally from raw text and filename using heuristics.
 * @param {string} text - Raw text from document
 * @param {string} filename - Original filename
 * @returns {Object} Extracted metadata fields
 */
function extractMetadataLocally(text, filename) {
  // Clean filename to use as fallback title
  const cleanFilename = filename
    ? filename
        .replace(/\.[^.]+$/, '') // remove extension
        .replace(/[\-_]/g, ' ')  // replace hyphens/underscores
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  const fallbackTitle = cleanFilename
    ? cleanFilename.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : 'Untitled Resource';

  if (!text || text.trim().length === 0) {
    return {
      title: fallbackTitle,
      author: null,
      abstract: '',
      keywords: [],
      language: 'English',
      published_year: new Date().getFullYear(),
      department: null,
      resourceCategory: null
    };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const first1000Chars = text.slice(0, 1000);
  const first3000Chars = text.slice(0, 3000);

  // 1. Title Heuristics
  let title = fallbackTitle;
  // Look at the first 5 lines for a candidate title
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    // Candidate title should be between 10 and 120 characters, not contain dates or author keywords
    if (
      line.length >= 10 &&
      line.length <= 120 &&
      !/^(page|isbn|volume|author|date|published|abstract|introduction|http)/i.test(line) &&
      !/\d{4}/.test(line)
    ) {
      title = line;
      break;
    }
  }

  // 2. Author Heuristics
  let author = null;
  const authorRegex = /(?:author|by|creator)s?\s*:\s*([A-Z][a-zA-Z.\s]{3,40})/i;
  const authorMatch = first1000Chars.match(authorRegex);
  if (authorMatch) {
    author = authorMatch[1].trim();
  } else {
    // Check if the 2nd or 3rd line looks like an author name (2-3 words, capitalized)
    for (let i = 1; i < Math.min(lines.length, 4); i++) {
      const line = lines[i];
      if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(line) && !/^(abstract|introduction|keywords|contents)/i.test(line)) {
        author = line;
        break;
      }
    }
  }

  // 3. Abstract / Description Heuristics
  let abstract = '';
  const abstractRegex = /(?:abstract|summary|description|introduction)\s*:?\s*([\s\S]{50,1000})/i;
  const abstractMatch = first3000Chars.match(abstractRegex);
  if (abstractMatch) {
    const matchedText = abstractMatch[1].trim();
    // Split by double newline or next heading to get the abstract paragraph
    const paragraphs = matchedText.split(/\n\s*\n|\r\n\s*\r\n/);
    abstract = paragraphs[0].slice(0, 500).trim();
  }
  if (!abstract || abstract.length < 30) {
    // Fallback to the first 300 characters of the document text
    abstract = text.slice(0, 300).replace(/\s+/g, ' ').trim() + '...';
  }

  // 4. Keywords Heuristics
  let keywords = [];
  const keywordsRegex = /(?:keywords|key\s*words|tags)\s*:\s*([^\n]+)/i;
  const keywordsMatch = first3000Chars.match(keywordsRegex);
  if (keywordsMatch) {
    keywords = keywordsMatch[1]
      .split(/[,;]/)
      .map(k => k.trim())
      .filter(k => k.length > 1)
      .slice(0, 5);
  }

  if (keywords.length === 0) {
    // Fallback: extract the most frequent words (longer than 4 chars, not stop words)
    const words = text
      .toLowerCase()
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOP_WORDS.has(w));
    
    const freqs = {};
    words.forEach(w => freqs[w] = (freqs[w] || 0) + 1);
    
    keywords = Object.keys(freqs)
      .sort((a, b) => freqs[b] - freqs[a])
      .slice(0, 5);
  }

  // 5. Published Year Heuristics
  let publishedYear = new Date().getFullYear();
  // Look for 4-digit years between 1900 and currentYear + 1
  const yearMatches = first1000Chars.match(/\b(19\d\d|20[0-2]\d)\b/g);
  if (yearMatches && yearMatches.length > 0) {
    // Prefer the first year matched
    publishedYear = parseInt(yearMatches[0], 10);
  }

  // 6. Department Heuristics
  let department = null;
  for (const dept of DEPARTMENTS) {
    const escaped = dept.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    if (regex.test(first3000Chars)) {
      department = dept;
      break;
    }
  }
  // Short matches
  if (!department) {
    if (/\bCSE\b/i.test(first3000Chars)) department = 'Computer Science and Engineering';
    else if (/\bEEE\b/i.test(first3000Chars)) department = 'Electrical and Electronic Engineering';
    else if (/\bGEB\b/i.test(first3000Chars)) department = 'Genetic Engineering';
  }

  // 7. Language Heuristics
  // Check for Bengali characters
  const hasBengali = /[\u0980-\u09FF]/.test(text.slice(0, 2000));
  const language = hasBengali ? 'Bangla' : 'English';

  // 8. Resource Category Heuristics
  let resourceCategory = null;
  const textSample = first3000Chars.toLowerCase();
  if (textSample.includes('thesis') || textSample.includes('dissertation')) {
    resourceCategory = 'thesis';
  } else if (textSample.includes('slide') || textSample.includes('lecture slides') || textSample.includes('powerpoint')) {
    resourceCategory = 'lecture-slides';
  } else if (textSample.includes('lab manual') || textSample.includes('experiment')) {
    resourceCategory = 'lab-manual';
  } else if (textSample.includes('lab report')) {
    resourceCategory = 'lab-report';
  } else if (textSample.includes('assignment') || textSample.includes('homework')) {
    resourceCategory = 'assignment';
  } else if (textSample.includes('exam') || textSample.includes('quiz') || textSample.includes('question bank')) {
    resourceCategory = 'question-bank';
  } else if (textSample.includes('research paper') || textSample.includes('journal') || textSample.includes('proceedings')) {
    resourceCategory = 'research-paper';
  }

  return {
    title,
    author,
    abstract,
    keywords,
    language,
    published_year: publishedYear,
    department,
    resourceCategory
  };
}

/**
 * Extracts text from document buffer and runs heuristics to save metadata back to DB.
 * @param {number} resourceId - Document / Resource ID
 * @param {Buffer} buffer - File buffer
 * @param {string} ext - File extension (without dot)
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} The extracted metadata fields
 */
async function extractAndSaveMetadata(resourceId, buffer, ext, filename) {
  try {
    console.log(`[MetadataExtractionService] Starting extraction for resource #${resourceId} (${filename})...`);
    const text = await extractTextFromBuffer(buffer, ext);
    const metadata = extractMetadataLocally(text, filename);
    console.log(`[MetadataExtractionService] Extracted metadata:`, JSON.stringify(metadata, null, 2));

    const resourceLookup = await findResourceById(resourceId);
    if (!resourceLookup) {
      console.warn(`[MetadataExtractionService] Resource #${resourceId} not found in database.`);
      return metadata;
    }

    const { table } = resourceLookup;

    // Build the fields to update directly on the resource table
    const updates = {
      title: metadata.title,
      author: metadata.author || 'Unknown',
      abstract: metadata.abstract || '',
      keywords: JSON.stringify(metadata.keywords),
      language: metadata.language,
      published_year: metadata.published_year,
      updated_at: db.fn.now()
    };

    if (metadata.department) {
      updates.department = metadata.department;
    }

    if (metadata.resourceCategory) {
      updates.resource_type = metadata.resourceCategory;
    }

    console.log(`[MetadataExtractionService] Updating table ${table} with extracted metadata.`);
    await db(table).where({ id: resourceId }).update(updates);
    console.log(`[MetadataExtractionService] Successfully auto-extracted and stored metadata.`);

    return metadata;
  } catch (error) {
    console.error(`[MetadataExtractionService] Error in extractAndSaveMetadata:`, error);
  }
  return null;
}

module.exports = {
  extractTextFromBuffer,
  extractMetadataLocally,
  extractAndSaveMetadata
};
