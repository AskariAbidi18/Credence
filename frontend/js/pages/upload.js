/**
 * pages/upload.js — Document Upload Page
 *
 * The PRIMARY functional page. Integrates with POST /api/upload.
 * Supports drag-and-drop, file validation, progress indicator,
 * and displays the full ExtractedDocument response.
 */

import { getApplications, uploadApplicationDocument } from "../api.js";
import { setActiveNav, setBreadcrumb } from "../sidebar.js";
import { showToast } from "../toast.js";
import { navigate } from "../router.js";
import { formatDocType, getTypeCls, escHtml } from "./dashboard.js";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];
const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg"];
const MAX_SIZE_MB = 20;

export async function renderUpload() {
  setActiveNav("upload");
  setBreadcrumb(["Credence", "Documents", "Upload"]);

  const content = document.getElementById("page-content");
  content.innerHTML = "";
  content.className = "page-content page-enter";

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Upload Document</h1>
        <p class="page-subtitle">
          AI-powered classification and data extraction using the Credence backend
        </p>
      </div>
    </div>

    <div class="flex gap-4" style="flex-wrap: wrap; align-items: flex-start;">

      <!-- Upload card -->
      <div class="card" style="flex: 1; min-width: 320px;">
        <div class="card-header">
          <div class="card-title">Select Document</div>
          <div class="card-description">PDF, PNG, or JPG · Max ${MAX_SIZE_MB}MB</div>
        </div>
        <div class="card-content">
          <!-- Application selector -->
<div style="margin-bottom: 1rem;">
  <label
    for="application-select"
    class="text-sm font-medium"
    style="display:block; margin-bottom:0.5rem;"
  >
    Loan Application
  </label>

  <select
    id="application-select"
    class="form-input"
  >
    <option value="">Loading applications...</option>
  </select>

  <p class="text-xs text-muted" style="margin-top:0.35rem;">
    Select the application this document belongs to.
  </p>
</div>
          <!-- Drop zone -->
          <div class="upload-zone" id="upload-zone">
            <input type="file" id="file-input" accept=".pdf,.png,.jpg,.jpeg" aria-label="Choose file to upload" />
            <div class="upload-icon-wrap" id="upload-icon-wrap">
              <i data-lucide="upload-cloud" class="icon-lg"></i>
            </div>
            <div class="upload-title">Drag &amp; drop your document</div>
            <p class="upload-desc">
              or click to browse your files<br>
              Supports loan application documents
            </p>
            <div class="upload-formats">
              <span class="format-tag">PDF</span>
              <span class="format-tag">PNG</span>
              <span class="format-tag">JPG</span>
            </div>
          </div>

          <!-- Selected file info -->
          <div id="file-info" class="hidden" style="margin-top: 1rem; padding: 0.875rem; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: var(--radius); display: flex; align-items: center; gap: 0.75rem;">
            <div style="width:2.25rem; height:2.25rem; border-radius:var(--radius); background:var(--bg-muted); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; color:var(--fg-muted); flex-shrink:0;">
              <i data-lucide="file-text" class="icon-sm"></i>
            </div>
            <div style="flex:1; min-width:0;">
              <p id="file-name" class="font-medium text-sm truncate"></p>
              <p id="file-size" class="text-xs text-muted"></p>
            </div>
            <button class="icon-btn" id="clear-file-btn" aria-label="Remove file">
              <i data-lucide="x" class="icon-sm"></i>
            </button>
          </div>

          <!-- Upload progress -->
          <div id="upload-progress" class="hidden" style="margin-top: 1rem;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem;">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <div class="spinner spinner-sm"></div>
                <span class="text-sm font-medium" id="progress-label">Uploading...</span>
              </div>
              <span class="text-sm font-semibold tabular-nums" id="progress-pct">0%</span>
            </div>
            <div class="upload-progress-bar-track">
              <div class="upload-progress-bar" id="progress-bar"></div>
            </div>
          </div>

          <!-- Processing state (AI running) -->
          <div id="ai-processing" class="hidden" style="margin-top: 1rem; text-align: center; padding: 1rem;">
            <div class="processing-dots">
              <span></span><span></span><span></span>
            </div>
            <p class="text-sm font-medium" style="margin-top:0.75rem;">AI is processing your document...</p>
            <p class="text-xs text-muted" style="margin-top:0.25rem;">Classification + extraction in progress</p>
          </div>

          <!-- Upload button -->
          <div style="margin-top: 1rem;">
            <button id="upload-btn" class="btn btn-primary w-full btn-lg" disabled>
              <i data-lucide="cpu" class="icon-sm"></i>
              Process Document
            </button>
          </div>

          <!-- Error message -->
          <div id="upload-error" class="hidden" style="margin-top: 1rem; padding: 0.875rem 1rem; background: var(--error-bg); border: 1px solid rgba(239,68,68,0.2); border-radius: var(--radius); display: flex; align-items: flex-start; gap: 0.75rem;">
            <i data-lucide="alert-circle" class="icon-sm" style="color:var(--error-fg); flex-shrink:0; margin-top:0.1rem;"></i>
            <div>
              <p class="text-sm font-semibold" style="color:var(--error-fg);">Processing Failed</p>
              <p id="upload-error-msg" class="text-xs" style="color:var(--error-fg); opacity:0.85; margin-top:0.15rem;"></p>
            </div>
          </div>

        </div>

        <!-- What gets processed -->
        <div class="card-footer" style="flex-direction:column; align-items:flex-start; gap:0.625rem;">
          <p class="text-xs font-semibold text-muted" style="text-transform:uppercase; letter-spacing:0.05em;">Supported Document Types</p>
          <div class="flex gap-2 flex-wrap">
            <span class="badge badge-payslip">Payslip</span>
            <span class="badge badge-bank">Bank Statement</span>
            <span class="badge badge-tax">Tax Return</span>
            <span class="badge badge-kyc">KYC / Identity</span>
          </div>
        </div>
      </div>

      <!-- Result card (hidden until response) -->
      <div id="result-panel" class="hidden" style="flex: 1.4; min-width: 340px;">
        <div id="result-content"></div>
      </div>

    </div>
  `;

  lucide.createIcons({ nodes: [content] });

  await loadApplications();

  initUploadLogic();
}

async function loadApplications() {
  const select = document.getElementById("application-select");

  if (!select) return;

  try {
    const applications = await getApplications();

    if (!applications.length) {
      select.innerHTML = `
        <option value="">
          No applications available
        </option>
      `;

      return;
    }

    select.innerHTML = `
      <option value="">
        Select an application
      </option>

      ${applications
        .map(
          (application) => `
        <option value="${escHtml(application.id)}">
          ${escHtml(application.applicant_name || "Unnamed Applicant")}
          — ${escHtml(application.loan_type || "Loan")}
        </option>
      `,
        )
        .join("")}
    `;
  } catch (error) {
    console.error("Failed to load applications:", error);

    select.innerHTML = `
      <option value="">
        Unable to load applications
      </option>
    `;

    showToast({
      type: "error",
      title: "Applications unavailable",
      desc: error.message,
    });
  }
}

function initUploadLogic() {
  const zone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");
  const uploadBtn = document.getElementById("upload-btn");
  const clearBtn = document.getElementById("clear-file-btn");
  const applicationSelect = document.getElementById("application-select");
  let selectedFile = null;

  // Drag and drop
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  });

  // File input change
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) handleFileSelect(file);
  });

  // Clear file
  clearBtn?.addEventListener("click", () => {
    selectedFile = null;
    fileInput.value = "";
    hideFileInfo();
    uploadBtn.disabled = true;
    hideError();
    hideResult();
  });

  // Upload button
  uploadBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    const applicationId = applicationSelect?.value;

    if (!applicationId) {
      showError(
        "Please select a loan application before processing the document.",
      );

      return;
    }

    await processUpload(selectedFile, applicationId);
  });
  function handleFileSelect(file) {
    const err = validateFile(file);
    if (err) {
      showError(err);
      return;
    }
    hideError();
    selectedFile = file;
    showFileInfo(file);
    uploadBtn.disabled = false;
    hideResult();
  }
}

function validateFile(file) {
  const ext = "." + file.name.split(".").pop().toLowerCase();
  const isValidType =
    ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.includes(ext);
  if (!isValidType) {
    return `Unsupported file type. Please upload a PDF, PNG, or JPG file.`;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `File is too large (${(file.size / 1048576).toFixed(1)}MB). Maximum is ${MAX_SIZE_MB}MB.`;
  }
  return null;
}

function showFileInfo(file) {
  const info = document.getElementById("file-info");
  const name = document.getElementById("file-name");
  const size = document.getElementById("file-size");
  info?.classList.remove("hidden");
  info?.style.setProperty("display", "flex");
  if (name) name.textContent = file.name;
  if (size) size.textContent = formatFileSize(file.size);
  lucide.createIcons({ nodes: [info] });
}

function hideFileInfo() {
  document.getElementById("file-info")?.classList.add("hidden");
}

function showError(msg) {
  const errWrap = document.getElementById("upload-error");
  const errMsg = document.getElementById("upload-error-msg");
  errWrap?.classList.remove("hidden");
  errWrap?.style.setProperty("display", "flex");
  if (errMsg) errMsg.textContent = msg;
  lucide.createIcons({ nodes: [errWrap] });
}

function hideError() {
  document.getElementById("upload-error")?.classList.add("hidden");
}

function hideResult() {
  document.getElementById("result-panel")?.classList.add("hidden");
}

async function processUpload(file, applicationId) {
  const uploadBtn = document.getElementById("upload-btn");
  const progressWrap = document.getElementById("upload-progress");
  const aiWrap = document.getElementById("ai-processing");
  const progressBar = document.getElementById("progress-bar");
  const progressPct = document.getElementById("progress-pct");
  const progressLabel = document.getElementById("progress-label");

  uploadBtn.disabled = true;
  hideError();
  hideResult();

  // Show progress
  progressWrap?.classList.remove("hidden");
  progressWrap?.style.setProperty("display", "block");

  try {
    const result = await uploadApplicationDocument(
      applicationId,
      file,
      (pct) => {
        if (progressBar) progressBar.style.width = pct + "%";
        if (progressPct) progressPct.textContent = pct + "%";

        if (pct >= 100) {
          // File uploaded, now AI is processing
          if (progressLabel) progressLabel.textContent = "Extracting data...";
          progressWrap?.classList.add("hidden");
          aiWrap?.classList.remove("hidden");
          aiWrap?.style.setProperty("display", "block");
        }
      },
    );

    // Hide all loading states
    progressWrap?.classList.add("hidden");
    aiWrap?.classList.add("hidden");

    // Show result
    renderResult(result);

    showToast({
      type: "success",
      title: "Document Processed",
      desc: `${file.name} classified as ${formatDocType(result.document_type)} and attached to the application.`,
    });
  } catch (err) {
    progressWrap?.classList.add("hidden");
    aiWrap?.classList.add("hidden");
    showError(err.message || "An unexpected error occurred.");
    showToast({ type: "error", title: "Processing Failed", desc: err.message });
  } finally {
    uploadBtn.disabled = false;
  }
}

function renderResult(doc) {
  const panel = document.getElementById("result-panel");
  const content = document.getElementById("result-content");
  if (!panel || !content) return;

  const conf = doc.classification_confidence;
  const extConf = doc.extraction_confidence;
  const typeLabel = formatDocType(doc.document_type);
  const typeCls = getTypeCls(doc.document_type);
  const statusBadge =
    doc.extraction_status === "success"
      ? "badge-success"
      : doc.extraction_status === "partial"
        ? "badge-warning"
        : "badge-error";

  content.innerHTML = `
    <!-- Document metadata card -->
    <div class="card" style="margin-bottom: 1rem;">
      <div class="card-header">
        <div class="doc-meta-header" style="margin-bottom:0; width:100%;">
          <div class="doc-meta-icon ${doc.document_type}">
            ${docTypeIcon(doc.document_type)}
          </div>
          <div class="doc-meta-info">
            <div class="doc-meta-name">${escHtml(doc.filename)}</div>
            <div class="doc-meta-id">${escHtml(doc.document_id)}</div>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-left:auto;">
            <span class="badge badge-${typeCls}">${typeLabel}</span>
            <span class="badge ${statusBadge}">${capitalize(doc.extraction_status)}</span>
          </div>
        </div>
      </div>
      <div class="card-content">

        <!-- Confidence section -->
        <p class="result-section-title">AI Confidence</p>
        <div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:1.5rem;">
          ${renderConfBar("Classification", conf)}
          ${extConf != null ? renderConfBar("Extraction", extConf) : ""}
        </div>

        <!-- Extracted data section -->
        <p class="result-section-title">Extracted Data</p>
        <div class="result-grid">
          ${renderExtractedFields(doc.document_type, doc.data)}
        </div>

      </div>
      <div class="card-footer" style="justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">
        <button class="btn btn-outline btn-sm" onclick="window.location.hash='/document/${escHtml(doc.document_id)}'">
          <i data-lucide="external-link" class="icon-xs"></i>
          View Full Details
        </button>
        <button class="btn btn-ghost btn-sm" onclick="window.location.hash='/documents'">
          <i data-lucide="files" class="icon-xs"></i>
          Document History
        </button>
      </div>
    </div>

    <!-- Raw JSON viewer -->
    <div class="json-viewer">
      <div class="json-viewer-header" onclick="this.nextElementSibling.classList.toggle('open')">
        <span class="json-viewer-title">
          <i data-lucide="code" class="icon-xs"></i>
          Raw API Response
        </span>
        <i data-lucide="chevron-down" class="icon-xs"></i>
      </div>
      <div class="json-content">
        <pre>${escHtml(JSON.stringify(doc, null, 2))}</pre>
      </div>
    </div>
  `;

  panel.classList.remove("hidden");
  panel.style.display = "block";
  lucide.createIcons({ nodes: [panel] });

  // Animate confidence bars
  setTimeout(() => {
    animateConfBars(panel);
  }, 100);
}

function renderConfBar(label, value) {
  const pct = Math.round(value * 100);
  const cls = pct >= 80 ? "high" : pct >= 60 ? "medium" : "low";
  const color =
    pct >= 80
      ? "var(--success)"
      : pct >= 60
        ? "var(--warning)"
        : "var(--error)";
  return `
    <div class="confidence-item">
      <div class="confidence-header">
        <span class="confidence-label">${label}</span>
        <span class="confidence-value" style="color:${color};">${pct}%</span>
      </div>
      <div class="confidence-track">
        <div class="confidence-fill ${cls}" data-target="${pct}"></div>
      </div>
    </div>
  `;
}

function animateConfBars(root) {
  root.querySelectorAll(".confidence-fill[data-target]").forEach((el) => {
    const target = el.dataset.target;
    requestAnimationFrame(() => {
      el.style.width = target + "%";
    });
  });
}

function renderExtractedFields(type, data) {
  const fieldConfig = {
    payslip: [
      { key: "employee_name", label: "Employee Name" },
      { key: "employer", label: "Employer" },
      { key: "period", label: "Period" },
      { key: "gross_pay", label: "Gross Pay", currency: true },
      { key: "net_pay", label: "Net Pay", currency: true },
      { key: "deductions", label: "Deductions", currency: true },
      { key: "currency", label: "Currency" },
    ],
    bank_statement: [
      { key: "account_holder", label: "Account Holder" },
      { key: "account_number_last4", label: "Acct. No. (Last 4)", mono: true },
      { key: "statement_period", label: "Statement Period" },
      { key: "opening_balance", label: "Opening Balance", currency: true },
      { key: "closing_balance", label: "Closing Balance", currency: true },
      { key: "average_balance", label: "Average Balance", currency: true },
      { key: "total_deposits", label: "Total Deposits", currency: true },
      { key: "total_withdrawals", label: "Total Withdrawals", currency: true },
      { key: "transactions_count", label: "Transaction Count" },
      { key: "currency", label: "Currency" },
    ],
    tax_return: [
      { key: "taxpayer_name", label: "Taxpayer Name" },
      { key: "tax_year", label: "Tax Year" },
      { key: "declared_income", label: "Declared Income", currency: true },
      { key: "taxable_income", label: "Taxable Income", currency: true },
      { key: "tax_paid", label: "Tax Paid", currency: true },
      { key: "currency", label: "Currency" },
    ],
    kyc: [
      { key: "full_name", label: "Full Name" },
      { key: "date_of_birth", label: "Date of Birth" },
      { key: "document_type", label: "ID Type" },
      { key: "document_number_last4", label: "Doc. No. (Last 4)", mono: true },
      { key: "address", label: "Address" },
      { key: "expiry_date", label: "Expiry Date" },
    ],
  };

  const fields = fieldConfig[type] ?? [];

  return fields
    .map(({ key, label, currency, mono }) => {
      const raw = data?.[key];
      let display = "—";
      if (raw != null && raw !== "") {
        if (currency && typeof raw === "number") {
          display = raw.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        } else {
          display = String(raw);
        }
      }
      return `
      <div class="result-field">
        <span class="result-field-label">${label}</span>
        <span class="result-field-value ${mono ? "mono" : ""}">${escHtml(display)}</span>
      </div>
    `;
    })
    .join("");
}

function docTypeIcon(type) {
  const icons = {
    payslip: '<i data-lucide="receipt" class="icon-md"></i>',
    bank_statement: '<i data-lucide="landmark" class="icon-md"></i>',
    tax_return: '<i data-lucide="file-spreadsheet" class="icon-md"></i>',
    kyc: '<i data-lucide="shield-check" class="icon-md"></i>',
  };
  return icons[type] ?? '<i data-lucide="file-text" class="icon-md"></i>';
}

// ── Helpers ──────────────────────────────────────────────────
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}
