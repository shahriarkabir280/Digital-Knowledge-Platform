/**
 * Metadata Extractor
 * Extracts text content from uploaded PDF documents using pdfjs-dist,
 * then sends the raw text to the backend metadata extraction service
 * (which delegates to a Python microservice).
 *
 * Approach:
 * 1. Extract raw text from the first few pages of the PDF using pdfjs-dist
 * 2. Send the extracted text to POST /api/extract-metadata
 * 3. Return the structured response
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfjsWorker

const MAX_PAGES_TO_SCAN = 3
const EXTRACT_ENDPOINT = '/api/extract-metadata'

/**
 * Main entry: extract metadata from an uploaded file
 * Uses the backend extraction service (Python microservice).
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
 * Extract text from PDF and send to the backend extraction service
 */
async function extractPDFMetadata(file) {
  try {
    const extractedText = await extractTextFromPDF(file)

    if (!extractedText || extractedText.trim().length < 20) {
      return { title: null, author: null, summary: null, tags: null, success: false, error: 'Could not extract enough text from this PDF (it may be a scanned document).' }
    }

    const metadata = await extractWithLocalService(extractedText)

    if (!metadata.success) {
      return {
        title: null,
        author: null,
        summary: null,
        tags: null,
        success: false,
        error: metadata.error || 'Metadata extraction failed.',
      }
    }

    const tags = Array.isArray(metadata.keywords)
      ? metadata.keywords.join(', ')
      : null

    return {
      title: metadata.title || null,
      author: metadata.author || null,
      summary: metadata.abstract || null,
      tags,
      success: true,
      error: null,
    }
  } catch {
    return { title: null, author: null, summary: null, tags: null, success: false, error: 'Metadata extraction encountered an unexpected error.' }
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

    const pageText = textContent.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s{3,}/g, '\n')
      .replace(/\s+/g, ' ')

    texts.push(pageText)
  }

  return texts.join('\n\n--- Page Break ---\n\n')
}

/**
 * Send extracted text to the backend extraction service
 */
async function extractWithLocalService(documentText) {
  const maxChars = 25000
  const trimmedText = documentText.length > maxChars
    ? documentText.substring(0, maxChars) + '\n\n[...content truncated...]'
    : documentText

  try {
    const response = await fetch(EXTRACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmedText }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new Error(`Extraction service error (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    return data
  } catch {
    return { title: null, author: null, abstract: null, keywords: [], success: false, error: 'Metadata extraction service unavailable. Fill fields manually.' }
  }
}
