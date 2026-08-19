/**
 * pages/documents.js — Document History Page
 *
 * Reads from localStorage only. Clearly presented as
 * "local browser history" — not a backend database.
 *
 * Features: search, filter by type, filter by status, delete
 */

import { getAllDocuments, deleteDocument } from '../storage.js';
import { setActiveNav, setBreadcrumb, updateDocBadge } from '../sidebar.js';
import { showToast } from '../toast.js';
import { formatDocType, getTypeCls, formatRelativeTime, escHtml, capitalize } from './dashboard.js';

export async function renderDocuments() {
  setActiveNav('documents');
  setBreadcrumb(['Credence', 'Documents', 'History']);

  const content = document.getElementById('page-content');
  content.innerHTML = '';
  content.className = 'page-content page-enter';

  renderDocumentList(content);
}

function renderDocumentList(container, searchQ = '', typeFilter = '', statusFilter = '') {
  let docs = getAllDocuments();

  // Apply filters
  if (searchQ) {
    const q = searchQ.toLowerCase();
    docs = docs.filter((d) =>
      d.filename.toLowerCase().includes(q) ||
      d.document_id.toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q)
    );
  }
  if (typeFilter)   docs = docs.filter((d) => d.document_type === typeFilter);
  if (statusFilter) docs = docs.filter((d) => d.extraction_status === statusFilter);

  const all = getAllDocuments();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Document History</h1>
        <p class="page-subtitle">Local browser history — ${all.length} document${all.length !== 1 ? 's' : ''} processed</p>
      </div>
      <div class="flex gap-2">
        ${all.length > 0 ? `<button class="btn btn-outline btn-sm" id="clear-all-btn">
          <i data-lucide="trash-2" class="icon-xs"></i> Clear All
        </button>` : ''}
        <a href="#/upload" class="btn btn-primary btn-sm">
          <i data-lucide="upload" class="icon-sm"></i>
          Upload New
        </a>
      </div>
    </div>

    ${all.length > 0 ? `
      <div class="session-banner" style="margin-bottom: 1.25rem;">
        <i data-lucide="hard-drive" class="icon-sm" style="flex-shrink:0;"></i>
        <span>This history is stored in your browser's localStorage — it is local to this device and browser session.</span>
      </div>
    ` : ''}

    ${all.length > 0 ? `
      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="input-with-icon" style="flex:1; max-width:22rem; position:relative;">
          <i data-lucide="search" class="icon-sm input-icon"></i>
          <input type="text" class="form-input" id="search-input" placeholder="Search filename, ID, type..." value="${escHtml(searchQ)}" style="padding-left:2.25rem;" />
        </div>
        <select class="filter-select" id="type-filter">
          <option value="">All Types</option>
          <option value="payslip" ${typeFilter === 'payslip' ? 'selected' : ''}>Payslip</option>
          <option value="bank_statement" ${typeFilter === 'bank_statement' ? 'selected' : ''}>Bank Statement</option>
          <option value="tax_return" ${typeFilter === 'tax_return' ? 'selected' : ''}>Tax Return</option>
          <option value="kyc" ${typeFilter === 'kyc' ? 'selected' : ''}>KYC</option>
        </select>
        <select class="filter-select" id="status-filter">
          <option value="">All Statuses</option>
          <option value="success" ${statusFilter === 'success' ? 'selected' : ''}>Success</option>
          <option value="partial" ${statusFilter === 'partial' ? 'selected' : ''}>Partial</option>
          <option value="failed"  ${statusFilter === 'failed'  ? 'selected' : ''}>Failed</option>
        </select>
        <span class="text-sm text-muted">${docs.length} result${docs.length !== 1 ? 's' : ''}</span>
      </div>
    ` : ''}

    ${docs.length === 0 && all.length === 0 ? renderEmptyDocuments() : ''}
    ${docs.length === 0 && all.length > 0   ? renderNoResults()     : ''}
    ${docs.length > 0                        ? renderTable(docs)     : ''}
  `;

  lucide.createIcons({ nodes: [container] });

  // Bind filter events
  const searchInput  = container.querySelector('#search-input');
  const typeSelect   = container.querySelector('#type-filter');
  const statusSelect = container.querySelector('#status-filter');
  const clearAllBtn  = container.querySelector('#clear-all-btn');

  searchInput?.addEventListener('input', () => {
    renderDocumentList(container, searchInput.value, typeSelect.value, statusSelect.value);
  });
  typeSelect?.addEventListener('change', () => {
    renderDocumentList(container, searchInput?.value || '', typeSelect.value, statusSelect.value);
  });
  statusSelect?.addEventListener('change', () => {
    renderDocumentList(container, searchInput?.value || '', typeSelect.value, statusSelect.value);
  });

  clearAllBtn?.addEventListener('click', () => {
    if (confirm(`Delete all ${all.length} document records from browser history? This cannot be undone.`)) {
      import('../storage.js').then(({ clearAllDocuments }) => {
        clearAllDocuments();
        updateDocBadge();
        showToast({ type: 'info', title: 'History Cleared', desc: 'All local document records deleted.' });
        renderDocumentList(container);
      });
    }
  });

  // Bind row actions
  container.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteId;
      deleteDocument(id);
      updateDocBadge();
      showToast({ type: 'info', title: 'Record Deleted', duration: 2000 });
      renderDocumentList(container, searchInput?.value || '', typeSelect?.value || '', statusSelect?.value || '');
    });
  });
}

function renderEmptyDocuments() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">
        <i data-lucide="files" class="icon-lg"></i>
      </div>
      <h3 class="empty-state-title">No documents yet</h3>
      <p class="empty-state-desc">
        Upload a document to start building your local processing history.
        Payslips, bank statements, tax returns, and KYC documents are all supported.
      </p>
      <a href="#/upload" class="btn btn-primary" style="margin-top:0.5rem;">
        <i data-lucide="upload" class="icon-sm"></i>
        Upload First Document
      </a>
    </div>
  `;
}

