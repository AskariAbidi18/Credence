/**
 * storage.js — localStorage helpers for Credence document history
 *
 * The backend has no GET /documents endpoint, so document history
 * is stored locally in the browser. This is clearly frontend-only
 * session/browser data — not backend database data.
 */

const STORAGE_KEY = 'credence_document_history';
const MAX_RECORDS = 200;

/**
 * @typedef {Object} DocumentRecord
 * @property {string} id            — matches document_id from backend
 * @property {string} filename
 * @property {string} document_type
 * @property {number} classification_confidence
 * @property {number|null} extraction_confidence
 * @property {string} extraction_status  — 'success'|'partial'|'failed'
 * @property {Object} data              — extracted fields
 * @property {number} uploaded_at       — timestamp
 * @property {string} raw_json          — full backend response JSON string
 */

/**
 * Save an extracted document result to localStorage
 * @param {import('./api.js').ExtractedDocument} doc
 */
export function saveDocument(doc) {
  const records = getAllDocuments();

  const record = {
    id: doc.document_id,
    filename: doc.filename,
    document_type: doc.document_type,
    classification_confidence: doc.classification_confidence,
    extraction_confidence: doc.extraction_confidence ?? null,
    extraction_status: doc.extraction_status,
    data: doc.data,
    uploaded_at: Date.now(),
    raw_json: JSON.stringify(doc, null, 2),
  };

  // Prepend (newest first), dedup by id, cap at max
  const filtered = records.filter((r) => r.id !== record.id);
  const updated = [record, ...filtered].slice(0, MAX_RECORDS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('localStorage quota exceeded — trimming history', e);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  }
}

/**
 * Get all stored documents (newest first)
 * @returns {DocumentRecord[]}
 */
export function getAllDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Get a single document by ID
 * @param {string} id
 * @returns {DocumentRecord|null}
 */
export function getDocument(id) {
  return getAllDocuments().find((r) => r.id === id) ?? null;
}

/**
 * Delete a document record from localStorage
 * @param {string} id
 */
export function deleteDocument(id) {
  const records = getAllDocuments().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/**
 * Clear all document history
 */
export function clearAllDocuments() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Derive session statistics from stored documents
 * @returns {{ total: number, success: number, partial: number, failed: number, avgConfidence: number|null }}
 */
export function getSessionStats() {
  const docs = getAllDocuments();
  const total = docs.length;
  if (total === 0) return { total: 0, success: 0, partial: 0, failed: 0, avgConfidence: null };

  const success = docs.filter((d) => d.extraction_status === 'success').length;
  const partial = docs.filter((d) => d.extraction_status === 'partial').length;
  const failed  = docs.filter((d) => d.extraction_status === 'failed').length;

  const confidenceValues = docs
    .map((d) => d.extraction_confidence ?? d.classification_confidence)
    .filter((v) => v != null);

  const avgConfidence = confidenceValues.length
    ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
    : null;

  return { total, success, partial, failed, avgConfidence };
}

/**
 * Count documents by type
 * @returns {Record<string, number>}
 */
export function getDocsByType() {
  const docs = getAllDocuments();
  const counts = { payslip: 0, bank_statement: 0, tax_return: 0, kyc: 0 };
  for (const d of docs) {
    if (d.document_type in counts) counts[d.document_type]++;
  }
  return counts;
}
