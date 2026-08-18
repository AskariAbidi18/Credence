/**
 * pages/dashboard.js — Credence Dashboard
 *
 * Shows session-level statistics derived from localStorage.
 * Data comes exclusively from documents uploaded during browser sessions.
 * No fabricated backend data.
 */

import { getSessionStats, getAllDocuments, getDocsByType } from '../storage.js';
import { navigate } from '../router.js';
import { setActiveNav, setBreadcrumb } from '../sidebar.js';

export async function renderDashboard() {
  setActiveNav('dashboard');
  setBreadcrumb(['Credence', 'Dashboard']);

  const stats  = getSessionStats();
  const docs   = getAllDocuments();
  const recent = docs.slice(0, 7);

  const content = document.getElementById('page-content');
  content.innerHTML = '';
  content.className = 'page-content page-enter';

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">AI-powered loan document processing overview</p>
      </div>
      <a href="#/upload" class="btn btn-primary">
        <i data-lucide="upload" class="icon-sm"></i>
        Upload Document
      </a>
    </div>

    ${stats.total === 0 ? renderEmptyDashboard() : renderDashboardContent(stats, recent)}
  `;

  lucide.createIcons({ nodes: [content] });

  // Animate confidence bars after render
  setTimeout(() => {
    if (stats.total > 0 && stats.avgConfidence != null) {
      animateBar('avg-confidence-bar', stats.avgConfidence * 100);
    }
  }, 100);
}

function renderEmptyDashboard() {
  return `
    <div class="empty-state" style="height: 60vh;">
      <div class="empty-state-icon">
        <i data-lucide="landmark" class="icon-lg"></i>
      </div>
      <h3 class="empty-state-title">Welcome to Credence</h3>
      <p class="empty-state-desc">
        AI-powered loan document processing. Upload your first document to see
        classification results, extracted data, and session analytics here.
      </p>
      <a href="#/upload" class="btn btn-primary btn-lg" style="margin-top: 0.5rem;">
        <i data-lucide="upload" class="icon-sm"></i>
        Upload Your First Document
      </a>
      <p class="text-xs text-muted" style="margin-top: 0.75rem;">
        Supports PDF, PNG, JPG — Payslips, Bank Statements, Tax Returns, KYC
      </p>
    </div>
  `;
}

function renderDashboardContent(stats, recent) {
  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
  const avgConfPct  = stats.avgConfidence != null ? Math.round(stats.avgConfidence * 100) : null;

  return `
    <!-- Session notice -->
    <div class="session-banner">
      <i data-lucide="info" class="icon-sm" style="flex-shrink:0;"></i>
      <span>All statistics are derived from your local browser session history — not a backend database.</span>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid" style="margin-bottom: 1.5rem;">

      <div class="stat-card">
        <div class="stat-label">
          <div class="stat-icon" style="background: rgba(99,102,241,0.12); color: #818cf8;">
            <i data-lucide="files" class="icon-sm"></i>
          </div>
          Documents Processed
        </div>
        <div class="stat-value">${stats.total}</div>
        <div class="stat-change">All time in this browser</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">
          <div class="stat-icon" style="background: rgba(16,185,129,0.12); color: #34d399;">
            <i data-lucide="check-circle" class="icon-sm"></i>
          </div>
          Successful Extractions
        </div>
        <div class="stat-value">${stats.success}</div>
        <div class="stat-change positive">${successRate}% success rate</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">
          <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: #fbbf24;">
            <i data-lucide="alert-circle" class="icon-sm"></i>
          </div>
          Partial Extractions
        </div>
        <div class="stat-value">${stats.partial}</div>
        <div class="stat-change">Incomplete data extracted</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">
          <div class="stat-icon" style="background: rgba(239,68,68,0.12); color: #f87171;">
            <i data-lucide="x-circle" class="icon-sm"></i>
          </div>
          Failed Extractions
        </div>
        <div class="stat-value">${stats.failed}</div>
        <div class="stat-change ${stats.failed > 0 ? 'negative' : ''}">
          ${stats.failed === 0 ? 'No failures' : 'Needs review'}
        </div>
      </div>

    </div>

    <!-- Average Confidence + Recent Documents -->
    <div class="flex gap-4" style="flex-wrap: wrap; align-items: flex-start;">

      <!-- Confidence Card -->
      <div class="card" style="flex: 1; min-width: 240px;">
        <div class="card-header">
          <div>
            <div class="card-title">Avg. Extraction Confidence</div>
            <div class="card-description">Across all processed documents</div>
          </div>
        </div>
        <div class="card-content">
          ${avgConfPct != null ? `
            <div style="margin-bottom: 1.5rem;">
              <div class="stat-value" style="font-size: 2.5rem; margin-bottom: 0.25rem;">${avgConfPct}<span style="font-size: 1.25rem; color: var(--fg-muted);">%</span></div>
              <div class="confidence-track" style="height: 0.625rem;">
                <div class="confidence-fill ${avgConfPct >= 80 ? 'high' : avgConfPct >= 60 ? 'medium' : 'low'}" id="avg-confidence-bar"></div>
              </div>
            </div>
          ` : '<p class="text-muted">No data yet</p>'}
          ${renderDocTypeBreakdown()}
        </div>
      </div>

      <!-- Recent Documents -->
      <div class="card" style="flex: 2; min-width: 320px;">
        <div class="card-header">
          <div class="card-title">Recent Documents</div>
          <a href="#/documents" class="btn btn-outline btn-sm">
            View all <i data-lucide="chevron-right" class="icon-xs"></i>
          </a>
        </div>
        <div class="card-content" style="padding-top: 0.75rem;">
          ${recent.length === 0 ? '<p class="text-muted text-sm">No documents yet</p>' : renderRecentTable(recent)}
        </div>
      </div>

    </div>
  `;
}

function renderDocTypeBreakdown() {
  const byType = getDocsByType();
  const total  = Object.values(byType).reduce((a, b) => a + b, 0);
  if (total === 0) return '';

  const typeConfig = {
    payslip:       { label: 'Payslip',        cls: 'payslip' },
    bank_statement:{ label: 'Bank Statement', cls: 'bank' },
    tax_return:    { label: 'Tax Return',     cls: 'tax' },
    kyc:           { label: 'KYC',            cls: 'kyc' },
  };

  const rows = Object.entries(typeConfig)
    .filter(([k]) => byType[k] > 0)
    .map(([k, cfg]) => {
      const count = byType[k];
      const pct   = Math.round((count / total) * 100);
      return `
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.625rem;">
          <span class="doc-type-dot ${cfg.cls}"></span>
          <span class="text-sm" style="flex:1;">${cfg.label}</span>
          <span class="text-xs font-semibold tabular-nums">${count}</span>
          <div class="confidence-track" style="width:4rem; height:0.375rem;">
            <div class="confidence-fill high" style="width:${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');

  return `
    <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.5rem;">
      <p class="text-xs font-semibold text-muted" style="margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;">By Document Type</p>
      ${rows}
    </div>
  `;
}

