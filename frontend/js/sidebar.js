/**
 * sidebar.js — Sidebar state, navigation active state, mobile toggle
 */

import { getAllDocuments } from './storage.js';

let sidebarOpen = true; // desktop default
let isMobile = () => window.innerWidth <= 768;

export function initSidebar() {
  const sidebar       = document.getElementById('sidebar');
  const overlay       = document.getElementById('sidebar-overlay');
  const toggleBtn     = document.getElementById('sidebar-toggle-btn');
  const closeBtn      = document.getElementById('sidebar-close-btn');
  const shell         = document.getElementById('app-shell');

  if (!sidebar) return;

  // Desktop: restore collapsed state
  const savedCollapsed = localStorage.getItem('credence_sidebar_collapsed') === 'true';
  if (savedCollapsed && !isMobile()) {
    shell.classList.add('sidebar-collapsed');
    sidebarOpen = false;
  }

  // Toggle button (header)
  toggleBtn?.addEventListener('click', () => {
    if (isMobile()) {
      openMobileSidebar();
    } else {
      toggleDesktopSidebar();
    }
  });

  // Close button (inside sidebar, mobile only)
  closeBtn?.addEventListener('click', () => {
    closeMobileSidebar();
  });

  // Overlay click
  overlay?.addEventListener('click', () => {
    closeMobileSidebar();
  });

  // Handle resize
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      // Ensure overlay is hidden on desktop
      closeMobileSidebar(false);
    }
  });

  // Update doc count badge
  updateDocBadge();
}

function openMobileSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  sidebar?.classList.add('open');
  overlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar(resetBody = true) {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('visible');
  if (resetBody) document.body.style.overflow = '';
}

function toggleDesktopSidebar() {
  const shell = document.getElementById('app-shell');
  sidebarOpen = !sidebarOpen;
  shell?.classList.toggle('sidebar-collapsed', !sidebarOpen);
  localStorage.setItem('credence_sidebar_collapsed', (!sidebarOpen).toString());
}

/**
 * Update the active nav item based on the current hash
 * @param {string} page — e.g. 'dashboard', 'upload', 'documents'
 */
export function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

/**
 * Update the breadcrumb
 * @param {string[]} parts
 */
export function setBreadcrumb(parts) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;

  bc.innerHTML = parts.map((p, i) => {
    const isLast = i === parts.length - 1;
    return isLast
      ? `<span class="breadcrumb-item">${p}</span>`
      : `<span class="breadcrumb-item">${p}</span><span class="breadcrumb-sep">/</span>`;
  }).join('');
}

/**
 * Update the document count badge in the sidebar
 */
export function updateDocBadge() {
  const badge = document.getElementById('doc-count-badge');
  if (!badge) return;
  const count = getAllDocuments().length;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/**
 * Close mobile sidebar when a nav link is clicked
 */
export function initNavLinkBehavior() {
  document.querySelectorAll('.nav-item').forEach((link) => {
    link.addEventListener('click', () => {
      if (isMobile()) {
        closeMobileSidebar();
      }
    });
  });
}
