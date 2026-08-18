/**
 * router.js — Hash-based SPA router for Credence
 *
 * Routes map hash patterns to page render functions.
 * e.g.  #/upload → renderUpload()
 *        #/document/abc123 → renderDocumentDetail('abc123')
 */

/** @type {Array<{ pattern: RegExp, render: (params: string[]) => Promise<void> }>} */
const routes = [];

let currentPage = null;

/**
 * Register a route
 * @param {string|RegExp} pattern — string like '/upload' or regex
 * @param {function} handler — async function(params)
 */
export function route(pattern, handler) {
  const regex = typeof pattern === 'string'
    ? new RegExp(`^${pattern.replace(/:[^/]+/g, '([^/]+)')}$`)
    : pattern;
  routes.push({ pattern: regex, handler });
}

/**
 * Navigate to a hash path
 * @param {string} path — e.g. '/upload'
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Dispatch the current hash to the right handler
 */
async function dispatch() {
  const hash = window.location.hash.slice(1) || '/dashboard';
  const path = hash.startsWith('/') ? hash : '/' + hash;

  // Strip query string if any
  const [cleanPath] = path.split('?');

  for (const { pattern, handler } of routes) {
    const match = cleanPath.match(pattern);
    if (match) {
      currentPage = cleanPath;
      await handler(match.slice(1));
      return;
    }
  }

  // 404 fallback → dashboard
  navigate('/dashboard');
}

/**
 * Start the router — listen for hash changes
 */
export function startRouter() {
  window.addEventListener('hashchange', () => dispatch());
  dispatch(); // handle current hash on load
}

/**
 * Get the current page path
 */
export function getCurrentPage() {
  return currentPage;
}