function renderNoResults() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">
        <i data-lucide="search-x" class="icon-lg"></i>
      </div>
      <h3 class="empty-state-title">No matching documents</h3>
      <p class="empty-state-desc">Try adjusting your search or filters.</p>
    </div>
  `;
}

function renderTable(docs) {
  const rows = docs.map((d) => {
    const typeLabel  = formatDocType(d.document_type);
    const typeCls    = getTypeCls(d.document_type);
    const conf       = d.extraction_confidence ?? d.classification_confidence;
    const confPct    = Math.round(conf * 100);
    const statusBadge = d.extraction_status === 'success' ? 'badge-success' : d.extraction_status === 'partial' ? 'badge-warning' : 'badge-error';

    return `
      <tr style="cursor:pointer;" onclick="window.location.hash='/document/${escHtml(d.id)}'">
        <td>
          <div class="table-filename">
            <div class="table-filename-icon">
              <i data-lucide="file-text" class="icon-xs"></i>
            </div>
            <span class="truncate" style="max-width:220px;" title="${escHtml(d.filename)}">${escHtml(d.filename)}</span>
          </div>
        </td>
        <td><span class="badge badge-${typeCls}">${typeLabel}</span></td>
        <td><span class="badge ${statusBadge}">${capitalize(d.extraction_status)}</span></td>
        <td class="tabular-nums" style="text-align:right;">
          <span style="font-weight:600;">${confPct}%</span>
          <div style="width:3rem; height:0.3rem; background:var(--bg-muted); border-radius:9999px; margin-top:0.25rem; overflow:hidden; display:inline-block; vertical-align:middle; margin-left:0.5rem;">
            <div style="width:${confPct}%; height:100%; background:${confPct>=80?'var(--success)':confPct>=60?'var(--warning)':'var(--error)'}; border-radius:9999px;"></div>
          </div>
        </td>
        <td class="text-muted text-xs font-mono">${escHtml(d.id.slice(0, 12))}...</td>
        <td class="text-muted text-xs">${formatRelativeTime(d.uploaded_at)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-icon-sm" title="View details" onclick="event.stopPropagation(); window.location.hash='/document/${escHtml(d.id)}'">
              <i data-lucide="eye" class="icon-xs"></i>
            </button>
            <button class="btn btn-ghost btn-icon-sm" title="Delete record" data-delete-id="${escHtml(d.id)}">
              <i data-lucide="trash-2" class="icon-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Type</th>
            <th>Status</th>
            <th style="text-align:right;">Confidence</th>
            <th>Document ID</th>
            <th>Uploaded</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
