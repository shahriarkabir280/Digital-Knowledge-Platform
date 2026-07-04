const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const db = require('../db');
const { findResourceById } = require('../modules/documents/resourceStorage');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://python-service:8000';

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
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text || '';
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
  // Expand very long lines (common in pdfjs-dist where items join into one line)
  const expandedLines = [];
  for (const line of lines) {
    if (line.length > 400) {
      // Multi-level split: sentences, then author/affiliation boundaries
      let parts = line.split(/(?<=[.!?])(?<![A-Z]\.)\s+(?=[A-Z0-9"'(])/);
      const result = [];
      for (const part of parts) {
        if (part.length > 80) {
          // Split on comma+space before capitalized names (author boundaries)
          // Handles middle initials (M. M.) and hyphenated names (Hans-Peter)
          const sub = part.split(/(?:,\s*)(?=[A-Z][a-zA-Z.\u00C0-\u024F-]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-zA-Z.\u00C0-\u024F-]+\s*(?:,|$|Institute|University|Department|College|School|Laboratory|Lab|Proc\.))/);
          for (const s of sub) {
            if (s.length > 150) {
              // Further split on affiliation markers
              const sub2 = s.split(/\s+(?=(?:Institute|Department|University|College|School|Laboratory|Lab|Proc\.|phone:|email:|http))/);
              result.push(...sub2);
            } else {
              result.push(s);
            }
          }
        } else {
          result.push(part);
        }
      }
      expandedLines.push(...result.map(p => p.trim()).filter(p => p.length > 0));
    } else {
      expandedLines.push(line);
    }
  }
  if (expandedLines.length > lines.length) {
    // Replace lines with expanded version for better title/author detection
    lines.length = 0;
    lines.push(...expandedLines);
  }
  const first1000Chars = text.slice(0, 1000);
  const first3000Chars = text.slice(0, 3000);

  let abstractMerged = false;
  // Find the abstract heading — first standalone, then merged with body text
  let abstractHeadingIdx = lines.findIndex(l => {
    const stripped = l.replace(/^[\d\s\.\#\*\+†‡§¶\-—]+/, '').trim();
    return /^(abstract|summary|executive summary)\s*:?\s*$/i.test(stripped);
  });
  if (abstractHeadingIdx < 0) {
    // "Abstract" at start of line merged with body text (first 5 lines)
    abstractHeadingIdx = lines.findIndex((l, i) => {
      if (i >= 5) return false;
      return /^(abstract|summary|executive summary)\s/i.test(l.trim()) && l.trim().length > 12;
    });
    if (abstractHeadingIdx >= 0) abstractMerged = true;
  }
  // Lines to search for title
  const preAbstractLines = abstractHeadingIdx >= 3
    ? lines.slice(0, abstractHeadingIdx)
    : abstractHeadingIdx >= 0
      ? lines.slice(0, Math.min(lines.length, 250))
      : lines.slice(0, Math.min(lines.length, 15));
  // Lines after title, before abstract (author region)
  const authorRegion = abstractHeadingIdx >= 0
    ? preAbstractLines
    : lines.slice(0, Math.min(lines.length, 12));

  // 1. Title Heuristics — search only in pre-abstract region
  let title = fallbackTitle;
  const nonTitleStart = /^(page|isbn|volume|issn|doi|arxiv|abstract|introduction|keywords|references|conclusion|acknowledgements|appendix|figure|table|contents|chapter|http|https|www\.|email|corresponding)/i;
  const sectionHeading = /^(abstract|introduction|keywords|references|conclusion|acknowledgements|appendix|methodology|results|discussion|related work(?!\s+(?:on|in|by|to))|background|literature review|method|experiment|proposed)/i;

  let bestScore = -10;
  let bestTitle = null;

  const maxHeadLines = abstractHeadingIdx >= 0 && abstractHeadingIdx < 3 ? 200 : 15;
  for (let i = 0; i < Math.min(preAbstractLines.length, maxHeadLines); i++) {
    let raw = preAbstractLines[i];
    const startsWithDigit = /^\d/.test(raw);
    raw = raw.replace(/^(title|paper|topic|report|article|research)\s*:\s*/i, '').trim();
    const cleaned = raw.replace(/^[\d\s\.\#\*\+†‡§¶\-—·•●]+/, '').trim();
    if (cleaned.length < 5 || cleaned.length > 200) continue;
    if (nonTitleStart.test(cleaned)) continue;
    if (sectionHeading.test(cleaned)) continue;
    if (/^[\d\s\-—_]+$/.test(cleaned)) continue;
    if (/^---\s/.test(cleaned)) continue;
    if (/^[\w.-]+@[\w.-]+\.\w+/.test(cleaned)) continue;
    if (/^https?:\/\//i.test(cleaned)) continue;
    // Skip single words or just punctuation
    if (!/\s/.test(cleaned) && cleaned.length < 8) continue;

    // Strip trailing author name from title (e.g., "...Structure Mihael Ankerst")
    let baseCleaned = cleaned;
    const trailingAuthor = cleaned.match(/^(.+?[:\u2013\u2014].{10,90}?)\s+[A-Z][a-zA-Z.'-]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-zA-Z.'-]+[.,;]?$/);
    if (trailingAuthor) baseCleaned = trailingAuthor[1].trim();
    // Strip common non-title prefixes (e.g., "Related work on OPTICS:" → "OPTICS:")
    baseCleaned = baseCleaned.replace(/^(related work on|the rest of the paper|work on|as follows|the paper|this paper)\s*/i, '').trim();

    let score = 0;
    if (startsWithDigit) score -= 2;
    if (/^[A-Z]/.test(baseCleaned)) score += 5;
    if (/\s/.test(baseCleaned)) score += 4;
    if (baseCleaned.length > 25) score += 4;
    else if (baseCleaned.length > 15) score += 2;
    if (!/\.$/.test(baseCleaned)) score += 1;
    if (baseCleaned === baseCleaned.toLowerCase()) score -= 5;
    if (i === 0) score += 2;
    else if (i === 1) score += 1;
    if (/\b(authors?|by|keywords|corresponding)\s*:/i.test(baseCleaned)) score -= 10;
    // Penalize generic headers
    if (/^(first|second|third|next|last|page|line|section|part|introduction)\b/i.test(baseCleaned)) score -= 5;
    // Penalize all-caps journal/conference names
    if (baseCleaned === baseCleaned.toUpperCase() && (/\b(CONFERENCE|PROCEEDINGS|JOURNAL|WORKSHOP|SYMPOSIUM|TRANSACTIONS)\b/i.test(baseCleaned))) score -= 8;

    // Penalize lines that are clearly author lists (3+ comma-separated capitalized names)
    const nameCount = (baseCleaned.match(/,\s*[A-Z][a-zA-Z.\-]+\s+[A-Z][a-zA-Z.\-]+/g) || []).length;
    if (nameCount >= 2) score -= 12;

    // Penalty for body-text indicators
    if (/[;.!?]$/.test(baseCleaned)) score -= 3;
    if (/^(however|therefore|thus|hence|furthermore|moreover|consequently|nevertheless|additionally|meanwhile|in addition|on the other hand|as a result|for example|for instance|related work|the rest|work on|as follows|the paper|this paper|we present|we propose|we introduce|we describe|in this)\b/i.test(baseCleaned)) score -= 8;
    // Bonus for colon/m-dash (academic subtitle)
    if (/\s*[:\u2013\u2014]\s*[A-Z]/.test(baseCleaned)) score += 6;
    // Bonus for uppercase acronyms
    if (/[A-Z]{2,}/.test(baseCleaned)) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestTitle = baseCleaned;
    }
  }
  title = bestTitle || fallbackTitle;
  // If still fallback, use first decent line from pre-abstract region
  if (title === fallbackTitle) {
    const fallback = preAbstractLines.find(l => {
      const c = l.replace(/^[\d\s\.\#\*\+†‡§¶\-—·•●]+/, '').trim();
      return c.length >= 8 && /\s/.test(c) && /^[A-Z]/.test(c);
    });
    if (fallback) title = fallback.replace(/^[\d\s\.\#\*\+†‡§¶\-—·•●]+/, '').trim();
  }

  // Second pass: search the last 50 lines for a better title candidate
  if (title === fallbackTitle || lines.length > 20) {
    const tailStart = Math.max(0, lines.length - 50);
    let tailBestScore = -10;
    let tailBestTitle = null;
    for (let i = tailStart; i < lines.length; i++) {
      const raw = lines[i].replace(/^(title|paper|topic|report|article|research)\s*:\s*/i, '').trim();
      let cleaned = raw.replace(/^[\d\s\.\#\*\+†‡§¶\-—·•●]+/, '').trim();
      if (cleaned.length < 5 || cleaned.length > 200) continue;
      if (nonTitleStart.test(cleaned)) continue;
      if (sectionHeading.test(cleaned)) continue;
      if (/^[\d\s\-—_]+$/.test(cleaned)) continue;
      if (/^[\w.-]+@[\w.-]+\.\w+/.test(cleaned)) continue;
      if (/^https?:\/\//i.test(cleaned)) continue;
      if (!/\s/.test(cleaned) && cleaned.length < 8) continue;

      // Strip trailing author names if the line has both title and authors
      const authorSuffixMatch = cleaned.match(/^(.+?[:\u2013\u2014].{5,90}?)(\s+[A-Z][a-zA-Z.\-]+\s+[A-Z][a-zA-Z.\-]+,.*)$/);
      if (authorSuffixMatch) cleaned = authorSuffixMatch[1].trim();

      let score = 0;
      if (/^[A-Z]/.test(cleaned)) score += 5;
      if (/\s/.test(cleaned)) score += 4;
      if (cleaned.length > 25) score += 4;
      else if (cleaned.length > 15) score += 2;
      if (!/\.$/.test(cleaned)) score += 1;
      if (cleaned === cleaned.toLowerCase()) score -= 5;
      if (/\s*[:\u2013\u2014]\s*[A-Z]/.test(cleaned)) score += 6;
      if (/['’]\w{2,}\b/.test(cleaned)) score += 2;
      if (/[A-Z]{2,}/.test(cleaned)) score += 2;
      if (/(?:et\s+al\.?|pp\.?\s*\d+)/i.test(cleaned)) score -= 8;
      if (/^\d+\s/.test(cleaned)) score -= 3;
      if (cleaned.split(/\s+/).length > 10) score += 3;
      // Penalize lines that are clearly author lists (3+ comma-separated capitalized names)
      const tailNameCount = (cleaned.match(/,\s*[A-Z][a-zA-Z.\-]+\s+[A-Z][a-zA-Z.\-]+/g) || []).length;
      if (tailNameCount >= 2) score -= 12;

      if (score > tailBestScore) {
        tailBestScore = score;
        tailBestTitle = cleaned;
      }
    }
    // Only override if tail found a higher scoring candidate
    if (tailBestTitle && tailBestScore > bestScore) {
      title = tailBestTitle;
    }
  }

  // 2. Author Heuristics — search in authorRegion, skipping the title line
  let author = null;
  const titleIdx = preAbstractLines.findIndex(l => {
    const cleaned = l.replace(/^[\d\s\.\#\*\+†‡§¶\-—·•●]+/, '').trim();
    return cleaned.includes(title) || title.includes(cleaned);
  });
  const authorStartIdx = titleIdx >= 0 ? titleIdx + 1 : 0;
  const authorEndIdx = Math.min(authorRegion.length, authorStartIdx + 8);

  const nameChar = '[A-Za-z\u00C0-\u024F\'.\u2013-]';
  const authorPattern = new RegExp('^[A-Z\u00C0-\u024F]' + nameChar + '+(?:(?:\\s|,\\s*)[A-Z\u00C0-\u024F]' + nameChar + '+)*(?:\\s*(?:and|&)\\s*[A-Z\u00C0-\u024F]' + nameChar + '+(?:(?:\\s|,\\s*)[A-Z\u00C0-\u024F]' + nameChar + '+)*)*$');

  const authorNames = [];
  for (let i = authorStartIdx; i < authorEndIdx; i++) {
    const line = authorRegion[i];
    const cleaned = line.replace(/[\d\*†‡§¶\u00B9-\u00BE\u2070-\u209F\u2122]+/g, '').replace(/\s{2,}/g, ' ').trim();
    if (cleaned.length < 6 || cleaned.length > 200) continue;
    if (/^(abstract|introduction|keywords|references|conclusion|acknowledgements|appendix|methodology|results|discussion|department|university|college|school|institute|laboratory|lab|email|http|www\.|corresponding)/i.test(cleaned)) continue;
    if (/^[\d\s\-—_]+$/.test(cleaned)) continue;
    if (/^---\s/.test(cleaned)) continue;
    if (authorPattern.test(cleaned)) {
      authorNames.push(cleaned);
    } else if (authorNames.length > 0) {
      break;
    }
  }
  if (authorNames.length > 0) {
    author = authorNames.join(', ');
  }

  // Fallback: extract from the title source line + nearby lines (covers stripped trailing names)
  if (titleIdx >= 0) {
    const collected = [];
    // First, extract after-title text from the title line itself
    const titleLineText = authorRegion[titleIdx];
    const titlePos = titleLineText ? titleLineText.indexOf(title) : -1;
    if (titlePos >= 0) {
      const afterTitle = titleLineText.substring(titlePos + title.length).trim();
      // Strip institution markers to get pure author names
      const stripped = afterTitle.replace(/\s+(Institute|University|Department|College|School|Laboratory|Lab|Proc\.).*/i, '').trim();
      if (stripped) collected.push(stripped);
    }
    // Then scan subsequent lines for more author names
    for (let i = titleIdx + 1; i < Math.min(titleIdx + 8, authorRegion.length); i++) {
      const text = authorRegion[i];
      const block = text.replace(/\s+(Institute|University|Department|College|School|Laboratory|Lab|Proc\.).*/i, '').trim();
      if (block) collected.push(block);
    }
    // Flatten all collected text into one, split on commas, validate as names
    const allText = collected.join(', ');
    const names = allText.split(/,\s*/).filter(n => {
      const t = n.trim();
      if (!t) return false;
      if (!/^[A-Z\u00C0-\u024F][a-zA-Z.\u00C0-\u024F'-]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-zA-Z.\u00C0-\u024F'-]+$/.test(t)) return false;
      if (/^(institute|university|department|college|school|laboratory|lab)/i.test(t)) return false;
      const words = t.split(/\s+/);
      if (words.length < 2) return false;
      // Filter out location/state abbreviations (e.g., "Philadelphia PA")
      if (/^(PA|NY|CA|TX|FL|IL|OH|GA|NC|MI|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|IA|MS|KS|AR|UT|NV|NM|NE|WV|ID|HI|ME|NH|MT|RI|DE|SD|ND|VT|AK|WY|DC)$/.test(words[words.length - 1])) return false;
      return true;
    });
    const unique = [...new Set(names)];
    if (unique.length > 0) {
      author = unique.join(', ');
    }
  }

  // Fallback: labeled "Author(s):" or "by" line (single-line only)
  if (!author) {
    const labeledLine = lines.find(l => /^(?:author|by|creator)s?\s*:/i.test(l));
    if (labeledLine) {
      const m = labeledLine.match(/^(?:author|by|creator)s?\s*:?\s*([A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F.\s,&\-]{3,80})/i);
      if (m) author = m[1].trim();
    }
  }

  // Fallback: search near the end of the document for author lines
  if (!author && lines.length > 5) {
    const tailStart = Math.max(0, lines.length - 40);
    const nameChar = '[A-Za-z\u00C0-\u024F\'.\\-]';
    const authorNamePattern = new RegExp('^[A-Z\u00C0-\u024F]' + nameChar + '+(?:\\s+[A-Z\u00C0-\u024F]' + nameChar + '*)*\\s+[A-Z\u00C0-\u024F]' + nameChar + '+$');
    const bannedNameWords = /^(department|institute|university|college|school|laboratory|lab|data|bases|database|conference|proceedings|journal|transaction|symposium|workshop|international|national|association|society|center|centre|group|division|section|committee|publisher|press|book|series|volume|issue|number|pages|springer|elsevier|acm|ieee|proc|proceeding|oettingenstr)/i;
    for (let i = tailStart; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^\[?\d+\]/.test(line)) continue;
      if (/@|http|www\./i.test(line)) continue;
      if (/^(abstract|introduction|keywords|references|conclusion|acknowledgements|appendix|methodology|results|discussion|figure|table)/i.test(line)) continue;
      const cleaned = line.replace(/[\d\*†‡§¶\u00B9-\u00BE\u2070-\u209F\u2122]+/g, '').replace(/\s{2,}/g, ' ').trim();
      const authorNames = cleaned.split(/\s+(?:and|&)\s+|,\s*/).filter(n => {
        const t = n.trim();
        if (!authorNamePattern.test(t)) return false;
        if (t.split(/\s+/).some(w => bannedNameWords.test(w))) return false;
        return true;
      });
      if (authorNames.length >= 2) {
        author = cleaned;
        break;
      }
    }
  }

  // 3. Abstract / Description Heuristics
  let abstract = '';
  // Use heading index for reliable extraction when available
  if (abstractHeadingIdx >= 0) {
    const abstractLines = [];
    let startIdx = abstractHeadingIdx + 1;
    if (abstractMerged) {
      const mergedText = lines[abstractHeadingIdx].replace(/^(abstract|summary|executive summary)\s*:?\s*/i, '').trim();
      if (mergedText) abstractLines.push(mergedText);
      startIdx = abstractHeadingIdx + 1;
    }
    for (let j = startIdx; j < Math.min(lines.length, abstractHeadingIdx + 15); j++) {
      const ln = lines[j];
      if (/^(introduction|keywords|references|conclusion|acknowledgements|methodology|results|discussion|related work|background)/i.test(ln)) break;
      if (/^[\d\s\.\#\*\+†‡§¶\-—]+$/.test(ln)) continue;
      abstractLines.push(ln);
    }
    if (abstractLines.length > 0) {
      abstract = abstractLines.join(' ').slice(0, 1200).replace(/\s+(?![\s\S]*\.)[^.]+$/, '').trim();
    }
  }
  if (!abstract || abstract.length < 20) {
    const abstractRegex = /(?:abstract|summary)\s*:?\s*([\s\S]{50,1200})/i;
    const abstractMatch = first3000Chars.match(abstractRegex);
    if (abstractMatch) {
      abstract = abstractMatch[1].trim().split(/\n\s*\n|\r\n\s*\r\n/)[0].slice(0, 1200).replace(/\s+(?![\s\S]*\.)[^.]+$/, '').trim();
    }
  }
  if (!abstract || abstract.length < 20) {
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

  // Last resort: flat-text regex fallback for pdfjs-dist output (one long line)
  if (!title || title === 'Untitled Resource') {
    const flatRegex = /([A-Z][A-Za-z\u00C0-\u024F\s]+:\s*[A-Z][A-Za-z\u00C0-\u024F\s,()'\u2013\u2014-]+?)\s+([A-Z][a-zA-Z.'-]+\s+[A-Z][a-zA-Z.'-]+(?:,\s*[A-Z][a-zA-Z.'-]+\s+[A-Z][a-zA-Z.'-]+)*(?:\s+(?:and|&)\s+[A-Z][a-zA-Z.'-]+\s+[A-Z][a-zA-Z.'-]+)?)\s+(Institute|University|Department|School|College|Laboratory|Lab|Proc\.)/;
    const m = text.match(flatRegex);
    if (m) {
      const candidate = m[1].trim();
      if (!/^(abstract|introduction|keywords|references|conclusion|acknowledgements|page|http)/i.test(candidate) && candidate.length > 10) {
        title = candidate;
        if (!author) author = m[2].trim();
      }
    }
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
 * Calls the Python microservice to extract metadata from raw text.
 * Falls back to null if the service is unavailable.
 */
async function extractWithPythonService(text) {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[MetadataExtractionService] Python service returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.success) {
      console.warn(`[MetadataExtractionService] Python service extraction failed: ${data.error}`);
      return null;
    }

    return {
      title: data.title,
      author: data.author,
      abstract: data.abstract,
      keywords: data.keywords || [],
      language: null,
      published_year: null,
      department: data.department,
      resourceCategory: null,
      _source: 'python-service',
    };
  } catch (error) {
    console.warn(`[MetadataExtractionService] Python service unavailable: ${error.message}`);
    return null;
  }
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

    // Try Python service first, fall back to local heuristics
    let metadata = await extractWithPythonService(text);
    if (!metadata) {
      metadata = extractMetadataLocally(text, filename);
      metadata._source = 'local-heuristics';
    }
    console.log(`[MetadataExtractionService] Extracted metadata (source=${metadata._source}):`, JSON.stringify(metadata, null, 2));

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
  extractWithPythonService,
  extractAndSaveMetadata
};
