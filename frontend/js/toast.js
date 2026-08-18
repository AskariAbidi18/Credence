/**
 * toast.js — Toast notification system
 */

/**
 * Show a toast notification
 * @param {{ title: string, desc?: string, type?: 'success'|'error'|'info'|'warning', duration?: number }} opts
 */
export function showToast({ title, desc = '', type = 'info', duration = 4000 }) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconMap = {
    success: 'check-circle',
    error:   'x-circle',
    warning: 'alert-triangle',
    info:    'info',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i data-lucide="${iconMap[type]}" class="toast-icon icon-md"></i>
    <div class="toast-body">
      <p class="toast-title">${escHtml(title)}</p>
      ${desc ? `<p class="toast-desc">${escHtml(desc)}</p>` : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss">
      <i data-lucide="x" class="icon-sm"></i>
    </button>
  `;

  container.appendChild(toast);
  lucide.createIcons({ nodes: [toast] });

  const dismiss = () => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast-close')?.addEventListener('click', dismiss);
  if (duration > 0) setTimeout(dismiss, duration);
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