function renderRecentTable(docs) {
  const rows = docs.map((d) => {
    const typeLabel = formatDocType(d.document_type);
    const conf      = d.extraction_confidence ?? d.classification_confidence;
    const confPct   = Math.round(conf * 100);
    const statusCls = d.extraction_status === 'success' ? 'badge-success' : d.extraction_status === 'partial' ? 'badge-warning' : 'badge-error';
    const time      = formatRelativeTime(d.uploaded_at);

    return `
      <tr style="cursor:pointer;" onclick="window.location.hash='/document/${d.id}'">
        <td>
          <div class="table-filename">
            <div class="table-filename-icon">
              <i data-lucide="file-text" class="icon-xs"></i>
            </div>
            <span class="truncate" style="max-width: 180px;" title="${escHtml(d.filename)}">${escHtml(d.filename)}</span>
          </div>
        </td>
        <td><span class="badge badge-${getTypeCls(d.document_type)}">${typeLabel}</span></td>
        <td><span class="badge ${statusCls}">${capitalize(d.extraction_status)}</span></td>
        <td class="tabular-nums text-right">${confPct}%</td>
        <td class="text-muted text-xs">${time}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-wrap" style="border-radius: var(--radius);">
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Type</th>
            <th>Status</th>
            <th style="text-align:right;">Confidence</th>
            <th>Uploaded</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ── Helpers ──────────────────────────────────────────────────

function animateBar(id, pct) {
  const el = document.getElementById(id);
  if (el) requestAnimationFrame(() => { el.style.width = pct + '%'; });
}

export function formatDocType(type) {
  const map = {
    payslip:        'Payslip',
    bank_statement: 'Bank Statement',
    tax_return:     'Tax Return',
    kyc:            'KYC',
  };
  return map[type] ?? type;
}

export function getTypeCls(type) {
  const map = {
    payslip:        'payslip',
    bank_statement: 'bank',
    tax_return:     'tax',
    kyc:            'kyc',
  };
  return map[type] ?? 'muted';
}

export function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

export function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}
