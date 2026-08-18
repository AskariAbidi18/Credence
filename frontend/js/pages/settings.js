/**
 * pages/settings.js — Settings Page (UI only)
 *
 * Local preference controls. No backend settings API exists.
 */

import { setActiveNav, setBreadcrumb } from '../sidebar.js';
import { setTheme, isDarkMode } from '../theme.js';
import { BACKEND_URL } from '../api.js';
import { clearAllDocuments } from '../storage.js';
import { updateDocBadge } from '../sidebar.js';
import { showToast } from '../toast.js';

export async function renderSettings() {
  setActiveNav('settings');
  setBreadcrumb(['Credence', 'Settings']);

  const content = document.getElementById('page-content');
  content.innerHTML = '';
  content.className = 'page-content page-enter';

  const dark = isDarkMode();
  const savedUrl = localStorage.getItem('credence_backend_url') || BACKEND_URL;

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Frontend preferences and configuration</p>
      </div>
    </div>

    <!-- Appearance -->
    <div class="card" style="margin-bottom:1rem;">
      <div class="card-header">
        <div>
          <div class="card-title">Appearance</div>
          <div class="card-description">Visual preferences</div>
        </div>
      </div>
      <div class="card-content">
        <div class="settings-row">
          <div class="settings-row-info">
            <h4>Dark Mode</h4>
            <p>Use dark colour scheme for the interface</p>
          </div>
          <div class="toggle ${dark ? 'on' : ''}" id="dark-mode-toggle" role="switch" aria-checked="${dark}" tabindex="0"></div>
        </div>
      </div>
    </div>

    <!-- Backend Configuration -->
    <div class="card" style="margin-bottom:1rem;">
      <div class="card-header">
        <div>
          <div class="card-title">Backend Configuration</div>
          <div class="card-description">Configure the Credence FastAPI backend URL</div>
        </div>
      </div>
      <div class="card-content">
        <div class="session-banner" style="margin-bottom:1rem;">
          <i data-lucide="alert-circle" class="icon-sm" style="flex-shrink:0;"></i>
          <span>The backend URL is configured in <code style="font-family:monospace;font-size:0.8em;">js/api.js</code>. The field below saves a session-level override to localStorage.</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="backend-url-input">Backend API URL</label>
          <div class="flex gap-2">
            <input type="url" id="backend-url-input" class="form-input" value="${savedUrl}" placeholder="http://localhost:8000" />
            <button class="btn btn-outline" id="save-url-btn">Save</button>
            <button class="btn btn-ghost" id="test-url-btn">Test</button>
          </div>
          <p class="text-xs text-muted" style="margin-top:0.375rem;">Reload the page after changing this to apply.</p>
        </div>
        <div id="url-test-result" class="hidden" style="margin-top:0.75rem;"></div>
      </div>
    </div>

    <!-- Data & Storage -->
    <div class="card" style="margin-bottom:1rem;">
      <div class="card-header">
        <div>
          <div class="card-title">Data &amp; Storage</div>
          <div class="card-description">Manage local browser data</div>
        </div>
      </div>
      <div class="card-content">
        <div class="settings-row">
          <div class="settings-row-info">
            <h4>Document History</h4>
            <p>Processed documents stored in this browser's localStorage</p>
          </div>
          <button class="btn btn-danger btn-sm" id="clear-history-btn">
            <i data-lucide="trash-2" class="icon-xs"></i>
            Clear History
          </button>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <h4>All Preferences</h4>
            <p>Reset theme, sidebar state, and all stored settings</p>
          </div>
          <button class="btn btn-outline btn-sm" id="reset-prefs-btn">
            <i data-lucide="rotate-ccw" class="icon-xs"></i>
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- About -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">About Credence</div>
      </div>
      <div class="card-content">
        <div class="flex gap-4 flex-wrap">
          <div class="result-field">
            <span class="result-field-label">Product</span>
            <span class="result-field-value">Credence — AI Loan Document Processing</span>
          </div>
          <div class="result-field">
            <span class="result-field-label">Frontend</span>
            <span class="result-field-value">HTML + CSS + Vanilla JavaScript</span>
          </div>
          <div class="result-field">
            <span class="result-field-label">Backend</span>
            <span class="result-field-value">FastAPI + Anthropic/Groq AI</span>
          </div>
          <div class="result-field">
            <span class="result-field-label">Backend URL</span>
            <span class="result-field-value mono">${savedUrl}</span>
          </div>
          <div class="result-field">
            <span class="result-field-label">Document Types</span>
            <span class="result-field-value">Payslip, Bank Statement, Tax Return, KYC</span>
          </div>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons({ nodes: [content] });

  // Dark mode toggle
  const toggleEl = document.getElementById('dark-mode-toggle');
  toggleEl?.addEventListener('click', () => {
    const next = !toggleEl.classList.contains('on');
    toggleEl.classList.toggle('on', next);
    setTheme(next ? 'dark' : 'light');
  });

  // Save backend URL
  document.getElementById('save-url-btn')?.addEventListener('click', () => {
    const url = document.getElementById('backend-url-input')?.value?.trim();
    if (url) {
      localStorage.setItem('credence_backend_url', url);
      showToast({ type: 'success', title: 'Backend URL saved', desc: 'Reload the page to apply.', duration: 3000 });
    }
  });

  // Test backend URL
  document.getElementById('test-url-btn')?.addEventListener('click', async () => {
    const url      = document.getElementById('backend-url-input')?.value?.trim();
    const resultEl = document.getElementById('url-test-result');
    if (!resultEl || !url) return;

    resultEl.innerHTML = `<p class="text-sm text-muted"><span class="spinner spinner-sm" style="display:inline-block;vertical-align:middle;margin-right:0.4rem;"></span> Testing...</p>`;
    resultEl.classList.remove('hidden');

    try {
      const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        resultEl.innerHTML = `<div class="badge badge-success" style="font-size:0.8rem;">✓ Online — ${data.message || 'API reachable'}</div>`;
      } else {
        resultEl.innerHTML = `<div class="badge badge-warning">HTTP ${res.status}</div>`;
      }
    } catch (e) {
      resultEl.innerHTML = `<div class="badge badge-error">✗ Unreachable — ${e.message}</div>`;
    }
  });

  // Clear history
  document.getElementById('clear-history-btn')?.addEventListener('click', () => {
    if (confirm('Delete all document history from localStorage? This cannot be undone.')) {
      clearAllDocuments();
      updateDocBadge();
      showToast({ type: 'info', title: 'History Cleared' });
    }
  });

  // Reset all preferences
  document.getElementById('reset-prefs-btn')?.addEventListener('click', () => {
    if (confirm('Reset all preferences (theme, sidebar, backend URL)?')) {
      ['credence_theme', 'credence_sidebar_collapsed', 'credence_backend_url'].forEach((k) => localStorage.removeItem(k));
      showToast({ type: 'info', title: 'Preferences Reset', desc: 'Reloading...' });
      setTimeout(() => window.location.reload(), 1200);
    }
  });
}
