/**
 * E Product Hub - History API Client-Side SPA Router
 * Clean URL routing with Route Guards for Auth & Admin
 */
import { getAuthState } from './auth.js';
import { setPageMeta } from './utils.js';

const routes = [];
let notFoundHandler = () => {};

export function registerRoute(pattern, handler, options = {}) {
  // Convert /product/:id to regex
  const paramNames = [];
  const regexStr = '^' + pattern
    .replace(/\/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '/([^/]+)';
    }) + '/?$';
  
  routes.push({
    pattern,
    regex: new RegExp(regexStr),
    paramNames,
    handler,
    options
  });
}

export function setNotFoundHandler(handler) {
  notFoundHandler = handler;
}

export function navigateTo(path) {
  if (window.location.pathname + window.location.search === path) return;
  window.history.pushState(null, '', path);
  handleRoute();
}

export function handleRoute() {
  const currentPath = window.location.pathname || '/';
  const searchParams = new URLSearchParams(window.location.search);
  const authState = getAuthState();

  // Scroll to top on page transition
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Restore default SEO meta tags on navigation with noindex for private/transient routes
  const NOINDEX_ROUTES = ['/admin', '/checkout', '/cart', '/profile', '/my-purchases', '/login', '/register'];
  const isNoindexRoute = NOINDEX_ROUTES.some((prefix) => currentPath === prefix || currentPath.startsWith(prefix + '/'));
  setPageMeta({ noindex: isNoindexRoute });

  // Toggle floating WhatsApp button on /admin route
  const waBtn = document.getElementById('floating-whatsapp-btn');
  if (waBtn) {
    if (currentPath.startsWith('/admin')) {
      waBtn.classList.add('hidden');
    } else {
      waBtn.classList.remove('hidden');
    }
  }

  // Update active state on nav links
  document.querySelectorAll('nav a, header a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('nav-link-active');
    } else {
      link.classList.remove('nav-link-active');
    }
  });

  // Find matching route
  for (const route of routes) {
    const match = currentPath.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
      });

      // Route guard: Requires Authentication
      if (route.options.authRequired && !authState.user) {
        window.history.replaceState(null, '', `/login?redirect=${encodeURIComponent(currentPath + window.location.search)}`);
        handleRoute();
        return;
      }

      // Route guard: Requires Admin
      if (route.options.adminRequired) {
        if (!authState.user) {
          window.history.replaceState(null, '', `/login?redirect=${encodeURIComponent(currentPath)}`);
          handleRoute();
          return;
        }
        if (!authState.isAdmin) {
          renderForbiddenPage();
          return;
        }
      }

      // Execute route handler
      route.handler({ params, query: searchParams, path: currentPath });
      return;
    }
  }

  // Fallback 404
  notFoundHandler({ path: currentPath });
}

function renderForbiddenPage() {
  const appEl = document.getElementById('app-main');
  if (!appEl) return;
  appEl.innerHTML = `
    <div class="max-w-md mx-auto py-16 px-4 text-center space-y-4">
      <div class="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">⛔</div>
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white">অনুমতি নেই (Forbidden)</h2>
      <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
        এই পেজটি শুধুমাত্র অ্যাডমিনদের জন্য সংরক্ষিত। আপনার অ্যাকাউন্টটি অ্যাডমিন তালিকায় নথিভুক্ত নয়।
      </p>
      <div class="pt-4">
        <a href="/" class="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium">হোমে ফিরে যান</a>
      </div>
    </div>
  `;
}

// Global link interceptor for SPA navigation
export function initRouter() {
  window.addEventListener('popstate', handleRoute);

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    const target = anchor.getAttribute('target');

    // Only intercept local, non-hash, same-origin links
    if (href && href.startsWith('/') && !href.startsWith('//') && (!target || target === '_self')) {
      e.preventDefault();
      navigateTo(href);
    }
  });

  // Run on initial load
  handleRoute();
}
