/**
 * Metadata Extractor
 * Extracts text content from uploaded PDF documents using pdfjs-dist,
 * then uses Google Gemini API to intelligently determine title, author,
 * summary, and keywords from the document text.
 *
 * Approach:
 * 1. Extract raw text from the first few pages of the PDF using pdfjs-dist
 * 2. Send the extracted text to Gemini API with a structured extraction prompt
 * 3. Parse the JSON response to get clean title, author, summary, and keywords
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set worker source from the installed package (bundled correctly with Vite)
GlobalWorkerOptions.workerSrc = pdfjsWorker

const MAX_PAGES_TO_SCAN = 3
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

const EXTRACTION_PROMPT = `You are a document metadata extraction expert. Analyze the following academic document text and extract these fields:

1. title: The document title (the main title, not a section heading or journal name)
2. author: The author(s) name(s) — include all authors if multiple
3. summary: A brief abstract or summary of the document content (2-3 sentences max)
4. keywords: Relevant keywords or subject terms as a comma-separated string

Rules:
- Return ONLY a valid JSON object with these exact keys: title, author, summary, keywords
- If you cannot determine a field, use null (not an empty string)
- Do NOT include any text outside the JSON object
- The JSON must be parseable

The text below is from the beginning of the document (first 3 pages). Extract metadata from this content:

`

/**
 * Main entry: extract metadata from an uploaded file
 * Uses Gemini API for AI-powered extraction when available,
 * falls back gracefully for non-PDF files.
 *
 * @param {File} file - The uploaded file
 * @returns {Promise<{title: string|null, author: string|null, summary: string|null, tags: string|null, success: boolean, error: string|null}>}
 */
export async function extractFileMetadata(file) {
  if (!file) {
    return { title: null, author: null, summary: null, tags: null, success: false, error: null }
  }

  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'pdf') {
    return extractPDFMetadata(file)
  }

  return { title: null, author: null, summary: null, tags: null, success: false, error: null }
}

/**
 * Extract text from PDF and send to Gemini for metadata extraction
 */
async function extractPDFMetadata(file) {
  try {
    // Step 1: Extract text from PDF using pdfjs-dist
    const extractedText = await extractTextFromPDF(file)

    if (!extractedText || extractedText.trim().length < 20) {
      return { title: null, author: null, summary: null, tags: null, success: false, error: 'Could not extract enough text from this PDF (it may be a scanned document).' }
    }

    // Step 2: Send to Gemini API for intelligent extraction
    const metadata = await extractWithGemini(extractedText)

    if (!metadata.success) {
      return {
        title: null,
        author: null,
        summary: null,
        tags: null,
        success: false,
        error: metadata.error || 'AI extraction failed.',
      }
    }

    // Step 3: Convert keywords (comma-separated string) to tag format
    const tags = metadata.keywords
      ? metadata.keywords
          .split(/[,;]/)
          .map(t => t.trim())
          .filter(Boolean)
          .join(', ')
      : null

    return {
      title: metadata.title || null,
      author: metadata.author || null,
      summary: metadata.summary || null,
      tags,
      success: true,
      error: null,
    }
  } catch (err) {
    return { title: null, author: null, summary: null, tags: null, success: false, error: 'AI extraction encountered an unexpected error.' }
  }
}

/**
 * Extract raw text content from the first N pages of a PDF
 */
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise

  const pagesToRead = Math.min(pdf.numPages, MAX_PAGES_TO_SCAN)
  const texts = []

  for (let i = 1; i <= pagesToRead; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()

    // Reconstruct text in reading order with spaces between items
    const pageText = textContent.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s{3,}/g, '\n')  // Large gaps → line breaks
      .replace(/\s+/g, ' ')       // Collapse whitespace

    texts.push(pageText)
  }

  return texts.join('\n\n--- Page Break ---\n\n')
}

/**
 * Send extracted text to Gemini API and parse the JSON response
 */
async function extractWithGemini(documentText) {
  // Skip if no API key configured
  if (!GEMINI_API_KEY) {
    return { title: null, author: null, summary: null, keywords: null, success: false, error: 'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.' }
  }

  // Ensure we don't exceed token limits — truncate if too long
  const maxChars = 25000
  const trimmedText = documentText.length > maxChars
    ? documentText.substring(0, maxChars) + '\n\n[...content truncated...]'
    : documentText

  // Build a concise prompt with the document text
  const prompt = EXTRACTION_PROMPT + trimmedText

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      
      // Detect rate-limit / quota errors specifically
      if (response.status === 429) {
        return { title: null, author: null, summary: null, keywords: null, success: false, error: 'AI rate limit reached. Try again later or fill the fields manually.' }
      }
      
      throw new Error(`Gemini API error (${response.status})`)
    }

    const data = await response.json()

    // Extract text from response
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!responseText) {
      throw new Error('Empty response from Gemini API')
    }

    // Parse the JSON response (handle case where model wraps in markdown code blocks)
    const jsonStr = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(jsonStr)

    return {
      title: parsed.title || null,
      author: parsed.author || null,
      summary: parsed.summary || null,
      keywords: parsed.keywords || null,
      success: true,
      error: null,
    }
  } catch (err) {
    return { title: null, author: null, summary: null, keywords: null, success: false, error: 'AI extraction service unavailable. Fill fields manually.' }
  }
}
