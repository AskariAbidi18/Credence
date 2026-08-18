/**
 * pages/document-detail.js — Single Document Detail View
 *
 * Shows full metadata, confidence bars, all extracted fields,
 * and a raw JSON viewer for a given document ID.
 * Data is read from localStorage only.
 */

import { getDocument } from '../storage.js';
import { setActiveNav, setBreadcrumb } from '../sidebar.js';
import { formatDocType, getTypeCls, formatRelativeTime, escHtml, capitalize } from './dashboard.js';
import { navigate } from '../router.js';

export async function renderDocumentDetail(id) {
  setActiveNav('documents');

  const content = document.getElementById('page-content');
  content.innerHTML = '';
  content.className = 'page-content page-enter';

  const doc = getDocument(id);

  if (!doc) {
    content.innerHTML = `
      <div class="empty-state" style="height:60vh;">
        <div class="empty-state-icon"><i data-lucide="file-x" class="icon-lg"></i></div>
        <h3 class="empty-state-title">Document Not Found</h3>
        <p class="empty-state-desc">This document was not found in your local history. It may have been deleted or opened in a different browser.</p>
        <a href="#/documents" class="btn btn-primary" style="margin-top:0.5rem;">
          <i data-lucide="arrow-left" class="icon-sm"></i>
          Back to History
        </a>
      </div>
    `;
    lucide.createIcons({ nodes: [content] });
    setBreadcrumb(['Credence', 'Documents', 'Not Found']);
    return;
  }

  setBreadcrumb(['Credence', 'Documents', doc.filename]);

  const typeLabel  = formatDocType(doc.document_type);
  const typeCls    = getTypeCls(doc.document_type);
  const classConf  = doc.classification_confidence;
  const extConf    = doc.extraction_confidence;
  const statusBadge = doc.extraction_status === 'success' ? 'badge-success'
                    : doc.extraction_status === 'partial'  ? 'badge-warning' : 'badge-error';

  content.innerHTML = `
    <!-- Back nav -->
    <div style="margin-bottom:1.25rem;">
      <a href="#/documents" class="btn btn-ghost btn-sm" style="padding-left:0;">
        <i data-lucide="arrow-left" class="icon-sm"></i>
        Document History
      </a>
    </div>

    <!-- Document header -->
    <div class="doc-meta-header">
      <div class="doc-meta-icon ${doc.document_type}">
        ${docTypeIcon(doc.document_type)}
      </div>
      <div class="doc-meta-info">
        <div class="doc-meta-name">${escHtml(doc.filename)}</div>
        <div class="doc-meta-id">ID: ${escHtml(doc.id)}</div>
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <span class="badge badge-${typeCls}">${typeLabel}</span>
        <span class="badge ${statusBadge}">${capitalize(doc.extraction_status)}</span>
      </div>
    </div>

    <!-- Main content grid -->
    <div class="flex gap-4" style="flex-wrap:wrap; align-items:flex-start;">

      <!-- Left: Confidence + metadata -->
      <div style="flex:1; min-width:240px; display:flex; flex-direction:column; gap:1rem;">

        <!-- Confidence card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">AI Confidence</div>
          </div>
          <div class="card-content">
            <div style="display:flex; flex-direction:column; gap:1.125rem;">
              ${renderConfBar('Classification Confidence', classConf)}
              ${extConf != null ? renderConfBar('Extraction Confidence', extConf) : `
                <p class="text-sm text-muted">Extraction confidence not available</p>
              `}
            </div>
          </div>
        </div>

        <!-- Metadata card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Document Metadata</div>
          </div>
          <div class="card-content">
            <div style="display:flex; flex-direction:column; gap:1rem;">
              ${metaRow('Filename',     escHtml(doc.filename))}
              ${metaRow('Document ID',  `<span class="font-mono text-xs">${escHtml(doc.id)}</span>`)}
              ${metaRow('Type',         `<span class="badge badge-${typeCls}">${typeLabel}</span>`)}
              ${metaRow('Status',       `<span class="badge ${statusBadge}">${capitalize(doc.extraction_status)}</span>`)}
              ${metaRow('Processed',    formatRelativeTime(doc.uploaded_at))}
              ${metaRow('Processed At', new Date(doc.uploaded_at).toLocaleString())}
            </div>
          </div>
        </div>

      </div>

      <!-- Right: Extracted fields -->
      <div style="flex:2; min-width:300px; display:flex; flex-direction:column; gap:1rem;">

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Extracted Data</div>
              <div class="card-description">${typeLabel} fields extracted by AI</div>
            </div>
          </div>
          <div class="card-content">
            <div class="result-grid">
              ${renderExtractedFields(doc.document_type, doc.data)}
            </div>
          </div>
        </div>

        <!-- Raw JSON viewer -->
        <div class="json-viewer">
          <div class="json-viewer-header" id="json-toggle">
            <span class="json-viewer-title">
              <i data-lucide="code" class="icon-xs"></i>
              Raw API Response
            </span>
            <i data-lucide="chevron-down" class="icon-xs" id="json-chevron"></i>
          </div>
          <div class="json-content" id="json-content">
            <pre>${escHtml(doc.raw_json)}</pre>
          </div>
        </div>

      </div>

    </div>
  `;

  lucide.createIcons({ nodes: [content] });

  // Animate confidence bars
  setTimeout(() => {
    content.querySelectorAll('.confidence-fill[data-target]').forEach((el) => {
      el.style.width = el.dataset.target + '%';
    });
  }, 100);

  // JSON toggle
  document.getElementById('json-toggle')?.addEventListener('click', () => {
    const panel   = document.getElementById('json-content');
    const chevron = document.getElementById('json-chevron');
    panel?.classList.toggle('open');
    if (chevron) chevron.style.transform = panel?.classList.contains('open') ? 'rotate(180deg)' : '';
  });
}

