/**
 * pages/support.js — Help & Support Page (UI only)
 */

import { setActiveNav, setBreadcrumb } from '../sidebar.js';

export async function renderSupport() {
  setActiveNav('support');
  setBreadcrumb(['Credence', 'Support']);

  const content = document.getElementById('page-content');
  content.innerHTML = '';
  content.className = 'page-content page-enter';

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Help &amp; Support</h1>
        <p class="page-subtitle">Documentation, API reference and troubleshooting guides</p>
      </div>
    </div>

    <!-- Quick help cards -->
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 1.5rem;">

      <div class="support-card">
        <div style="display:flex; align-items:center; gap:0.875rem; margin-bottom:1rem;">
          <div class="stat-icon" style="background:rgba(99,102,241,0.12); color:#818cf8;">
            <i data-lucide="upload-cloud" class="icon-sm"></i>
          </div>
          <h3 style="font-size:1rem; font-weight:600;">Uploading Documents</h3>
        </div>
        <p class="text-sm text-muted" style="line-height:1.7;">
  Processed documents are associated with their loan applications
  and retrieved from the Credence backend. Document History lets you
  search and filter documents across processed applications.
</p>
      </div>

      <div class="support-card">
        <div style="display:flex; align-items:center; gap:0.875rem; margin-bottom:1rem;">
          <div class="stat-icon" style="background:rgba(16,185,129,0.12); color:#34d399;">
            <i data-lucide="cpu" class="icon-sm"></i>
          </div>
          <h3 style="font-size:1rem; font-weight:600;">AI Processing</h3>
        </div>
        <p class="text-sm text-muted" style="line-height:1.7;">
          Credence uses Claude / Groq AI to classify your document into one
          of four types, then extracts all relevant fields. Processing takes
          10–60 seconds depending on document complexity.
        </p>
      </div>

      <div class="support-card">
        <div style="display:flex; align-items:center; gap:0.875rem; margin-bottom:1rem;">
          <div class="stat-icon" style="background:rgba(245,158,11,0.12); color:#fbbf24;">
            <i data-lucide="shield-check" class="icon-sm"></i>
          </div>
          <h3 style="font-size:1rem; font-weight:600;">Confidence Scores</h3>
        </div>
        <p class="text-sm text-muted" style="line-height:1.7;">
  Each result includes classification and extraction confidence scores.
  Higher scores indicate greater model confidence. Partial or failed
  extractions should be reviewed before relying on the extracted data.
</p>
      </div>

      <div class="support-card">
        <div style="display:flex; align-items:center; gap:0.875rem; margin-bottom:1rem;">
          <div class="stat-icon" style="background:rgba(139,92,246,0.12); color:#a78bfa;">
            <i data-lucide="hard-drive" class="icon-sm"></i>
          </div>
          <h3 style="font-size:1rem; font-weight:600;">Document History</h3>
        </div>
        <p class="text-sm text-muted" style="line-height:1.7;">
          All processed documents are saved locally in your browser's
          localStorage. This is device-specific and not synced to the backend.
          Clear it anytime in <strong>Settings</strong>.
        </p>
      </div>

    </div>

    <!-- Document types reference -->
    <div class="card" style="margin-bottom:1rem;">
      <div class="card-header">
        <div class="card-title">Supported Document Types</div>
        <div class="card-description">What Credence can classify and extract</div>
      </div>
      <div class="card-content">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">

          ${docTypeRef('receipt', 'payslip', 'Payslip',
            'Employee payslips and salary slips',
            ['Employee Name', 'Employer', 'Pay Period', 'Gross Pay', 'Net Pay', 'Deductions', 'Currency'])}

          ${docTypeRef('landmark', 'bank_statement', 'Bank Statement',
            'Bank account statements',
            ['Account Holder', 'Account No. (Last 4)', 'Statement Period', 'Opening / Closing Balance', 'Total Deposits / Withdrawals', 'Transaction Count'])}

          ${docTypeRef('file-spreadsheet', 'tax_return', 'Tax Return',
            'Income tax return filings',
            ['Taxpayer Name', 'Tax Year', 'Declared Income', 'Taxable Income', 'Tax Paid', 'Currency'])}

          ${docTypeRef('shield-check', 'kyc', 'KYC / Identity',
            'ID cards, passports, driver\'s licences',
            ['Full Name', 'Date of Birth', 'ID Type', 'Document No. (Last 4)', 'Address', 'Expiry Date'])}

        </div>
      </div>
    </div>

    <!-- API reference card -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">API Reference</div>
        <div class="card-description">Credence backend endpoint</div>
      </div>
      <div class="card-content">
        <div style="background:var(--bg-subtle); border:1px solid var(--border); border-radius:var(--radius); padding:1rem; font-family:'JetBrains Mono', monospace; font-size:0.8125rem; overflow-x:auto;">
          <p style="color:var(--success); margin-bottom:0.5rem;">
  POST /api/applications/{applicationId}/documents
</p>
<p style="color:var(--fg-muted);">
  Content-Type: multipart/form-data
</p>
<p style="color:var(--fg-muted);">
  Body field: file (PDF / PNG / JPG)
</p>
          <br>
          <p style="color:var(--fg-muted);">
  Response: ExtractedDocument JSON
</p>
          <p style="color:var(--fg-muted);">  → document_id, filename, document_type</p>
          <p style="color:var(--fg-muted);">  → classification_confidence</p>
          <p style="color:var(--fg-muted);">  → extraction_confidence</p>
          <p style="color:var(--fg-muted);">  → extraction_status</p>
          <p style="color:var(--fg-muted);">  → data { ...type-specific fields }</p>
        </div>
        <p class="text-xs text-muted" style="margin-top:0.75rem;">
          Full interactive API docs available at
          <a href="https://credence-3hnj.onrender.com/docs" target="_blank" rel="noopener" style="color:var(--info-fg); text-decoration:underline;">http://localhost:8000/docs</a>
          when the backend is running.
        </p>
      </div>
    </div>
  `;

  lucide.createIcons({ nodes: [content] });
}

function docTypeRef(icon, typeCls, title, desc, fields) {
  return `
    <div style="padding:1rem; background:var(--bg-subtle); border:1px solid var(--border); border-radius:var(--radius-lg);">
      <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.875rem;">
        <div class="doc-meta-icon ${typeCls}" style="width:2.25rem; height:2.25rem; border-radius:var(--radius);">
          <i data-lucide="${icon}" class="icon-sm"></i>
        </div>
        <div>
          <p class="font-semibold text-sm">${title}</p>
          <p class="text-xs text-muted">${desc}</p>
        </div>
      </div>
      <ul style="display:flex; flex-direction:column; gap:0.25rem;">
        ${fields.map((f) => `<li class="text-xs text-muted" style="display:flex; align-items:center; gap:0.375rem;"><span style="width:0.3rem; height:0.3rem; border-radius:50%; background:var(--fg-subtle); flex-shrink:0;"></span>${f}</li>`).join('')}
      </ul>
    </div>
  `;
}
