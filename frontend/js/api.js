/**
 * api.js — Backend API wrapper for Credence
 *
 * Single source of truth for all backend communication.
 * The backend is READ-ONLY and must NOT be modified.
 *
 * Backend API contract:
 *   POST /api/upload   — multipart/form-data, field: "file"
 *   GET  /             — health check
 */

export const BACKEND_URL = 'http://localhost:8000';

/**
 * Check if the backend is alive
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Upload a document to the Credence backend.
 * Uses exactly: POST /api/upload with multipart/form-data field "file"
 *
 * @param {File} file
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<ExtractedDocument>}
 */
export async function uploadDocument(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  // Use XMLHttpRequest for upload progress reporting
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${BACKEND_URL}/api/upload`);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error('Invalid JSON response from backend'));
        }
      } else {
        let detail = `HTTP ${xhr.status}`;
        try {
          const err = JSON.parse(xhr.responseText);
          detail = err.detail || detail;
        } catch { /* ignore */ }
        reject(new Error(detail));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error — is the backend running on http://localhost:8000?'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Request timed out. The backend may be processing the file.'));
    });

    xhr.timeout = 120000; // 2 minutes for AI processing
    xhr.send(formData);
  });
}

/**
 * @typedef {Object} ExtractedDocument
 * @property {string} document_id
 * @property {string} filename
 * @property {'payslip'|'bank_statement'|'tax_return'|'kyc'} document_type
 * @property {number} classification_confidence
 * @property {number|null} extraction_confidence
 * @property {'success'|'partial'|'failed'} extraction_status
 * @property {Object} data
 */