// ── Sub-renderers ────────────────────────────────────────────

function renderConfBar(label, value) {
  const pct = Math.round(value * 100);
  const cls = pct >= 80 ? 'high' : pct >= 60 ? 'medium' : 'low';
  const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--error)';
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

function metaRow(label, valueHtml) {
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
      <span class="text-xs text-muted" style="text-transform:uppercase; letter-spacing:0.04em; font-weight:600; white-space:nowrap;">${label}</span>
      <span class="text-sm font-medium text-right">${valueHtml}</span>
    </div>
  `;
}

function renderExtractedFields(type, data) {
  const fieldConfig = {
    payslip: [
      { key: 'employee_name', label: 'Employee Name' },
      { key: 'employer',      label: 'Employer' },
      { key: 'period',        label: 'Period' },
      { key: 'gross_pay',     label: 'Gross Pay',  currency: true },
      { key: 'net_pay',       label: 'Net Pay',    currency: true },
      { key: 'deductions',    label: 'Deductions', currency: true },
      { key: 'currency',      label: 'Currency' },
    ],
    bank_statement: [
      { key: 'account_holder',       label: 'Account Holder' },
      { key: 'account_number_last4', label: 'Acct. No. (Last 4)', mono: true },
      { key: 'statement_period',     label: 'Statement Period' },
      { key: 'opening_balance',      label: 'Opening Balance',  currency: true },
      { key: 'closing_balance',      label: 'Closing Balance',  currency: true },
      { key: 'average_balance',      label: 'Average Balance',  currency: true },
      { key: 'total_deposits',       label: 'Total Deposits',   currency: true },
      { key: 'total_withdrawals',    label: 'Total Withdrawals', currency: true },
      { key: 'transactions_count',   label: 'Transaction Count' },
      { key: 'currency',             label: 'Currency' },
    ],
    tax_return: [
      { key: 'taxpayer_name',   label: 'Taxpayer Name' },
      { key: 'tax_year',        label: 'Tax Year' },
      { key: 'declared_income', label: 'Declared Income', currency: true },
      { key: 'taxable_income',  label: 'Taxable Income',  currency: true },
      { key: 'tax_paid',        label: 'Tax Paid',        currency: true },
      { key: 'currency',        label: 'Currency' },
    ],
    kyc: [
      { key: 'full_name',             label: 'Full Name' },
      { key: 'date_of_birth',         label: 'Date of Birth' },
      { key: 'document_type',         label: 'ID Type' },
      { key: 'document_number_last4', label: 'Doc. No. (Last 4)', mono: true },
      { key: 'address',               label: 'Address' },
      { key: 'expiry_date',           label: 'Expiry Date' },
    ],
  };

  const fields = fieldConfig[type] ?? [];

  if (fields.length === 0) {
    return '<p class="text-sm text-muted">No field configuration for this document type.</p>';
  }

  return fields.map(({ key, label, currency, mono }) => {
    const raw = data?.[key];
    let display = '—';
    if (raw != null && raw !== '') {
      if (currency && typeof raw === 'number') {
        display = raw.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        display = String(raw);
      }
    }
    const isEmpty = display === '—';
    return `
      <div class="result-field">
        <span class="result-field-label">${label}</span>
        <span class="result-field-value ${mono ? 'mono' : ''}" style="${isEmpty ? 'color:var(--fg-subtle);' : ''}">${escHtml(display)}</span>
      </div>
    `;
  }).join('');
}

function docTypeIcon(type) {
  const icons = {
    payslip:        '<i data-lucide="receipt" class="icon-md"></i>',
    bank_statement: '<i data-lucide="landmark" class="icon-md"></i>',
    tax_return:     '<i data-lucide="file-spreadsheet" class="icon-md"></i>',
    kyc:            '<i data-lucide="shield-check" class="icon-md"></i>',
  };
  return icons[type] ?? '<i data-lucide="file-text" class="icon-md"></i>';
}
