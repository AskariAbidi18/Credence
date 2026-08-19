/**
 * api.js — Backend API wrapper for Credence
 *
 * Single source of truth for all backend communication.
 */

export const BACKEND_URL = "http://localhost:8000";

export function getBackendUrl() {
  return (localStorage.getItem("credence_backend_url") || BACKEND_URL).replace(
    /\/+$/,
    "",
  );
}

/**
 * Check if the backend is alive.
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${getBackendUrl()}/`, {
      signal: AbortSignal.timeout(4000),
    });

    return res.ok;
  } catch {
    return false;
  }
}

/* ============================================================
   LEGACY DOCUMENT UPLOAD
   Used by the existing Upload Document page.
   POST /api/upload
   ============================================================ */

/**
 * Upload a standalone document to the original document
 * processing endpoint.
 *
 * @param {File} file
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<ExtractedDocument>}
 */
export async function uploadDocument(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${getBackendUrl()}/api/upload`);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);

        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error("Invalid JSON response from backend"));
        }

        return;
      }

      let detail = `HTTP ${xhr.status}`;

      try {
        const err = JSON.parse(xhr.responseText);
        detail = err.detail || detail;
      } catch {
        // Ignore JSON parsing failure.
      }

      reject(new Error(detail));
    });

    xhr.addEventListener("error", () => {
      reject(
        new Error(
          "Network error — is the backend running on http://localhost:8000?",
        ),
      );
    });

    xhr.addEventListener("timeout", () => {
      reject(
        new Error("Request timed out. The backend may be processing the file."),
      );
    });

    xhr.timeout = 120000;
    xhr.send(formData);
  });
}

/* ============================================================
   APPLICATIONS
   ============================================================ */

/**
 * Get all loan applications.
 */
export async function getApplications() {
  const res = await fetch(`${getBackendUrl()}/api/applications`);

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;

    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      // Ignore JSON parsing failure.
    }

    throw new Error(detail);
  }

  return res.json();
}

/**
 * Get a single loan application.
 *
 * @param {string} applicationId
 */
export async function getApplication(applicationId) {
  const res = await fetch(
    `${getBackendUrl()}/api/applications/${applicationId}`,
  );

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;

    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      // Ignore JSON parsing failure.
    }

    throw new Error(detail);
  }

  return res.json();
}

/**
 * Create a new loan application.
 *
 * @param {Object} payload
 */
export async function createApplication(payload) {
  const res = await fetch(`${getBackendUrl()}/api/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;

    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      // Ignore JSON parsing failure.
    }

    throw new Error(detail);
  }

  return res.json();
}

/**
 * Upload a document to an existing loan application.
 *
 * @param {string} applicationId
 * @param {File} file
 * @param {(progress: number) => void} [onProgress]
 */
export async function uploadApplicationDocument(
  applicationId,
  file,
  onProgress,
) {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      `${getBackendUrl()}/api/applications/${applicationId}/documents`,
    );

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);

        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid JSON response from backend"));
        }

        return;
      }

      let detail = `HTTP ${xhr.status}`;

      try {
        const err = JSON.parse(xhr.responseText);
        detail = err.detail || detail;
      } catch {
        // Ignore JSON parsing failure.
      }

      reject(new Error(detail));
    });

    xhr.addEventListener("error", () => {
      reject(
        new Error(
          "Network error — is the backend running on http://localhost:8000?",
        ),
      );
    });

    xhr.addEventListener("timeout", () => {
      reject(
        new Error("Request timed out. The backend may be processing the file."),
      );
    });

    xhr.timeout = 120000;
    xhr.send(formData);
  });
}

/* ============================================================
   VALIDATION
   ============================================================ */

/**
 * Run validation for an application.
 *
 * @param {string} applicationId
 */
export async function validateApplication(applicationId) {
  const res = await fetch(
    `${getBackendUrl()}/api/applications/${applicationId}/validate`,
    {
      method: "POST",
    },
  );

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;

    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      // Ignore JSON parsing failure.
    }

    throw new Error(detail);
  }

  return res.json();
}

/* ============================================================
   RISK ASSESSMENT
   ============================================================ */

/**
 * Run risk assessment for an application.
 *
 * @param {string} applicationId
 */
export async function assessApplicationRisk(applicationId) {
  const res = await fetch(
    `${getBackendUrl()}/api/applications/${applicationId}/risk`,
    {
      method: "POST",
    },
  );

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;

    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      // Ignore JSON parsing failure.
    }

    throw new Error(detail);
  }

  return res.json();
}

/* ============================================================
   AI SUMMARY
   ============================================================ */

/**
 * Generate the AI reviewer summary.
 *
 * @param {string} applicationId
 */
export async function generateApplicationSummary(applicationId) {
  const res = await fetch(
    `${getBackendUrl()}/api/applications/${applicationId}/summary`,
    {
      method: "POST",
    },
  );

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;

    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      // Ignore JSON parsing failure.
    }

    throw new Error(detail);
  }

  return res.json();
}

/* ============================================================
   DOCUMENT RESPONSE TYPE
   ============================================================ */

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
