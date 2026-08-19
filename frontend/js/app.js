/**
 * app.js — Credence Frontend Application Entry Point
 *
 * Initialises the SPA: theme, sidebar, router, API health check.
 * All pages are lazy-loaded JS modules.
 *
 * Technology: HTML + CSS + Vanilla JavaScript (no React, no Node, no npm)
 * Backend: FastAPI at http://localhost:8000 (READ-ONLY)
 */

import { initTheme }                        from './theme.js';
import { initSidebar, initNavLinkBehavior } from './sidebar.js';
import { route, startRouter }               from './router.js';
import { checkBackendHealth }               from './api.js';
import { renderDashboard }                  from './pages/dashboard.js';
import { renderApplicationDetail }          from './pages/application-detail.js';
import { renderApplications }               from './pages/applications.js';
import { renderNewApplication }             from './pages/new-application.js';
import { renderUpload }                     from './pages/upload.js';
import { renderDocuments }                  from './pages/documents.js';
import { renderDocumentDetail }             from './pages/document-detail.js';
import { renderAnalytics }                  from './pages/analytics.js';
import { renderSettings }                   from './pages/settings.js';
import { renderSupport }                    from './pages/support.js';

// ── Register all routes ──────────────────────────────────────
route('/dashboard',        () => renderDashboard());
route('/application/new',  () => renderNewApplication());
route('/application/([^/]+)', ([id]) => renderApplicationDetail(id));
route('/applications',     () => renderApplications());
route('/upload',           () => renderUpload());
route('/documents',        () => renderDocuments());
route('/document/([^/]+)', ([id]) => renderDocumentDetail(id));
route('/analytics',        () => renderAnalytics());
route('/settings',         () => renderSettings());
route('/support',          () => renderSupport());

// ── App initialisation ───────────────────────────────────────
async function initApp() {
  // 1. Apply saved theme (before any render to avoid flash)
  initTheme();

  // 2. Init sidebar + mobile behaviour
  initSidebar();
  initNavLinkBehavior();

  // 3. Initialise Lucide icons globally on the shell
  if (window.lucide) {
    lucide.createIcons();
  }

  // 4. Start hash-based router (renders first page)
  startRouter();

  // 5. Check backend health in background
  checkAndDisplayApiStatus();
}

async function checkAndDisplayApiStatus() {
  const statusDot  = document.querySelector('.status-dot');
  const statusText = document.querySelector('.status-text');

  const isOnline = await checkBackendHealth();

  if (statusDot) {
    statusDot.className = `status-dot ${isOnline ? 'status-online' : 'status-offline'}`;
  }
  if (statusText) {
    statusText.textContent = isOnline ? 'API Online' : 'API Offline';
  }

  // Re-check every 30 seconds
  setTimeout(checkAndDisplayApiStatus, 30000);
}

// ── Boot ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
