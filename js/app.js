/**
 * E Product Hub - Main Application Controller
 * Handles SPA state, theme, responsive layouts, route rendering and event binding.
 */
import { 
  getAuthState, 
  subscribeAuth, 
  loginUser, 
  registerUser, 
  logoutUser, 
  resendVerificationEmail, 
  refreshVerifiedState,
  waitForAuthReady,
  resetPassword,
  updateUserProfile 
} from './auth.js';
import { 
  loadCart, 
  addToCart, 
  removeFromCart, 
  clearCart, 
  getCartProductDetails, 
  subscribeCart 
} from './cart.js';
import { 
  loadSliders, 
  renderHeroSlider, 
  fetchActiveProducts, 
  createProductCard, 
  getHasMoreProducts, 
  checkUserOwnsProduct,
  guessCategory,
  fetchSearchProductsCache
} from './products.js';
import { 
  getPaymentConfig, 
  filterUnownedProducts, 
  claimTransactionBatch 
} from './checkout.js';
import { 
  loadUserPurchases, 
  fetchProductDownloadFile 
} from './purchases.js';
import { 
  adminLoadProducts, 
  adminSaveProduct, 
  adminGetProductFile, 
  adminDeleteProduct, 
  adminLoadSliders, 
  adminSaveSlider, 
  adminDeleteSlider, 
  adminLoadPaymentConfig, 
  adminSavePaymentConfig, 
  adminLoadMessages, 
  adminDeleteMessage, 
  adminLoadTransactions,
  adminLoadSiteConfig,
  adminSaveSiteConfig,
  loadPublicSiteConfig,
  adminLoadPurchases,
  adminRevokePurchase,
  adminGrantManualAccess
} from './admin.js';
import { getImgBBApiKey, setImgBBApiKey, uploadImageToImgBB } from './imgbb.js';
import { 
  registerRoute, 
  initRouter, 
  navigateTo, 
  setNotFoundHandler 
} from './router.js';
import { 
  formatBDT, 
  formatDate, 
  getSafeImageUrl, 
  isSafeImageUrl, 
  parseYouTubeVideoId, 
  renderSafeDescription, 
  showToast, 
  showConfirmDialog, 
  normalizePhone,
  getCooldownRemainingSeconds,
  getProductFallbackSvg,
  getSliderFallbackSvg,
  escapeHtml,
  sanitizeRedirect,
  setPageMeta
} from './utils.js';
import { db } from './firebase-config.js';
import { doc, getDoc, collection, addDoc, getDocs, query, where, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ==========================================
// Theme Management
// ==========================================
function initTheme() {
  const saved = localStorage.getItem('eph_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('eph_theme', isDark ? 'dark' : 'light');
  updateThemeIcon();
}

function updateThemeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.theme-toggle-icon').forEach((el) => {
    el.innerHTML = isDark
      ? `<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
      : `<svg class="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
  });
}

// ==========================================
// Global Layout Elements (Header, Banner, Footer)
// ==========================================
function renderHeader() {
  const header = document.getElementById('app-header');
  if (!header) return;

  const authState = getAuthState();
  const user = authState.user;
  const isAdmin = authState.isAdmin;
  const currentPath = window.location.pathname;

  const isActive = (path) => currentPath === path ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold';

  header.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 sm:h-20 gap-8">
        
        <!-- Zone 1: Single text element wordmark in display face -->
        <a href="/" class="flex items-center gap-2.5 sm:gap-3 group shrink-0 select-none">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg sm:text-xl shadow-xs group-hover:bg-indigo-700 transition">
            E
          </div>
          <span class="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
            E Product Hub
          </span>
        </a>

        <!-- Zone 2: 4-5 concise single-line text navigation links -->
        <nav class="hidden md:flex items-center gap-7 text-sm">
          <a href="/" class="${isActive('/')} transition whitespace-nowrap">হোম</a>
          <a href="/products" class="${isActive('/products')} transition whitespace-nowrap">সব প্রোডাক্ট</a>
          <a href="/about" class="${isActive('/about')} transition whitespace-nowrap">আমাদের সম্পর্কে</a>
          <a href="/contact" class="${isActive('/contact')} transition whitespace-nowrap">যোগাযোগ</a>
          ${user ? `<a href="/my-purchases" class="${isActive('/my-purchases')} transition whitespace-nowrap">আমার পারচেজ</a>` : ''}
          ${isAdmin ? `<a href="/admin" class="${isActive('/admin')} text-rose-600 dark:text-rose-400 transition whitespace-nowrap">অ্যাডমিন</a>` : ''}
        </nav>

        <!-- Zone 3: Primary action + theme/cart controls -->
        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          
          <!-- Theme Toggle -->
          <button type="button" id="theme-toggle-btn" class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95" title="থিম পরিবর্তন" aria-label="Toggle theme">
            <span class="theme-toggle-icon"></span>
          </button>

          <!-- Cart Button with numeric badge -->
          <a href="/cart" class="relative w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95" title="শপিং কার্ট" aria-label="Shopping Cart">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
            <span class="cart-count-badge hidden absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">0</span>
          </a>

          <!-- Primary User Control -->
          ${user ? `
            <a href="/profile" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition active:scale-95" title="প্রোফাইল">
              <span class="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                ${escapeHtml((user.displayName || user.email || 'U').charAt(0).toUpperCase())}
              </span>
              <span class="hidden sm:inline max-w-[90px] truncate text-xs font-semibold">${escapeHtml(user.displayName || user.email.split('@')[0])}</span>
            </a>
          ` : `
            <a href="/login" class="btn-primary text-xs sm:text-sm px-4 py-2 rounded-xl whitespace-nowrap">
              লগইন
            </a>
          `}

          <!-- Mobile Menu Hamburger Button -->
          <button type="button" id="mobile-menu-btn" class="md:hidden w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95" aria-label="Menu">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>

      </div>

      <!-- Mobile Dropdown Navigation -->
      <div id="mobile-menu" class="hidden md:hidden pb-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1 animate-fadeIn">
        <a href="/" class="block px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">হোম</a>
        <a href="/products" class="block px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">সব প্রোডাক্ট</a>
        <a href="/about" class="block px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">আমাদের সম্পর্কে</a>
        <a href="/contact" class="block px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">যোগাযোগ</a>
        ${user ? `<a href="/my-purchases" class="block px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">আমার পারচেজ ও ফাইল</a>` : ''}
        ${isAdmin ? `<a href="/admin" class="block px-3.5 py-2.5 rounded-xl font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">অ্যাডমিন প্যানেল</a>` : ''}
        ${user ? `<a href="/profile" class="block px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">প্রোফাইল</a>` : ''}
      </div>

    </div>
  `;

  // Attach event handlers
  document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);
  updateThemeIcon();

  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenuBtn?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('hidden');
  });
}

function renderEmailVerificationBanner() {
  const container = document.getElementById('email-verification-banner');
  if (!container) return;

  const { user } = getAuthState();
  if (user && !user.emailVerified) {
    container.innerHTML = `
      <div class="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs sm:text-sm font-semibold flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div class="flex items-center gap-2">
          <span class="text-base">⚠️</span>
          <span>আপনার ইমেইল (${escapeHtml(user.email)}) এখনো ভেরিফাই করা হয়নি। প্রোডাক্ট কেনার জন্য ইমেইল ভেরিফিকেশন বাধ্যতামূলক।</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" id="resend-verify-btn" class="bg-slate-950 text-white px-3 py-1 rounded-lg text-xs hover:bg-slate-800 transition">
            ভেরিফিকেশন ইমেইল পাঠান
          </button>
          <button type="button" id="refresh-verify-btn" class="bg-amber-600 text-white px-2 py-1 rounded-lg text-xs hover:bg-amber-700 transition" title="রিলোড">
            🔄 রিলোড
          </button>
        </div>
      </div>
    `;
    container.classList.remove('hidden');

    document.getElementById('resend-verify-btn')?.addEventListener('click', async () => {
      await resendVerificationEmail();
    });
    document.getElementById('refresh-verify-btn')?.addEventListener('click', async () => {
      const verified = await refreshVerifiedState();
      if (verified) {
        showToast('ইমেইল সফলভাবে ভেরিফাই হয়েছে!', 'success');
        container.classList.add('hidden');
      } else {
        showToast('ইমেইল এখনও ভেরিফাই করা হয়নি।', 'info');
      }
      renderEmailVerificationBanner();
    });
  } else {
    container.innerHTML = '';
    container.classList.add('hidden');
  }
}

async function renderFooter() {
  const footer = document.getElementById('app-footer');
  if (!footer) return;

  const cfg = await loadPublicSiteConfig();

  footer.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        
        <!-- Column 1: Brand & Bio -->
        <div class="space-y-4">
          <a href="/" class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-xs">E</div>
            <span class="font-extrabold text-lg text-slate-900 dark:text-white">${escapeHtml(cfg?.siteName || 'E Product Hub')}</span>
          </a>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            ${cfg?.footerNote ? escapeHtml(cfg.footerNote) : 'বাংলাদেশের নির্ভরযোগ্য প্রিমিয়াম ডিজিটাল প্রোডাক্ট মার্কেটপ্লেস। মোবাইল ব্যাংকিং পেমেন্টে তাৎক্ষণিক স্বয়ংক্রিয় ফাইল ডাউনলোড অ্যাক্সেস।'}
          </p>
          
          <!-- Social & Contact Links from Site Config -->
          ${(cfg && (cfg.whatsapp || cfg.telegram || cfg.facebookUrl || cfg.email || cfg.phone)) ? `
            <div class="flex flex-wrap items-center gap-2 pt-2 text-xs">
              ${cfg.whatsapp ? `
                <a href="https://wa.me/${escapeHtml(cfg.whatsapp)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20 transition flex items-center gap-1">
                  <span>💬</span> WhatsApp
                </a>
              ` : ''}
              ${cfg.telegram ? `
                <a href="https://t.me/${escapeHtml(cfg.telegram)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold hover:bg-sky-500/20 transition flex items-center gap-1">
                  <span>✈️</span> Telegram
                </a>
              ` : ''}
              ${cfg.facebookUrl ? `
                <a href="${escapeHtml(cfg.facebookUrl)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/20 transition flex items-center gap-1">
                  <span>📘</span> Facebook
                </a>
              ` : ''}
              ${cfg.email ? `
                <a href="mailto:${encodeURIComponent(cfg.email)}" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition flex items-center gap-1">
                  <span>✉️</span> ইমেইল
                </a>
              ` : ''}
              ${cfg.phone ? `
                <a href="tel:${escapeHtml(cfg.phone)}" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition flex items-center gap-1">
                  <span>📞</span> ${escapeHtml(cfg.phone)}
                </a>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Column 2: Quick Links -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">দ্রুত লিঙ্ক</h4>
          <ul class="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <li><a href="/" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">হোম পেজ</a></li>
            <li><a href="/products" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">সব প্রোডাক্ট</a></li>
            <li><a href="/my-purchases" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">আমার পারচেজ ও ফাইল</a></li>
            <li><a href="/cart" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">শপিং কার্ট</a></li>
          </ul>
        </div>

        <!-- Column 3: Payment Methods -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">পেমেন্ট মাধ্যম</h4>
          <div class="flex flex-wrap gap-2 text-xs">
            <span class="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold border border-pink-500/20">bKash</span>
            <span class="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20">Nagad</span>
            <span class="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">Rocket</span>
            <span class="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">Upay</span>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 pt-1 leading-relaxed">
            স্বয়ংক্রিয় TrxSync প্রযুক্তির মাধ্যমে কোনো মানুষের হস্তক্ষেপ ছাড়াই তাৎক্ষণিক ফাইল ডেলিভারি।
          </p>
        </div>

        <!-- Column 4: Policies & Help -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">নীতিমালা ও সহায়তা</h4>
          <ul class="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <li><a href="/terms" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">ব্যবহারের শর্তাবলী</a></li>
            <li><a href="/privacy" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">গোপনীয়তা নীতি</a></li>
            <li><a href="/refund-policy" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">রিফান্ড পলিসি</a></li>
            <li><a href="/contact" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">যোগাযোগ ও কাস্টমার সাপোর্ট</a></li>
            <li><a href="/about" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">আমাদের সম্পর্কে ও FAQ</a></li>
          </ul>
        </div>

      </div>

      <div class="mt-10 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500 text-center sm:text-left">
        <div>
          © ${new Date().getFullYear()} ${escapeHtml(cfg?.siteName || 'E Product Hub')}. সর্বস্বত্ব সংরক্ষিত।
        </div>
        <div class="flex items-center gap-4 text-xs">
          <a href="/terms" class="hover:underline">শর্তাবলী</a>
          <a href="/privacy" class="hover:underline">গোপনীয়তা</a>
          <a href="/refund-policy" class="hover:underline">রিফান্ড</a>
        </div>
      </div>
    </div>
  `;

  // Update or attach Floating WhatsApp Button
  let waBtn = document.getElementById('floating-whatsapp-btn');
  if (cfg?.whatsapp) {
    if (!waBtn) {
      waBtn = document.createElement('a');
      waBtn.id = 'floating-whatsapp-btn';
      waBtn.target = '_blank';
      waBtn.rel = 'noopener noreferrer';
      waBtn.className = 'fixed bottom-6 left-6 z-40 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95';
      waBtn.title = 'WhatsApp এ সহায়তা নিন';
      waBtn.innerHTML = `
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.489.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      `;
      document.body.appendChild(waBtn);
    }
    waBtn.href = `https://wa.me/${escapeHtml(cfg.whatsapp)}`;
    // Hide on admin page
    if (window.location.pathname.startsWith('/admin')) {
      waBtn.classList.add('hidden');
    } else {
      waBtn.classList.remove('hidden');
    }
  } else if (waBtn) {
    waBtn.remove();
  }
}

// Subscribe to Auth changes to update header and verification banner
subscribeAuth(() => {
  renderHeader();
  renderEmailVerificationBanner();
});

// ==========================================
// Page 1: Home Page (/)
// ==========================================
async function renderHomePage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  main.innerHTML = `
    <div class="space-y-10 sm:space-y-14">
      
      <!-- Hero Slider Container -->
      <section id="home-hero-slider" class="w-full"></section>

      <!-- Headline, Subtitle & Search Section below the slider -->
      <section class="max-w-3xl mx-auto text-center space-y-4 px-2">
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          ডিজিটাল প্রোডাক্টের প্রিমিয়াম মার্কেটপ্লেস
        </h1>
        <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          ই-বুক, সোর্স কোড, ইউআই কিট ও অটোমেশন স্ক্রিপ্ট—মোবাইল ব্যাংকিং পেমেন্টে তাৎক্ষণিক স্বয়ংক্রিয় ক্লাউড ডাউনলোড।
        </p>

        <!-- Search Box -->
        <div class="relative max-w-xl mx-auto pt-2">
          <input type="text" id="home-search-input" placeholder="প্রোডাক্টের নাম বা বিষয় দিয়ে খুঁজুন..." class="input-field pl-11 pr-10 py-3 rounded-2xl shadow-xs text-sm sm:text-base">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <button type="button" id="home-search-clear" class="hidden absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold p-1">✕</button>
        </div>

        <!-- Interactive Category Filter Tabs -->
        <div class="flex items-center justify-center flex-wrap gap-2 pt-1 text-xs">
          <button type="button" class="home-cat-tab active-cat px-3.5 py-1.5 rounded-xl font-semibold bg-indigo-600 text-white transition-all shadow-xs" data-cat="all">সব প্রোডাক্ট</button>
          <button type="button" class="home-cat-tab px-3.5 py-1.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all" data-cat="ebook">ই-বুক / PDF</button>
          <button type="button" class="home-cat-tab px-3.5 py-1.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all" data-cat="ui">UI কিট</button>
          <button type="button" class="home-cat-tab px-3.5 py-1.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all" data-cat="script">স্ক্রিপ্ট</button>
          <button type="button" class="home-cat-tab px-3.5 py-1.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all" data-cat="graphic">গ্রাফিক্স</button>
        </div>
      </section>

      <!-- Products Section -->
      <section class="space-y-6">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
          <div class="flex items-center gap-3">
            <div class="w-2.5 h-6 rounded-full bg-indigo-600"></div>
            <h2 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">নতুন রিলিজসমূহ</h2>
          </div>
          <a href="/products" class="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            সবগুলো দেখুন <span>→</span>
          </a>
        </div>

        <!-- Responsive Grid: 1 col on small phones, 2 on >=480px, 3-4 on desktop -->
        <div id="home-products-grid" class="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          <!-- Skeletons -->
          ${[1, 2, 3, 4].map(() => `
            <div class="surface-card rounded-2xl p-4 space-y-3 h-full">
              <div class="skeleton aspect-16/10 rounded-xl"></div>
              <div class="skeleton h-5 w-3/4 rounded-md"></div>
              <div class="skeleton h-4 w-1/2 rounded-md"></div>
              <div class="skeleton h-9 w-full rounded-xl mt-4"></div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Trust Badges -->
      <section class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div class="surface-card p-5 sm:p-6 rounded-2xl flex items-start gap-4 hover:border-indigo-500/30 transition-all">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold shrink-0">⚡</div>
          <div class="space-y-1">
            <h3 class="font-bold text-slate-900 dark:text-white text-sm sm:text-base">তাৎক্ষণিক অটো ডেলিভারি</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">পেমেন্ট সম্পন্ন হওয়ামাত্র আপনার অ্যাকাউন্টে স্বয়ংক্রিয়ভাবে ডাউনলোড লিংক তৈরি হয়।</p>
          </div>
        </div>

        <div class="surface-card p-5 sm:p-6 rounded-2xl flex items-start gap-4 hover:border-indigo-500/30 transition-all">
          <div class="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-bold shrink-0">🔒</div>
          <div class="space-y-1">
            <h3 class="font-bold text-slate-900 dark:text-white text-sm sm:text-base">১০০% ভেরিফাইড সিকিউরিটি</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">TrxSync ও ক্লাউড ফায়ারস্টোরের কঠোর সিকিউরিটি রুলসে প্রতিটি ফাইল সুরক্ষিত।</p>
          </div>
        </div>

        <div class="surface-card p-5 sm:p-6 rounded-2xl flex items-start gap-4 hover:border-indigo-500/30 transition-all">
          <div class="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-2xl font-bold shrink-0">💬</div>
          <div class="space-y-1">
            <h3 class="font-bold text-slate-900 dark:text-white text-sm sm:text-base">লাইফটাইম সাপোর্ট</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">ফাইল সংক্রান্ত যেকোনো সমস্যা বা আপডেটের জন্য আমাদের সাপোর্ট সবসময় পাশে আছে।</p>
          </div>
        </div>
      </section>

    </div>
  `;

  // Load hero sliders
  const sliderContainer = document.getElementById('home-hero-slider');
  loadSliders().then((sliders) => {
    if (sliderContainer) renderHeroSlider(sliderContainer, sliders);
  });

  // Load newest products & handle search + category tabs
  const grid = document.getElementById('home-products-grid');
  const searchInput = document.getElementById('home-search-input');
  const searchClear = document.getElementById('home-search-clear');
  const catTabs = document.querySelectorAll('.home-cat-tab');

  fetchActiveProducts(true, 8).then((products) => {
    if (!grid) return;
    
    if (products && products.error) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center space-y-3">
          <div class="text-4xl text-rose-500">⚠️</div>
          <p class="font-bold text-base text-rose-600 dark:text-rose-400">প্রোডাক্ট লোড করা যায়নি</p>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">${escapeHtml(products.message || 'সার্ভার বা কানেকশনে সমস্যা হচ্ছে')}</p>
          <button type="button" id="retry-home-products-btn" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 mt-2">
            <span>🔄</span> আবার চেষ্টা করুন
          </button>
        </div>
      `;
      document.getElementById('retry-home-products-btn')?.addEventListener('click', () => {
        renderHomePage();
      });
      return;
    }

    if (!Array.isArray(products) || products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
          <div class="text-4xl">📦</div>
          <p class="font-bold text-base text-slate-800 dark:text-slate-200">এখনো কোনো প্রোডাক্ট যোগ করা হয়নি</p>
          <p class="text-xs text-slate-400">খুব শীঘ্রই নতুন ডিজিটাল প্রোডাক্ট যুক্ত করা হবে।</p>
        </div>
      `;
      return;
    }

    let activeCategory = 'all';
    let searchQuery = '';
    let debounceTimer = null;

    async function filterAndDisplay() {
      if (!grid) return;

      let source = products;
      if (searchQuery) {
        source = await fetchSearchProductsCache();
      }

      grid.innerHTML = '';
      const term = searchQuery.toLowerCase();
      
      const filtered = source.filter((p) => {
        const matchesName = (p.name || '').toLowerCase().includes(term) || 
                            (p.description || '').toLowerCase().includes(term);
        if (!matchesName) return false;

        if (activeCategory === 'all') return true;
        if (p.category) {
          return p.category === activeCategory;
        }
        const cat = (p.name || '').toLowerCase();
        if (activeCategory === 'ebook') return cat.includes('ই-বুক') || cat.includes('বই') || cat.includes('pdf');
        if (activeCategory === 'ui') return cat.includes('ui') || cat.includes('figma') || cat.includes('টেমপ্লেট');
        if (activeCategory === 'script') return cat.includes('স্ক্রিপ্ট') || cat.includes('পাইথন') || cat.includes('python');
        if (activeCategory === 'graphic') return cat.includes('গ্রাফিক্স') || cat.includes('psd') || cat.includes('থাম্বনেইল');
        if (activeCategory === 'other') return true;
        return true;
      });

      if (filtered.length === 0) {
        if (!searchQuery) {
          grid.innerHTML = `
            <div class="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <div class="text-4xl">📦</div>
              <p class="font-bold text-base text-slate-800 dark:text-slate-200">এখনো কোনো প্রোডাক্ট যোগ করা হয়নি</p>
              <p class="text-xs text-slate-400">খুব শীঘ্রই নতুন ডিজিটাল প্রোডাক্ট যুক্ত করা হবে।</p>
            </div>
          `;
          return;
        }
        grid.innerHTML = `
          <div class="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <div class="text-3xl">🔍</div>
            <p class="font-semibold text-sm">কোনো প্রোডাক্ট পাওয়া যায়নি</p>
            <p class="text-xs text-slate-400">ভিন্ন কোনো নাম লিখে আবার চেষ্টা করুন</p>
          </div>
        `;
        return;
      }

      // If no search query, show default newest 8; otherwise show all matching from cache
      const toDisplay = searchQuery ? filtered : filtered.slice(0, 8);
      toDisplay.forEach((p) => {
        grid.appendChild(createProductCard(p));
      });
    }

    // Initial render
    filterAndDisplay();

    // Search events with 300ms debounce
    searchInput?.addEventListener('input', (e) => {
      searchQuery = (e.target.value || '').trim();
      searchClear?.classList.toggle('hidden', !searchQuery);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterAndDisplay();
      }, 300);
    });

    searchClear?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      searchClear.classList.add('hidden');
      clearTimeout(debounceTimer);
      filterAndDisplay();
    });

    // Category tab events
    catTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        catTabs.forEach((t) => {
          t.className = 'home-cat-tab px-3.5 py-1.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all';
        });
        tab.className = 'home-cat-tab active-cat px-3.5 py-1.5 rounded-xl font-semibold bg-indigo-600 text-white transition-all shadow-xs';
        activeCategory = tab.getAttribute('data-cat') || 'all';
        filterAndDisplay();
      });
    });
  }).catch((err) => {
    if (!grid) return;
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center space-y-3">
        <div class="text-4xl text-rose-500">⚠️</div>
        <p class="font-bold text-base text-rose-600 dark:text-rose-400">প্রোডাক্ট লোড করা যায়নি</p>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">${escapeHtml(err?.message || 'সার্ভার বা কানেকশনে সমস্যা হচ্ছে')}</p>
        <button type="button" id="retry-home-products-btn" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 mt-2">
          <span>🔄</span> আবার চেষ্টা করুন
        </button>
      </div>
    `;
    document.getElementById('retry-home-products-btn')?.addEventListener('click', () => {
      renderHomePage();
    });
  });
}

// ==========================================
// Page 2: All Products (/products)
// ==========================================
async function renderProductsPage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  main.innerHTML = `
    <div class="space-y-8">
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">সব ডিজিটাল প্রোডাক্ট</h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">আপনার প্রয়োজনীয় প্রোডাক্টটি নির্বাচন করুন</p>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative max-w-xs w-full">
            <input type="text" id="products-search-box" placeholder="প্রোডাক্ট খুঁজুন..." class="input-field pl-9 pr-3 py-2 text-sm rounded-xl">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </span>
          </div>
          <select id="products-sort-select" class="input-field py-2 text-sm rounded-xl max-w-[170px]">
            <option value="newest">নতুনতম আগে</option>
            <option value="price-asc">মূল্য: কম থেকে বেশি</option>
            <option value="price-desc">মূল্য: বেশি থেকে কম</option>
          </select>
        </div>
      </div>

      <div id="products-catalog-grid" class="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        <!-- Loading skeletons -->
        ${[1, 2, 3, 4, 5, 6, 7, 8].map(() => `
          <div class="surface-card rounded-2xl p-4 space-y-3">
            <div class="skeleton aspect-4/3 rounded-xl"></div>
            <div class="skeleton h-5 w-3/4 rounded-md"></div>
            <div class="skeleton h-4 w-1/2 rounded-md"></div>
            <div class="skeleton h-9 w-full rounded-xl"></div>
          </div>
        `).join('')}
      </div>

      <div id="load-more-container" class="text-center pt-4 hidden">
        <button type="button" id="load-more-btn" class="btn-secondary px-6 py-2.5 rounded-xl text-sm font-semibold">
          আরও প্রোডাক্ট লোড করুন
        </button>
      </div>

    </div>
  `;

  let currentProducts = [];
  const grid = document.getElementById('products-catalog-grid');
  const loadMoreContainer = document.getElementById('load-more-container');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const searchBox = document.getElementById('products-search-box');
  const sortSelect = document.getElementById('products-sort-select');

  async function loadInitial() {
    try {
      const list = await fetchActiveProducts(true, 12);
      if (list && list.error) {
        showProductsError(list.message);
        return;
      }
      currentProducts = Array.isArray(list) ? list : [];
      renderCatalog();
      checkLoadMore();
    } catch (err) {
      showProductsError(err?.message);
    }
  }

  function showProductsError(errMsg) {
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center space-y-3">
          <div class="text-4xl text-rose-500">⚠️</div>
          <p class="font-bold text-base text-rose-600 dark:text-rose-400">প্রোডাক্ট লোড করা যায়নি</p>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">${escapeHtml(errMsg || 'সার্ভার বা কানেকশনে সমস্যা হচ্ছে')}</p>
          <button type="button" id="retry-products-btn" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 mt-2">
            <span>🔄</span> আবার চেষ্টা করুন
          </button>
        </div>
      `;
      document.getElementById('retry-products-btn')?.addEventListener('click', () => {
        loadInitial();
      });
    }
  }

  function checkLoadMore() {
    if (loadMoreContainer) {
      if (getHasMoreProducts()) {
        loadMoreContainer.classList.remove('hidden');
      } else {
        loadMoreContainer.classList.add('hidden');
      }
    }
  }

  let searchDebounceTimer = null;

  async function renderCatalog() {
    if (!grid) return;
    grid.innerHTML = '';

    const query = (searchBox?.value || '').trim().toLowerCase();

    let pool = currentProducts;
    if (query) {
      const cached = await fetchSearchProductsCache();
      const map = new Map();
      currentProducts.forEach((p) => map.set(p.id, p));
      cached.forEach((p) => map.set(p.id, p));
      pool = Array.from(map.values());
      if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
    } else {
      checkLoadMore();
    }

    if (pool.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
          <div class="text-4xl">📦</div>
          <p class="font-bold text-base text-slate-800 dark:text-slate-200">এখনো কোনো প্রোডাক্ট যোগ করা হয়নি</p>
          <p class="text-xs text-slate-400">খুব শীঘ্রই নতুন ডিজিটাল প্রোডাক্ট যুক্ত করা হবে।</p>
        </div>
      `;
      return;
    }

    let displayList = pool.filter((p) => {
      if (!query) return true;
      return (p.name || '').toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query);
    });

    const sortVal = sortSelect?.value || 'newest';
    if (sortVal === 'price-asc') {
      displayList.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortVal === 'price-desc') {
      displayList.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else {
      displayList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeB - timeA;
      });
    }

    if (displayList.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 space-y-2">
          <div class="text-3xl">🔍</div>
          <p class="font-semibold text-sm">কোনো প্রোডাক্ট পাওয়া যায়নি</p>
          <p class="text-xs text-slate-400">ভিন্ন কোনো সার্চ শব্দ ব্যবহার করে চেষ্টা করুন</p>
        </div>
      `;
      return;
    }

    displayList.forEach((p) => grid.appendChild(createProductCard(p)));
  }

  loadMoreBtn?.addEventListener('click', async () => {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'লোড হচ্ছে...';
    const more = await fetchActiveProducts(false, 12);
    if (more && !more.error && Array.isArray(more)) {
      currentProducts = currentProducts.concat(more);
      renderCatalog();
      checkLoadMore();
    } else if (more && more.error) {
      showToast(more.message || 'প্রোডাক্ট লোড করা যায়নি', 'error');
    }
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'আরও প্রোডাক্ট লোড করুন';
  });

  searchBox?.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      renderCatalog();
    }, 300);
  });
  sortSelect?.addEventListener('change', () => {
    renderCatalog();
  });

  await loadInitial();
}

// ==========================================
// Page 3: Product Details (/product/:id)
// ==========================================
async function renderProductDetailsPage({ params }) {
  const main = document.getElementById('app-main');
  if (!main) return;

  const productId = params.id;
  main.innerHTML = `
    <div class="max-w-4xl mx-auto py-12 text-center">
      <div class="skeleton h-8 w-1/2 mx-auto rounded-lg mb-6"></div>
      <div class="skeleton aspect-16/9 rounded-2xl mb-6"></div>
      <div class="skeleton h-20 w-full rounded-xl"></div>
    </div>
  `;

  try {
    let product = null;
    try {
      const snap = await getDoc(doc(db, 'products', productId));
      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'active') {
          product = { id: snap.id, ...data };
        }
      }
    } catch (e) {
      console.warn("Product fetch error:", e?.message);
    }

    if (!product) {
      main.innerHTML = `
        <div class="max-w-md mx-auto py-16 text-center space-y-4">
          <div class="text-4xl">🔍</div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">প্রোডাক্টটি পাওয়া যায়নি</h2>
          <p class="text-sm text-slate-500">এই প্রোডাক্টটি হয়তো মুছে ফেলা হয়েছে বা সাময়িকভাবে অনুপলব্ধ।</p>
          <a href="/products" class="btn-primary px-5 py-2 rounded-xl text-sm inline-block">সব প্রোডাক্ট দেখুন</a>
        </div>
      `;
      return;
    }
    const authState = getAuthState();
    const isOwner = authState.user ? await checkUserOwnsProduct(authState.user.uid, product.id) : false;

    const cat = guessCategory(product.name);
    const fallbackSrc = getProductFallbackSvg(product.name, cat.type);

    // Dynamic SEO Meta for product details page
    const plainDesc = (product.description || '').replace(/[#*`_\[\]()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
    setPageMeta({
      title: `${product.name} | E Product Hub`,
      description: plainDesc || 'E Product Hub প্রিমিয়াম ডিজিটাল প্রোডাক্ট। বিকাশ/নগদে তাৎক্ষণিক ডাউনলোড অ্যাক্সেস।',
      image: product.mainImage
    });

    // Gallery images list (mainImage + images)
    const rawGallery = [product.mainImage, ...(product.images || [])].filter((u) => u && typeof u === 'string' && u.trim());
    let gallery = rawGallery.filter((url) => isSafeImageUrl(url));
    if (gallery.length === 0) {
      gallery = [product.mainImage || fallbackSrc];
    }
    const activeImage = gallery[0] || fallbackSrc;

    // YouTube embed validation
    const youtubeId = parseYouTubeVideoId(product.youtubeUrl);

    main.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-8">
        
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <a href="/" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">হোম</a>
          <span>/</span>
          <a href="/products" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">প্রোডাক্টস</a>
          <span>/</span>
          <span class="text-slate-900 dark:text-white font-medium truncate max-w-[200px] sm:max-w-xs">${escapeHtml(product.name)}</span>
        </nav>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- Image Gallery Column (5 cols) -->
          <div class="lg:col-span-5 space-y-4">
            <div class="aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md">
              <img id="details-main-img" src="${getSafeImageUrl(activeImage, product.name, cat.type)}" alt="${escapeHtml(product.name)}" data-fallback="${fallbackSrc}" referrerpolicy="no-referrer" class="w-full h-full object-cover">
            </div>

            <!-- Thumbnail strip -->
            ${gallery.length > 1 ? `
              <div class="flex items-center gap-2.5 overflow-x-auto pb-2">
                ${gallery.map((imgUrl, i) => `
                  <button type="button" class="gallery-thumb-btn w-16 h-16 rounded-xl overflow-hidden border-2 ${i === 0 ? 'border-indigo-600' : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'} shrink-0 transition" data-url="${escapeHtml(imgUrl)}">
                    <img src="${getSafeImageUrl(imgUrl, product.name, cat.type)}" data-fallback="${fallbackSrc}" referrerpolicy="no-referrer" class="w-full h-full object-cover">
                  </button>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Product Info Column (7 cols) -->
          <div class="lg:col-span-7 space-y-6">
            
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/50 dark:border-indigo-800/50">${escapeHtml(cat.tag)}</span>
                ${product.version ? `<span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs">v${escapeHtml(product.version)}</span>` : ''}
                ${product.fileSize ? `<span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs">📦 ${escapeHtml(product.fileSize)}</span>` : ''}
                ${(product.previewUrl && typeof product.previewUrl === 'string' && product.previewUrl.startsWith('https://')) ? `
                  <a href="${escapeHtml(product.previewUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 hover:bg-violet-600/20 text-xs font-bold transition">
                    <span>🌐</span> লাইভ প্রিভিউ ↗
                  </a>
                ` : ''}
              </div>
              <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                ${escapeHtml(product.name)}
              </h1>
            </div>

            <!-- Price & Trust Container -->
            <div class="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <span class="text-xs text-slate-400 dark:text-slate-500 block mb-0.5">এককালীন মূল্য</span>
                <span class="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">${formatBDT(product.price)}</span>
              </div>
              <div class="text-right text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                <span class="block">✓ লাইফটাইম অ্যাক্সেস</span>
                <span class="block text-emerald-600 dark:text-emerald-400 font-semibold">✓ ইনস্ট্যান্ট অটো ডেলিভারি</span>
              </div>
            </div>

            <!-- Actions / Ownership Status -->
            <div class="space-y-3">
              ${isOwner ? `
                <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2 font-bold text-sm">
                    <span>✓</span> <span>আপনি ইতিমধ্যে এই প্রোডাক্টটি ক্রয় করেছেন!</span>
                  </div>
                  <a href="/my-purchases" class="btn-primary text-xs px-4 py-2 rounded-xl whitespace-nowrap">
                    ডাউনলোড করুন
                  </a>
                </div>
              ` : `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" id="details-add-cart-btn" class="w-full py-3.5 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] active:scale-[0.98]">
                    <svg class="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                    </svg>
                    <span>কার্টে যোগ করুন</span>
                  </button>
                  <button type="button" id="details-buy-now-btn" class="w-full py-3.5 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md transition flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] active:scale-[0.98]">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    <span>এখনই কিনুন</span>
                  </button>
                </div>
              `}
            </div>

            <!-- Description (XSS-safe formatted) -->
            <div class="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h3 class="font-bold text-lg text-slate-900 dark:text-white">প্রোডাক্টের বিবরণ</h3>
              <div id="product-safe-description" class="text-sm leading-relaxed text-slate-700 dark:text-slate-300"></div>
            </div>

            <!-- YouTube Video Embed (Optional & Validated) -->
            ${youtubeId ? `
              <div class="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <svg class="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>ভিডিও প্রিভিউ</span>
                </h3>
                <div class="aspect-16/9 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                  <iframe 
                    src="https://www.youtube-nocookie.com/embed/${youtubeId}" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    class="w-full h-full">
                  </iframe>
                </div>
              </div>
            ` : ''}

          </div>

        </div>

      </div>
    `;

    // Attach fallback to main image
    const mainImg = document.getElementById('details-main-img');
    if (mainImg) {
      mainImg.onerror = () => {
        mainImg.onerror = null;
        mainImg.src = fallbackSrc;
      };
    }

    // Render safe description
    const descContainer = document.getElementById('product-safe-description');
    if (descContainer) {
      descContainer.appendChild(renderSafeDescription(product.description));
    }

    // Thumbnail switching
    document.querySelectorAll('.gallery-thumb-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        const mainImg = document.getElementById('details-main-img');
        if (mainImg && url) {
          mainImg.onerror = () => {
            mainImg.onerror = null;
            mainImg.src = fallbackSrc;
          };
          mainImg.src = getSafeImageUrl(url, product.name, cat.type);
          document.querySelectorAll('.gallery-thumb-btn').forEach((b) => {
            b.classList.remove('border-indigo-600', 'opacity-100');
            b.classList.add('border-slate-200', 'dark:border-slate-800', 'opacity-70');
          });
          btn.classList.add('border-indigo-600', 'opacity-100');
          btn.classList.remove('border-slate-200', 'dark:border-slate-800', 'opacity-70');
        }
      });
    });

    // Buttons
    document.getElementById('details-add-cart-btn')?.addEventListener('click', () => {
      addToCart(product.id);
    });

    document.getElementById('details-buy-now-btn')?.addEventListener('click', () => {
      navigateTo(`/checkout?buy=${encodeURIComponent(product.id)}`);
    });

  } catch (err) {
    console.warn("Product details notice:", err?.message || err);
    showToast("প্রোডাক্ট তথ্য লোড করতে সমস্যা হয়েছে", "error");
  }
}

// ==========================================
// Page 4: Cart (/cart)
// ==========================================
async function renderCartPage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  main.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">আপনার শপিং কার্ট</h1>
      <div id="cart-content-container">
        <div class="py-12 text-center text-slate-500">কার্ট লোড হচ্ছে...</div>
      </div>
    </div>
  `;

  const container = document.getElementById('cart-content-container');
  const cartData = await getCartProductDetails();

  if (cartData.count === 0) {
    if (container) {
      container.innerHTML = `
        <div class="surface-card rounded-2xl p-12 text-center space-y-4">
          <div class="text-5xl">🛒</div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">আপনার কার্ট বর্তমানে খালি</h2>
          <p class="text-sm text-slate-500">স্টোর থেকে আপনার পছন্দের ডিজিটাল প্রোডাক্টগুলো কার্টে যোগ করুন।</p>
          <div class="pt-2">
            <a href="/products" class="btn-primary px-6 py-3 rounded-xl text-sm font-semibold inline-block">
              প্রোডাক্ট দেখুন
            </a>
          </div>
        </div>
      `;
    }
    return;
  }

  if (container) {
    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Cart Items List (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          ${cartData.removedCount > 0 ? `
            <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
              <span>ℹ️</span>
              <span>অনুপলব্ধ বা স্টকহীন ${cartData.removedCount}টি প্রোডাক্ট স্বয়ংক্রিয়ভাবে কার্ট থেকে সরানো হয়েছে।</span>
            </div>
          ` : ''}

          ${cartData.products.map((item) => `
            <div class="surface-card p-4 rounded-2xl flex items-center gap-4 justify-between" id="cart-item-${escapeHtml(item.id)}">
              <div class="flex items-center gap-3 sm:gap-4 overflow-hidden">
                <img src="${getSafeImageUrl(item.mainImage, item.name, 'code')}" alt="${escapeHtml(item.name)}" data-fallback="${getProductFallbackSvg(item.name, 'code')}" referrerpolicy="no-referrer" class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover bg-slate-100 dark:bg-slate-900 shrink-0 border border-slate-200/80 dark:border-slate-800/80">
                <div class="space-y-1 truncate">
                  <h4 class="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">${escapeHtml(item.name)}</h4>
                  <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span class="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-semibold">পরিমাণ: ১</span>
                    <span>ডিজিটাল প্রোডাক্ট</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-4 shrink-0">
                <div class="text-right">
                  <span class="font-black text-base sm:text-lg text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">${formatBDT(item.price)}</span>
                </div>
                <button type="button" class="remove-cart-item-btn p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition" data-id="${escapeHtml(item.id)}" title="মুছুন">
                  ✕
                </button>
              </div>
            </div>
          `).join('')}

          <div class="pt-2 flex items-center justify-between">
            <a href="/products" class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              ← আরও প্রোডাক্ট যোগ করুন
            </a>
            <button type="button" id="cart-clear-all-btn" class="text-xs text-rose-500 hover:underline">
              সম্পূর্ণ কার্ট খালি করুন
            </button>
          </div>
        </div>

        <!-- Order Summary (4 cols) -->
        <div class="lg:col-span-4 surface-card p-6 rounded-2xl space-y-5">
          <h3 class="font-bold text-lg text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            অর্ডার সামারি
          </h3>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>মোট আইটেম</span>
              <span class="font-mono tabular-nums">${cartData.count} টি</span>
            </div>
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>সাবটোটাল</span>
              <span class="font-mono tabular-nums">${formatBDT(cartData.total)}</span>
            </div>
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>ডেলিভারি চার্জ</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">বিনামূল্যে (ডিজিটাল)</span>
            </div>
            <div class="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between font-black text-lg text-slate-900 dark:text-white">
              <span>সর্বমোট</span>
              <span class="text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">${formatBDT(cartData.total)}</span>
            </div>
          </div>

          <button type="button" id="cart-checkout-btn" class="btn-primary w-full py-3.5 rounded-xl text-sm font-bold shadow-md">
            চেকআউট করুন
          </button>
        </div>

      </div>
    `;

    // Event handlers
    document.querySelectorAll('.remove-cart-item-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await removeFromCart(id);
        renderCartPage();
      });
    });

    document.getElementById('cart-clear-all-btn')?.addEventListener('click', () => {
      showConfirmDialog({
        title: 'কার্ট খালি করুন',
        message: 'আপনি কি নিশ্চিত যে আপনার কার্টের সব আইটেম মুছে ফেলতে চান?',
        confirmText: 'হ্যাঁ, খালি করুন',
        onConfirm: async () => {
          await clearCart();
          renderCartPage();
        }
      });
    });

    document.getElementById('cart-checkout-btn')?.addEventListener('click', () => {
      navigateTo('/checkout');
    });
  }
}

// ==========================================
// Page 5: Checkout (/checkout) - CORE AUTO PAYMENT FLOW
// ==========================================
async function renderCheckoutPage({ query }) {
  const main = document.getElementById('app-main');
  if (!main) return;

  const authState = getAuthState();
  if (!authState.user) {
    navigateTo(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    return;
  }

  const buyProductId = query.get('buy');
  main.innerHTML = `
    <div class="max-w-3xl mx-auto py-12 text-center text-slate-500">
      অর্ডার বিস্তারিত যাচাই করা হচ্ছে...
    </div>
  `;

  // Fetch product items & verify live prices
  let checkoutProducts = [];
  if (buyProductId) {
    const single = await getCartProductDetails([buyProductId]);
    checkoutProducts = single.products;
  } else {
    const cart = await getCartProductDetails();
    checkoutProducts = cart.products;
  }

  if (checkoutProducts.length === 0) {
    main.innerHTML = `
      <div class="max-w-md mx-auto py-16 text-center space-y-4">
        <div class="text-4xl">⚠️</div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">চেকআউটের জন্য কোনো প্রোডাক্ট নেই</h2>
        <p class="text-sm text-slate-500">প্রথমে স্টোর থেকে প্রোডাক্ট নির্বাচন করুন।</p>
        <a href="/products" class="btn-primary px-5 py-2.5 rounded-xl text-sm inline-block">প্রোডাক্ট ব্রাউজ করুন</a>
      </div>
    `;
    return;
  }

  // Filter unowned items
  const { unowned, owned } = await filterUnownedProducts(authState.user.uid, checkoutProducts);

  if (unowned.length === 0) {
    main.innerHTML = `
      <div class="max-w-md mx-auto py-16 text-center space-y-4 surface-card p-8 rounded-2xl">
        <div class="text-4xl">🎉</div>
        <h2 class="text-xl font-bold text-emerald-600">আপনি ইতিমধ্যে প্রোডাক্টটি ক্রয় করেছেন!</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">নির্বাচিত প্রোডাক্টগুলো আপনার অ্যাকাউন্টে রয়েছে। এখনই ডাউনলোড পেজ থেকে ফাইল ডাউনলোড করে নিন।</p>
        <a href="/my-purchases" class="btn-primary px-5 py-2.5 rounded-xl text-sm inline-block">আমার পারচেজ পেজে যান</a>
      </div>
    `;
    return;
  }

  const paymentConfig = await getPaymentConfig();
  const totalAmount = unowned.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  // Check email verification with fresh token refresh
  const isEmailVerified = await refreshVerifiedState();

  main.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-8">
      
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">চেকআউট ও পেমেন্ট</h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">TrxSync স্বয়ংক্রিয় পেমেন্ট ভেরিফিকেশন ও তাৎক্ষণিক ফাইল অ্যাক্সেস</p>
      </div>

      <!-- Email Verification Warning if unverified -->
      ${!isEmailVerified ? `
        <div class="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-3">
          <div class="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm sm:text-base">
            <span class="text-xl">⚠️</span>
            <span>ইমেইল ভেরিফিকেশন আবশ্যক!</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            ডিজিটাল ফাইলের নিরাপত্তা ও ফায়ারস্টোর সিকিউরিটি রুলস অনুযায়ী কেনাকাটা করার জন্য আপনার ইমেইল (<strong>${escapeHtml(authState.user.email)}</strong>) ভেরিফাই করা বাধ্যতামূলক।
          </p>
          <div class="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" id="checkout-verify-btn" class="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition">
              ভেরিফিকেশন ইমেইল পাঠান
            </button>
            <button type="button" id="checkout-reload-btn" class="btn-secondary px-3 py-2 rounded-xl text-xs">
              🔄 ভেরিফাই করেছি - রিলোড করুন
            </button>
          </div>
        </div>
      ` : ''}

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Left: Payment Instructions & Numbers (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- Payment Numbers Box -->
          <div class="surface-card p-6 rounded-2xl space-y-4">
            <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>💳</span> পেমেন্ট করার নম্বরসমূহ
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${paymentConfig.bkashNumber ? `
                <div class="p-3.5 rounded-xl border border-pink-500/30 bg-pink-500/5 flex items-center justify-between">
                  <div>
                    <span class="text-[11px] font-bold text-pink-600 uppercase">bKash (${escapeHtml(paymentConfig.bkashType || 'Personal')})</span>
                    <span class="block font-mono font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(paymentConfig.bkashNumber)}</span>
                  </div>
                  <button type="button" class="copy-num-btn text-xs bg-pink-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-pink-700 transition" data-num="${escapeHtml(paymentConfig.bkashNumber)}">
                    কপি
                  </button>
                </div>
              ` : ''}

              ${paymentConfig.nagadNumber ? `
                <div class="p-3.5 rounded-xl border border-orange-500/30 bg-orange-500/5 flex items-center justify-between">
                  <div>
                    <span class="text-[11px] font-bold text-orange-600 uppercase">Nagad (${escapeHtml(paymentConfig.nagadType || 'Personal')})</span>
                    <span class="block font-mono font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(paymentConfig.nagadNumber)}</span>
                  </div>
                  <button type="button" class="copy-num-btn text-xs bg-orange-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-orange-700 transition" data-num="${escapeHtml(paymentConfig.nagadNumber)}">
                    কপি
                  </button>
                </div>
              ` : ''}

              ${paymentConfig.rocketNumber ? `
                <div class="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center justify-between">
                  <div>
                    <span class="text-[11px] font-bold text-purple-600 uppercase">Rocket (${escapeHtml(paymentConfig.rocketType || 'Personal')})</span>
                    <span class="block font-mono font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(paymentConfig.rocketNumber)}</span>
                  </div>
                  <button type="button" class="copy-num-btn text-xs bg-purple-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-purple-700 transition" data-num="${escapeHtml(paymentConfig.rocketNumber)}">
                    কপি
                  </button>
                </div>
              ` : ''}

              ${paymentConfig.upayNumber ? `
                <div class="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
                  <div>
                    <span class="text-[11px] font-bold text-blue-600 uppercase">Upay (${escapeHtml(paymentConfig.upayType || 'Personal')})</span>
                    <span class="block font-mono font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(paymentConfig.upayNumber)}</span>
                  </div>
                  <button type="button" class="copy-num-btn text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 transition" data-num="${escapeHtml(paymentConfig.upayNumber)}">
                    কপি
                  </button>
                </div>
              ` : ''}
            </div>

            <!-- Instructions -->
            <div class="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl leading-relaxed border border-slate-200/60 dark:border-slate-700/60">
              <strong class="text-slate-900 dark:text-white block mb-1">পেমেন্ট নির্দেশনাবলী:</strong>
              ${escapeHtml(paymentConfig.instructions || 'যেকোনো নম্বরে মোট টাকা Send Money করুন। এরপর ফিরতি SMS এর TrxID এবং প্রেরক নম্বর নিচে দিয়ে ভেরিফাই করুন।')}
            </div>
          </div>

          <!-- Checkout Form -->
          <form id="checkout-claim-form" class="surface-card p-6 rounded-2xl space-y-4">
            <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>📝</span> পেমেন্ট তথ্য পূরণ করুন
            </h3>

            <div>
              <label for="trx-id-input" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Transaction ID (TrxID) <span class="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                id="trx-id-input" 
                placeholder="যেমন: BLG74H3KJ" 
                required 
                autocomplete="off"
                class="input-field uppercase font-mono tracking-wider text-base"
              >
              <span class="text-[11px] text-slate-400 mt-1 block">বিকাশ/নগদ/রকেট থেকে প্রাপ্ত SMS এর TrxID দিন</span>
            </div>

            <div>
              <label for="payer-number-input" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                প্রেরক মোবাইল নম্বর (Payer Number) <span class="text-rose-500">*</span>
              </label>
              <input 
                type="tel" 
                id="payer-number-input" 
                placeholder="যেমন: 01712345678" 
                required 
                class="input-field font-mono text-base"
                value="${escapeHtml(authState.profile?.phone || '')}"
              >
              <span class="text-[11px] text-slate-400 mt-1 block">যে নম্বর থেকে টাকা পাঠিয়েছেন (১১ ডিজিটের 01XXXXXXXXX)</span>
            </div>

            <!-- Terms & Refund Policy Agreement Checkbox (Required) -->
            <div class="flex items-start gap-2.5 pt-1">
              <input 
                type="checkbox" 
                id="checkout-terms-cb" 
                required 
                class="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
              >
              <label for="checkout-terms-cb" class="text-xs text-slate-600 dark:text-slate-400 leading-snug cursor-pointer select-none">
                আমি <a href="/terms" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 font-semibold underline">শর্তাবলী</a> ও <a href="/refund-policy" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 font-semibold underline">রিফান্ড পলিসি</a> পড়েছি ও সম্মত <span class="text-rose-500">*</span>
              </label>
            </div>

            <!-- Failure / Cooldown Notice Box -->
            <div id="checkout-error-box" class="hidden p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs sm:text-sm leading-relaxed space-y-2"></div>

            <button 
              type="submit" 
              id="checkout-submit-btn" 
              class="btn-primary w-full py-3.5 rounded-xl text-base font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              পেমেন্ট ভেরিফাই ও প্রোডাক্ট আনলক করুন
            </button>
          </form>

        </div>

        <!-- Right: Items and Total Summary (5 cols) -->
        <div class="lg:col-span-5 surface-card p-6 rounded-2xl space-y-5">
          <h3 class="font-bold text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/60 pb-3">
            ক্রয়কৃত আইটেমসমূহ (${unowned.length})
          </h3>

          <div class="space-y-3 max-h-72 overflow-y-auto pr-1">
            ${unowned.map((item) => `
              <div class="flex items-center gap-3">
                <img src="${getSafeImageUrl(item.mainImage, item.name, 'code')}" alt="${escapeHtml(item.name)}" data-fallback="${getProductFallbackSvg(item.name, 'code')}" referrerpolicy="no-referrer" class="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-900 shrink-0 border border-slate-200/80 dark:border-slate-800/80">
                <div class="truncate flex-1">
                  <span class="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block truncate">${escapeHtml(item.name)}</span>
                  <div class="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                    <span class="text-indigo-600 dark:text-indigo-400 font-bold">${formatBDT(item.price)}</span>
                    ${item.category ? `<span aria-hidden="true">·</span><span class="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">${escapeHtml(guessCategory(item.name).tag)}</span>` : ''}
                    ${item.version ? `<span aria-hidden="true">·</span><span>v${escapeHtml(item.version)}</span>` : ''}
                    ${item.fileSize ? `<span aria-hidden="true">·</span><span>${escapeHtml(item.fileSize)}</span>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          ${owned.length > 0 ? `
            <div class="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg">
              ℹ️ আপনার আগের কেনা ${owned.length}টি আইটেম স্বয়ংক্রিয়ভাবে বাদ দেওয়া হয়েছে।
            </div>
          ` : ''}

          <div class="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
            <div class="flex justify-between text-xs text-slate-500">
              <span>সাবটোটাল</span>
              <span class="font-mono tabular-nums">${formatBDT(totalAmount)}</span>
            </div>
            <div class="flex justify-between text-xs text-slate-500">
              <span>ডেলিভারি মেথড</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">ইনস্ট্যান্ট ক্লাউড ডাউনলোড</span>
            </div>
            <div class="flex justify-between items-baseline text-lg font-black text-slate-900 dark:text-white pt-2">
              <span>পরিশোধযোগ্য মোট</span>
              <span class="text-2xl text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">${formatBDT(totalAmount)}</span>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-500 space-y-1">
            <span class="font-bold text-slate-700 dark:text-slate-300 block">💡 খেয়াল রাখুন:</span>
            <span>SMS আসার পর TrxSync সিঙ্ক হতে ৩০-৬০ সেকেন্ড সময় লাগতে পারে। সাথে সাথে ব্যর্থ দেখালে ১ মিনিট পর আবার চেষ্টা করুন।</span>
          </div>
        </div>

      </div>

    </div>
  `;

  // Attach copy number actions
  document.querySelectorAll('.copy-num-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = btn.getAttribute('data-num');
      if (num) {
        navigator.clipboard.writeText(num);
        showToast(`নম্বর (${num}) কপি করা হয়েছে!`, 'success');
      }
    });
  });

  // Verify buttons if unverified
  document.getElementById('checkout-verify-btn')?.addEventListener('click', async () => {
    await resendVerificationEmail();
  });
  document.getElementById('checkout-reload-btn')?.addEventListener('click', async () => {
    const verified = await refreshVerifiedState();
    if (verified) {
      showToast('ইমেইল সফলভাবে ভেরিফাই হয়েছে!', 'success');
      const banner = document.getElementById('email-verification-banner');
      if (banner) banner.classList.add('hidden');
    } else {
      showToast('ইমেইল এখনও ভেরিফাই করা হয়নি। অনুগ্রহ করে লিংকে ক্লিক করুন।', 'info');
    }
    renderCheckoutPage({ query });
  });

  // Form Submission
  const form = document.getElementById('checkout-claim-form');
  const submitBtn = document.getElementById('checkout-submit-btn');
  const errorBox = document.getElementById('checkout-error-box');
  const termsCb = document.getElementById('checkout-terms-cb');

  function updateSubmitBtnState() {
    if (!submitBtn) return;
    const cooldown = getCooldownRemainingSeconds();
    if (cooldown > 0) {
      submitBtn.disabled = true;
      return;
    }
    submitBtn.disabled = !isEmailVerified || !termsCb?.checked;
  }

  termsCb?.addEventListener('change', updateSubmitBtnState);
  updateSubmitBtnState();

  // Active timers & state for auto-retry and countdown (created once per checkout render)
  const retryState = {
    autoRetryAttempts: 0,
    intervalTimer: null,
    countdownTimer: null,
    isAutoRetrying: false,
    remainingSeconds: 60
  };

  function stopAutoRetry() {
    if (retryState.intervalTimer) {
      clearInterval(retryState.intervalTimer);
      retryState.intervalTimer = null;
    }
    if (retryState.countdownTimer) {
      clearInterval(retryState.countdownTimer);
      retryState.countdownTimer = null;
    }
    retryState.isAutoRetrying = false;
  }

  // Part 2: Report button lockout timer surviving section re-renders
  let lastReportTimestamp = 0;
  let reportLockoutInterval = null;

  function syncReportButtonLockout(reportBtn) {
    if (!reportBtn) return;
    if (reportLockoutInterval) {
      clearInterval(reportLockoutInterval);
      reportLockoutInterval = null;
    }
    const elapsed = Math.floor((Date.now() - lastReportTimestamp) / 1000);
    let remaining = 60 - elapsed;

    if (remaining > 0) {
      reportBtn.disabled = true;
      reportBtn.textContent = `রিপোর্ট গৃহীত (${remaining}s)`;
      reportLockoutInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(reportLockoutInterval);
          reportLockoutInterval = null;
          if (reportBtn) {
            reportBtn.disabled = false;
            reportBtn.textContent = 'সমস্যা রিপোর্ট করুন';
          }
        } else if (reportBtn) {
          reportBtn.textContent = `রিপোর্ট গৃহীত (${remaining}s)`;
        }
      }, 1000);
    } else {
      reportBtn.disabled = false;
      reportBtn.textContent = 'সমস্যা রিপোর্ট করুন';
    }
  }

  // Clear timers if user leaves checkout page
  function handleCheckoutCleanup() {
    stopAutoRetry();
    if (reportLockoutInterval) {
      clearInterval(reportLockoutInterval);
      reportLockoutInterval = null;
    }
  }
  window.addEventListener('popstate', handleCheckoutCleanup, { once: true });

  // Check cooldown status on load
  const cooldownSec = getCooldownRemainingSeconds();
  if (cooldownSec > 0) {
    lockSubmitForCooldown(cooldownSec);
  }

  function lockSubmitForCooldown(seconds) {
    stopAutoRetry();
    if (!submitBtn || !errorBox) return;
    submitBtn.disabled = true;
    errorBox.classList.remove('hidden');
    let remaining = seconds;
    
    errorBox.innerHTML = `
      <strong>🔒 সাময়িক নিরাপত্তা লক:</strong><br>
      অতিরিক্ত ব্যর্থ চেষ্টার কারণে সাবমিট বাটন লক করা হয়েছে। অনুগ্রহ করে <strong><span id="cooldown-timer">${remaining}</span> সেকেন্ড</strong> পর আবার চেষ্টা করুন।
    `;

    const timer = setInterval(() => {
      remaining -= 1;
      const span = document.getElementById('cooldown-timer');
      if (span) span.textContent = String(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        updateSubmitBtnState();
        errorBox.classList.add('hidden');
      }
    }, 1000);
  }

  function renderFailureHelpSection(trxId, payerNumber, { fromAutoRetry = false } = {}) {
    if (!errorBox) return;

    if (fromAutoRetry) {
      // Auto-retry failure must NOT reset attempts or restart timers; only refresh status text
      const statusEl = document.getElementById('autoretry-status-text');
      if (retryState.autoRetryAttempts >= 3 || retryState.remainingSeconds <= 0) {
        stopAutoRetry();
        if (statusEl) {
          statusEl.textContent = 'স্বয়ংক্রিয় চেষ্টা সম্পন্ন হয়েছে। প্রয়োজনে উপরে আবার চেষ্টা করুন বা সমস্যা রিপোর্ট করুন।';
        }
      } else if (statusEl) {
        statusEl.textContent = 'স্বয়ংক্রিয়ভাবে আবার যাচাই করা হবে (সর্বোচ্চ ৩ বার)';
      }
      return;
    }

    // Manual attempt: stop previous timers, reset attempts, start a new 60s / 3-attempt cycle
    stopAutoRetry();
    retryState.autoRetryAttempts = 0;
    retryState.remainingSeconds = 60;

    errorBox.classList.remove('hidden');
    errorBox.innerHTML = `
      <strong class="block text-sm">❌ পেমেন্ট ভেরিফিকেশন সফল হয়নি</strong>
      <div class="mt-1 space-y-1">
        <p>সম্ভাব্য কারণসমূহ:</p>
        <ol class="list-decimal list-inside space-y-0.5 text-[11px] sm:text-xs">
          <li>TrxID এখনো সিস্টেমে সিঙ্ক হয়নি (SMS সিঙ্ক হতে ৩০-৬০ সেকেন্ড সময় লাগতে পারে)।</li>
          <li>প্রেরক নম্বর (Payer Number) এবং SMS প্রেরক নম্বর মিলেনি।</li>
          <li>ট্রানজ্যাকশন ব্যালেন্স প্রোডাক্টের মূল্যের চেয়ে কম অথবা ইতিমধ্যে ব্যবহৃত হয়েছে।</li>
          <li>আপনার ইমেইল ভেরিফাই করা নেই।</li>
        </ol>
      </div>

      <div class="pt-2 flex items-center gap-2">
        <button type="button" id="retry-claim-btn" class="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition">
          🔄 আবার চেষ্টা করুন (Retry)
        </button>
        <span class="text-[11px] text-slate-500">প্রয়োজনে ৬০ সেকেন্ড অপেক্ষা করুন</span>
      </div>

      <!-- Payment Problem Help Section -->
      <div class="mt-4 pt-4 border-t border-rose-300 dark:border-rose-800 space-y-3">
        <div class="flex items-center gap-2">
          <span class="text-base">💡</span>
          <h4 class="font-bold text-sm text-slate-900 dark:text-white">টাকা পাঠিয়েছেন কিন্তু অ্যাক্সেস পাননি?</h4>
        </div>
        
        <!-- Auto-retry Countdown Banner -->
        <div id="checkout-autoretry-banner" class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
          <div class="flex items-center justify-between font-semibold">
            <span>SMS সিঙ্ক হতে কিছু সময় লাগতে পারে</span>
            <span id="autoretry-countdown-display" class="font-mono text-indigo-600 dark:text-indigo-400 font-bold">৬০ সে.</span>
          </div>
          <p class="text-[11px] text-slate-500" id="autoretry-status-text">স্বয়ংক্রিয়ভাবে আবার যাচাই করা হবে (সর্বোচ্চ ৩ বার)</p>
        </div>

        <!-- Report Issue Button -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <button type="button" id="report-payment-issue-btn" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs">
            <span>📢</span> সমস্যা রিপোর্ট করুন
          </button>
          <span class="text-[11px] text-slate-400">মেসেজ সরাসরি অ্যাডমিন ড্যাশবোর্ডে চলে যাবে</span>
        </div>
      </div>
    `;

    document.getElementById('retry-claim-btn')?.addEventListener('click', () => {
      stopAutoRetry();
      retryState.autoRetryAttempts = 0;
      retryState.isAutoRetrying = false;
      form?.requestSubmit();
    });

    // Wire 'সমস্যা রিপোর্ট করুন' button & synchronize lockout state
    const reportBtn = document.getElementById('report-payment-issue-btn');
    syncReportButtonLockout(reportBtn);

    reportBtn?.addEventListener('click', async () => {
      if (!authState.user) {
        showToast('রিপোর্ট পাঠাতে অনুগ্রহ করে লগইন করুন', 'error');
        return;
      }
      if (!authState.user.emailVerified) {
        showToast('রিপোর্ট পাঠাতে প্রথমে আপনার ইমেইল ভেরিফাই করুন', 'warning');
        return;
      }

      reportBtn.disabled = true;
      reportBtn.textContent = 'রিপোর্ট পাঠানো হচ্ছে...';

      try {
        const uEmail = authState.user.email;
        if (!uEmail) throw new Error('ইউজার ইমেইল পাওয়া যায়নি');
        const rawName = authState.profile?.name || uEmail.split('@')[0] || 'Customer';
        const uName = rawName.trim().slice(0, 100) || 'Customer';
        const prodNames = unowned.map((p) => p.name).join(', ').slice(0, 500);
        const issueMsg = `[PAYMENT ISSUE] TrxID: ${trxId || 'N/A'}, Payer: ${payerNumber || 'N/A'}, Products: ${prodNames}`.slice(0, 2000);

        // Satisfies updated contactMessages security rule:
        // verified() && keys().hasOnly(['name','email','message','createdAt'])
        // name 1..100, email == auth.token.email, message 1..2000, createdAt == request.time
        await addDoc(collection(db, 'contactMessages'), {
          name: uName,
          email: uEmail,
          message: issueMsg,
          createdAt: serverTimestamp()
        });

        showToast('সমস্যা রিপোর্ট পাঠানো হয়েছে! অ্যাডমিন দ্রুত ভেরিফাই করবেন।', 'success');

        // Lock button for 60 seconds (survives re-renders)
        lastReportTimestamp = Date.now();
        syncReportButtonLockout(reportBtn);
      } catch (repErr) {
        showToast(repErr.message || 'রিপোর্ট পাঠানো যায়নি', 'error');
        syncReportButtonLockout(reportBtn);
      }
    });

    // If cooldown lock is active, auto-retry must not run
    if (getCooldownRemainingSeconds() > 0) {
      return;
    }

    // Start 60s countdown timer
    retryState.countdownTimer = setInterval(() => {
      retryState.remainingSeconds -= 1;
      const countEl = document.getElementById('autoretry-countdown-display');
      if (countEl) countEl.textContent = `${retryState.remainingSeconds} সে.`;

      if (retryState.remainingSeconds <= 0) {
        stopAutoRetry();
        const statusEl = document.getElementById('autoretry-status-text');
        if (statusEl) {
          statusEl.textContent = 'স্বয়ংক্রিয় চেষ্টা সম্পন্ন হয়েছে। প্রয়োজনে উপরে আবার চেষ্টা করুন বা সমস্যা রিপোর্ট করুন।';
        }
      }
    }, 1000);

    // 20-second interval retries (up to 3 times)
    retryState.intervalTimer = setInterval(() => {
      // 1. Check if user left checkout page
      if (window.location.pathname !== '/checkout') {
        stopAutoRetry();
        return;
      }
      // 2. Check client-side cooldown lock
      if (getCooldownRemainingSeconds() > 0) {
        stopAutoRetry();
        return;
      }
      // 3. Stop after 3 attempts or when countdown ended
      if (retryState.autoRetryAttempts >= 3 || retryState.remainingSeconds <= 0) {
        stopAutoRetry();
        const statusEl = document.getElementById('autoretry-status-text');
        if (statusEl) {
          statusEl.textContent = 'স্বয়ংক্রিয় চেষ্টা সম্পন্ন হয়েছে। প্রয়োজনে উপরে আবার চেষ্টা করুন বা সমস্যা রিপোর্ট করুন।';
        }
        return;
      }

      retryState.autoRetryAttempts += 1;
      const statusEl = document.getElementById('autoretry-status-text');
      if (statusEl) {
        statusEl.textContent = `স্বয়ংক্রিয় যাচাই চলছে (${retryState.autoRetryAttempts}/৩)...`;
      }

      if (retryState.autoRetryAttempts >= 3) {
        if (retryState.intervalTimer) {
          clearInterval(retryState.intervalTimer);
          retryState.intervalTimer = null;
        }
      }

      // Mark this submission as auto-retry so failures don't count toward the 5-attempt lock
      retryState.isAutoRetrying = true;
      form?.requestSubmit();
    }, 20000);
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const trxId = document.getElementById('trx-id-input')?.value;
    const payerNumber = document.getElementById('payer-number-input')?.value;

    const remainingSec = getCooldownRemainingSeconds();
    if (remainingSec > 0) {
      stopAutoRetry();
      lockSubmitForCooldown(remainingSec);
      return;
    }

    const isAuto = retryState.isAutoRetrying;
    retryState.isAutoRetrying = false;

    // Manual submits stop previous timers and reset attempt counters
    if (!isAuto) {
      stopAutoRetry();
      retryState.autoRetryAttempts = 0;
      errorBox?.classList.add('hidden');
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'পেমেন্ট ভেরিফাই করা হচ্ছে...';

    try {
      // Auto-retries pass countFailure: false; manual submissions pass countFailure: true
      const result = await claimTransactionBatch(trxId, payerNumber, unowned, { countFailure: !isAuto });

      if (result.success) {
        stopAutoRetry();

        // If from cart, remove claimed items from cart
        if (!buyProductId) {
          for (const item of result.claimed) {
            await removeFromCart(item.id);
          }
        }

        if (result.claimed.length === unowned.length) {
          showToast('অভিনন্দন! আপনার পেমেন্ট সফলভাবে গৃহীত হয়েছে।', 'success', 5000);
          navigateTo('/my-purchases');
        } else {
          // Partial success
          showToast(`${result.claimed.length}টি প্রোডাক্ট সফল হয়েছে!`, 'warning', 6000);
          if (errorBox) {
            errorBox.classList.remove('hidden');
            errorBox.innerHTML = `
              <strong>আংশিক পেমেন্ট সফল:</strong><br>
              ${result.claimed.length}টি প্রোডাক্ট সফলভাবে কেনা হয়েছে। কিন্তু বাকি প্রোডাক্টগুলোর জন্য ট্রানজ্যাকশন ব্যালেন্স পর্যাপ্ত ছিল না।
              <div class="pt-2">
                <a href="/my-purchases" class="btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-block">ক্রয়কৃত ফাইল ডাউনলোড করুন</a>
              </div>
            `;
          }
        }
      } else {
        // Claim failed (0 items)
        const newCooldown = getCooldownRemainingSeconds();
        if (newCooldown > 0) {
          stopAutoRetry();
          lockSubmitForCooldown(newCooldown);
        } else {
          updateSubmitBtnState();
          submitBtn.textContent = 'পুনরায় চেষ্টা করুন';
          renderFailureHelpSection(trxId, payerNumber, { fromAutoRetry: isAuto });
        }
      }
    } catch (err) {
      stopAutoRetry();
      updateSubmitBtnState();
      submitBtn.textContent = 'পুনরায় চেষ্টা করুন';
      showToast(err.message || "পেমেন্ট প্রসেসিং ব্যর্থ হয়েছে", "error");
    }
  });
}

// ==========================================
// Page 6: My Purchases & Downloads (/my-purchases)
// ==========================================
async function renderMyPurchasesPage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  main.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">আমার পারচেজকৃত প্রোডাক্ট</h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">লাইফটাইম ফাইল ডাউনলোড ও অ্যাক্সেস লিঙ্ক</p>
        </div>
        <a href="/products" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold self-start sm:self-auto">
          + নতুন প্রোডাক্ট খুঁজুন
        </a>
      </div>

      <div id="purchases-list-container" class="space-y-4">
        <!-- Skeleton -->
        ${[1, 2].map(() => `
          <div class="surface-card p-5 rounded-2xl flex items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="skeleton w-16 h-16 rounded-xl"></div>
              <div class="space-y-2">
                <div class="skeleton h-5 w-48 rounded-md"></div>
                <div class="skeleton h-3 w-32 rounded-md"></div>
              </div>
            </div>
            <div class="skeleton h-10 w-28 rounded-xl"></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const container = document.getElementById('purchases-list-container');
  const purchases = await loadUserPurchases();

  if (!container) return;

  if (purchases.length === 0) {
    container.innerHTML = `
      <div class="surface-card rounded-2xl p-12 text-center space-y-4">
        <div class="text-5xl">📦</div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">এখনো কোনো প্রোডাক্ট কেনা হয়নি</h2>
        <p class="text-sm text-slate-500">আপনার প্রয়োজনীয় ডিজিটাল প্রোডাক্টগুলো কিনে সাথে সাথে ফাইল সংগ্রহ করুন।</p>
        <div class="pt-2">
          <a href="/products" class="btn-primary px-6 py-3 rounded-xl text-sm font-semibold inline-block">
            প্রোডাক্ট ব্রাউজ করুন
          </a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = purchases.map((item) => `
    <div class="surface-card p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <img src="${getSafeImageUrl(item.product.mainImage, item.product.name, 'code')}" alt="${escapeHtml(item.product.name)}" data-fallback="${getProductFallbackSvg(item.product.name, 'code')}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shrink-0">
        <div class="space-y-1">
          <h3 class="font-bold text-base sm:text-lg text-slate-900 dark:text-white">${escapeHtml(item.product.name)}</h3>
          <div class="text-xs text-slate-500 flex flex-wrap items-center gap-3">
            <span>মূল্য: <strong class="text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">${formatBDT(item.price)}</strong></span>
            <span>TrxID: <strong class="font-mono">${escapeHtml(item.trxId)}</strong></span>
            <span>তারিখ: ${formatDate(item.createdAt)}</span>
          </div>
        </div>
      </div>

      <div class="shrink-0 flex items-center gap-3">
        <button 
          type="button" 
          class="download-product-file-btn btn-primary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs"
          data-pid="${escapeHtml(item.productId)}"
          data-name="${escapeHtml(item.product.name)}"
        >
          <span>⬇️</span> ডাউনলোড ফাইল
        </button>
      </div>
    </div>
  `).join('');

  // Attach secure download handler
  document.querySelectorAll('.download-product-file-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pid = btn.getAttribute('data-pid');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> ফাইল লিংক খোঁজা হচ্ছে...';

      // Remove existing fallback link if present
      const parentContainer = btn.parentElement;
      const existingFallback = parentContainer.querySelector('.file-download-fallback-link');
      if (existingFallback) existingFallback.remove();

      // Open a blank tab synchronously before await to prevent mobile popup blocking
      let w = null;
      try {
        w = window.open('about:blank', '_blank');
        if (w) w.opener = null;
      } catch (e) {
        w = null;
      }

      try {
        const fileInfo = await fetchProductDownloadFile(pid);
        const url = fileInfo?.downloadUrl;
        
        // Validate URL protocol strictly requiring https:
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') {
          throw new Error('অসুরক্ষিত ডাউনলোড লিংক। শুধুমাত্র HTTPS অনুমোদিত।');
        }

        if (w && !w.closed) {
          w.location.href = url;
          showToast('ডাউনলোড শুরু হচ্ছে...', 'success');
        } else {
          // If window.open returned null (blocked by browser), render a visible "ফাইল খুলুন" anchor right under button
          const fallbackLink = document.createElement('a');
          fallbackLink.href = url;
          fallbackLink.target = '_blank';
          fallbackLink.rel = 'noopener noreferrer';
          fallbackLink.className = 'file-download-fallback-link block text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-1.5';
          fallbackLink.textContent = 'ফাইল খুলুন →';
          parentContainer.appendChild(fallbackLink);
          showToast('পপআপ ব্লক হয়েছে। অনুগ্রহ করে "ফাইল খুলুন" লিংকে চাপুন।', 'info');
        }
      } catch (err) {
        if (w && !w.closed) {
          try { w.close(); } catch (e) {}
        }
        showToast(err.message || 'ডাউনলোড লিংক পাওয়া যায়নি', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  });
}

// ==========================================
// Page 7: Profile & History (/profile)
// ==========================================
async function renderProfilePage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  const authState = getAuthState();
  const user = authState.user;
  if (!user) {
    navigateTo('/login?redirect=/profile');
    return;
  }

  const profile = authState.profile || {};

  main.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-8">
      
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">আপনার প্রোফাইল</h1>
          <p class="text-xs sm:text-sm text-slate-500">অ্যাকাউন্ট তথ্য ও পারচেজ হিস্টোরি</p>
        </div>
        <button type="button" id="logout-btn" class="btn-secondary text-xs px-4 py-2 rounded-xl text-rose-600 hover:text-rose-700">
          লগআউট করুন
        </button>
      </div>

      <!-- Profile Form -->
      <form id="profile-update-form" class="surface-card p-6 rounded-2xl space-y-4">
        <h3 class="font-bold text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/60 pb-3">
          ব্যক্তিগত তথ্য
        </h3>

        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">ইমেইল ঠিকানা</label>
          <div class="flex items-center gap-2">
            <input type="email" disabled value="${escapeHtml(user.email)}" class="input-field opacity-75 cursor-not-allowed">
            ${user.emailVerified ? `
              <span class="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">ভেরিফাইড ✓</span>
            ` : `
              <button type="button" id="profile-send-verify-btn" class="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 font-bold hover:bg-amber-500/20 transition">ভেরিফাই করুন</button>
            `}
          </div>
        </div>

        <div>
          <label for="profile-name-input" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">আপনার নাম</label>
          <input type="text" id="profile-name-input" value="${escapeHtml(profile.name || user.displayName || '')}" required class="input-field">
        </div>

        <div>
          <label for="profile-phone-input" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">মোবাইল নম্বর (১১ ডিজিট)</label>
          <input type="tel" id="profile-phone-input" value="${escapeHtml(profile.phone || '')}" placeholder="017XXXXXXXX" class="input-field font-mono">
        </div>

        <div class="pt-2">
          <button type="submit" id="profile-save-btn" class="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">
            তথ্য আপডেট করুন
          </button>
        </div>
      </form>

      <!-- Quick Link to Purchases -->
      <div class="surface-card p-6 rounded-2xl flex items-center justify-between">
        <div class="space-y-1">
          <h4 class="font-bold text-slate-900 dark:text-white">আমার পারচেজ ও ফাইল</h4>
          <p class="text-xs text-slate-500">আপনার ক্রয়কৃত সব ডিজিটাল প্রোডাক্টের তালিকা ও ডাউনলোড লিংক</p>
        </div>
        <a href="/my-purchases" class="btn-primary text-xs px-4 py-2.5 rounded-xl font-bold">
          পারচেজ লিস্ট দেখুন →
        </a>
      </div>

    </div>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await logoutUser();
    navigateTo('/');
  });

  document.getElementById('profile-send-verify-btn')?.addEventListener('click', async () => {
    await resendVerificationEmail();
  });

  document.getElementById('profile-update-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('profile-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'সংরক্ষণ হচ্ছে...';

    const name = document.getElementById('profile-name-input')?.value;
    const phone = document.getElementById('profile-phone-input')?.value;

    try {
      await updateUserProfile({ name, phone });
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'তথ্য আপডেট করুন';
    }
  });
}

function renderLoginPage({ query }) {
  const main = document.getElementById('app-main');
  if (!main) return;

  const authState = getAuthState();
  const redirectUrl = sanitizeRedirect(query.get('redirect'));

  // If already logged in, redirect them to the redirect target
  if (authState.user) {
    navigateTo(redirectUrl);
    return;
  }

  main.innerHTML = `
    <div class="max-w-md mx-auto py-8">
      <div class="surface-card p-8 rounded-3xl shadow-xl space-y-6">
        
        <div class="text-center space-y-2">
          <div class="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-md">E</div>
          <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white">লগইন করুন</h1>
          <p class="text-xs text-slate-500">আপনার ডিজিটাল প্রোডাক্ট অ্যাকাউন্টে প্রবেশ করুন</p>
        </div>

        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ইমেইল ঠিকানা</label>
            <input type="email" id="login-email" required placeholder="name@example.com" class="input-field">
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">পাসওয়ার্ড</label>
              <button type="button" id="forgot-password-btn" class="text-xs text-primary-600 hover:underline">পাসওয়ার্ড ভুলে গেছেন?</button>
            </div>
            <input type="password" id="login-password" required placeholder="••••••••" class="input-field">
          </div>

          <button type="submit" id="login-submit-btn" class="btn-primary w-full py-3 rounded-xl font-bold text-sm shadow-md">
            লগইন
          </button>
        </form>

        <div class="text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4">
          অ্যাকাউন্ট নেই? <a href="/register?redirect=${encodeURIComponent(redirectUrl)}" class="text-primary-600 font-bold hover:underline">নতুন অ্যাকাউন্ট খুলুন</a>
        </div>

      </div>
    </div>
  `;

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-submit-btn');
    btn.disabled = true;
    btn.textContent = 'লগইন হচ্ছে...';

    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;

    try {
      await loginUser(email, password);
      navigateTo(redirectUrl);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'লগইন';
    }
  });

  document.getElementById('forgot-password-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value;
    if (!email) {
      showToast('প্রথমে আপনার ইমেইল ঠিকানাটি লিখুন', 'warning');
      return;
    }
    await resetPassword(email);
  });
}

function renderRegisterPage({ query }) {
  const main = document.getElementById('app-main');
  if (!main) return;

  const authState = getAuthState();
  const redirectUrl = sanitizeRedirect(query.get('redirect'));

  // If already logged in, redirect them to the redirect target
  if (authState.user) {
    navigateTo(redirectUrl);
    return;
  }

  main.innerHTML = `
    <div class="max-w-md mx-auto py-8">
      <div class="surface-card p-8 rounded-3xl shadow-xl space-y-6">
        
        <div class="text-center space-y-2">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-md">E</div>
          <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white">নতুন অ্যাকাউন্ট</h1>
          <p class="text-xs text-slate-500">ডিজিটাল প্রোডাক্ট কেনার জন্য রেজিস্ট্রেশন করুন</p>
        </div>

        <form id="register-form" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">আপনার নাম <span class="text-rose-500">*</span></label>
            <input type="text" id="reg-name" required placeholder="পুরো নাম" class="input-field">
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ইমেইল ঠিকানা <span class="text-rose-500">*</span></label>
            <input type="email" id="reg-email" required placeholder="name@example.com" class="input-field">
            <span class="text-[11px] text-slate-400 mt-1 block">রেজিস্ট্রেশনের পর এই ঠিকানায় ভেরিফিকেশন লিঙ্ক যাবে</span>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">মোবাইল নম্বর <span class="text-rose-500">*</span></label>
            <input type="tel" id="reg-phone" required placeholder="017XXXXXXXX" class="input-field font-mono">
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) <span class="text-rose-500">*</span></label>
            <input type="password" id="reg-password" required minlength="6" placeholder="••••••••" class="input-field">
          </div>

          <button type="submit" id="register-submit-btn" class="btn-primary w-full py-3 rounded-xl font-bold text-sm shadow-md">
            রেজিস্ট্রেশন করুন
          </button>
        </form>

        <div class="text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4">
          ইতিমধ্যে অ্যাকাউন্ট আছে? <a href="/login?redirect=${encodeURIComponent(redirectUrl)}" class="text-primary-600 font-bold hover:underline">লগইন করুন</a>
        </div>

      </div>
    </div>
  `;

  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('register-submit-btn');
    btn.disabled = true;
    btn.textContent = 'রেজিস্ট্রেশন হচ্ছে...';

    const name = document.getElementById('reg-name')?.value;
    const email = document.getElementById('reg-email')?.value;
    const phone = document.getElementById('reg-phone')?.value;
    const password = document.getElementById('reg-password')?.value;

    try {
      await registerUser({ name, email, phone, password });
      navigateTo(redirectUrl);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'রেজিস্ট্রেশন করুন';
    }
  });
}

// ==========================================
// Page 9: Contact & About Us
// ==========================================
function renderContactPage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  setPageMeta({
    title: 'যোগাযোগ ও সাপোর্ট | E Product Hub',
    description: 'যেকোনো প্রশ্ন, পেমেন্ট সংক্রান্ত অনুসন্ধান বা মতামতের জন্য আমাদের সাথে সরাসরি যোগাযোগ করুন।'
  });

  const authState = getAuthState();

  // Part 5b: If user not logged in, show login prompt. If unverified, show email verification notice. If verified, show form.
  let formOrNoticeHtml = '';

  if (!authState.user) {
    formOrNoticeHtml = `
      <div class="surface-card p-6 sm:p-8 rounded-3xl text-center space-y-4 shadow-lg border border-amber-200 dark:border-amber-900/50">
        <div class="text-3xl">🔒</div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">মেসেজ পাঠাতে অনুগ্রহ করে লগইন করুন</h2>
        <p class="text-xs sm:text-sm text-slate-500">স্প্যাম প্রতিরোধে এবং আপনার মেসেজের সঠিক জবাব দিতে লগইন করা আবশ্যক।</p>
        <div class="pt-2">
          <a href="/login?redirect=/contact" class="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md">
            <span>🔑</span> লগইন করুন
          </a>
        </div>
      </div>
    `;
  } else if (!authState.user.emailVerified) {
    formOrNoticeHtml = `
      <div class="surface-card p-6 sm:p-8 rounded-3xl text-center space-y-4 shadow-lg border border-rose-200 dark:border-rose-900/50">
        <div class="text-3xl">✉️</div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">ইমেইল ভেরিফাই করুন</h2>
        <p class="text-xs sm:text-sm text-slate-500">
          আপনার অ্যাকাউন্ট ইমেইল (<span class="font-semibold text-slate-700 dark:text-slate-300">${escapeHtml(authState.user.email || '')}</span>) এখনও ভেরিফাই করা হয়নি। মেসেজ পাঠাতে অনুগ্রহ করে ইমেইল ভেরিফাই করুন।
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button type="button" id="contact-resend-verify-btn" class="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold shadow-md">
            ভেরিফিকেশন ইমেইল পাঠান
          </button>
          <button type="button" id="contact-refresh-verify-btn" class="btn-secondary px-4 py-2.5 rounded-xl text-xs font-semibold">
            🔄 রিলোড
          </button>
        </div>
      </div>
    `;
  } else {
    const defaultName = authState.profile?.name || (authState.user.email ? authState.user.email.split('@')[0] : '');
    formOrNoticeHtml = `
      <form id="contact-form" class="surface-card p-6 sm:p-8 rounded-3xl space-y-5 shadow-lg">
        <!-- Hidden Honeypot Input for Spam Protection -->
        <input type="text" id="contact-hp" name="website" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true" style="position: absolute; left: -9999px; opacity: 0; pointer-events: none;">

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">আপনার নাম (সর্বোচ্চ ১০০ অক্ষর) <span class="text-rose-500">*</span></label>
          <input type="text" id="contact-name" maxlength="100" required value="${escapeHtml(defaultName)}" class="input-field" placeholder="আপনার পুরো নাম">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ইমেইল ঠিকানা (অ্যাকাউন্ট ইমেইল) <span class="text-rose-500">*</span></label>
          <input type="email" id="contact-email" maxlength="200" required readonly value="${escapeHtml(authState.user.email || '')}" class="input-field bg-slate-100 dark:bg-slate-800/60 cursor-not-allowed text-slate-600 dark:text-slate-400" placeholder="name@example.com">
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">আপনার বার্তা (সর্বোচ্চ ২০০০ অক্ষর) <span class="text-rose-500">*</span></label>
            <span id="contact-char-count" class="text-[11px] text-slate-400 font-mono">০ / ২০০০</span>
          </div>
          <textarea id="contact-msg" rows="5" maxlength="2000" required placeholder="আপনার মতামত বা সমস্যা বিস্তারিত লিখুন..." class="input-field resize-none"></textarea>
        </div>

        <button type="submit" id="contact-submit-btn" class="btn-primary w-full py-3 rounded-xl font-bold text-sm shadow-md">
          মেসেজ পাঠান
        </button>
      </form>
    `;
  }

  main.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-8">
      
      <div class="text-center space-y-2">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">যোগাযোগ করুন</h1>
        <p class="text-sm text-slate-500">যেকোনো প্রশ্ন, অর্ডার সংক্রান্ত সমস্যা বা পরামর্শের জন্য আমাদের মেসেজ পাঠান।</p>
      </div>

      <!-- Live Site Config Contact Badges -->
      <div id="contact-site-links" class="flex flex-wrap items-center justify-center gap-3"></div>

      ${formOrNoticeHtml}

    </div>
  `;

  // Populate dynamic contact badges from config/site
  loadPublicSiteConfig().then((cfg) => {
    const linksContainer = document.getElementById('contact-site-links');
    if (!linksContainer || !cfg) return;

    const badges = [];
    if (cfg.whatsapp) {
      badges.push(`
        <a href="https://wa.me/${escapeHtml(cfg.whatsapp)}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20 transition flex items-center gap-1.5 text-xs shadow-xs">
          <span>💬</span> WhatsApp সাপোর্ট
        </a>
      `);
    }
    if (cfg.telegram) {
      badges.push(`
        <a href="https://t.me/${escapeHtml(cfg.telegram)}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold hover:bg-sky-500/20 transition flex items-center gap-1.5 text-xs shadow-xs">
          <span>✈️</span> Telegram এ যোগাযোগ
        </a>
      `);
    }
    if (cfg.facebookUrl) {
      badges.push(`
        <a href="${escapeHtml(cfg.facebookUrl)}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/20 transition flex items-center gap-1.5 text-xs shadow-xs">
          <span>📘</span> Facebook পেজ
        </a>
      `);
    }
    if (cfg.email) {
      badges.push(`
        <a href="mailto:${encodeURIComponent(cfg.email)}" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition flex items-center gap-1.5 text-xs shadow-xs">
          <span>✉️</span> ${escapeHtml(cfg.email)}
        </a>
      `);
    }
    if (cfg.phone) {
      badges.push(`
        <a href="tel:${escapeHtml(cfg.phone)}" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition flex items-center gap-1.5 text-xs shadow-xs">
          <span>📞</span> ${escapeHtml(cfg.phone)}
        </a>
      `);
    }
    linksContainer.innerHTML = badges.join('');
  });

  // Wire verification actions if unverified logged-in user
  if (authState.user && !authState.user.emailVerified) {
    document.getElementById('contact-resend-verify-btn')?.addEventListener('click', async () => {
      await resendVerificationEmail();
    });
    document.getElementById('contact-refresh-verify-btn')?.addEventListener('click', async () => {
      const verified = await refreshVerifiedState();
      if (verified) {
        showToast('ইমেইল সফলভাবে ভেরিফাই হয়েছে!', 'success');
        renderContactPage();
      } else {
        showToast('ইমেইল এখনও ভেরিফাই করা হয়নি। অনুগ্রহ করে ইনবক্স চেক করুন।', 'info');
      }
    });
  }

  // Character counter for verified users
  const msgInput = document.getElementById('contact-msg');
  const charCount = document.getElementById('contact-char-count');
  msgInput?.addEventListener('input', () => {
    const len = msgInput.value.length;
    if (charCount) charCount.textContent = `${len} / ২০০০`;
  });

  // Form submit with honeypot and 60-second localStorage cooldown (wrapped in try/catch)
  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Honeypot check
    const honeypotVal = (document.getElementById('contact-hp')?.value || '').trim();
    if (honeypotVal) {
      // Spam detected: silently pretend success without writing
      showToast('আপনার মেসেজটি সফলভাবে পাঠানো হয়েছে!', 'success');
      if (msgInput) msgInput.value = '';
      return;
    }

    // 2. Client-side 60s cooldown check (Part 4: try/catch for private-browsing compatibility)
    let lastSubmitTime = 0;
    try {
      lastSubmitTime = Number(localStorage.getItem('eph_contact_cooldown') || 0);
    } catch (storageErr) {
      lastSubmitTime = 0; // treat failure as no cooldown stored
    }

    const now = Date.now();
    if (now - lastSubmitTime < 60000) {
      const waitRemaining = Math.ceil((60000 - (now - lastSubmitTime)) / 1000);
      showToast(`অনুগ্রহ করে আরও ${waitRemaining} সেকেন্ড অপেক্ষা করে মেসেজ পাঠান।`, 'warning');
      return;
    }

    const btn = document.getElementById('contact-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'পাঠানো হচ্ছে...';
    }

    const name = (document.getElementById('contact-name')?.value || '').trim().slice(0, 100);
    // Part 5: Email must equal request.auth.token.email
    const userEmail = authState.user?.email || '';
    const message = (document.getElementById('contact-msg')?.value || '').trim().slice(0, 2000);

    if (!name || name.length < 1 || !userEmail || !message || message.length < 1) {
      showToast('সবগুলো প্রয়োজনীয় ঘর পূরণ করুন', 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'মেসেজ পাঠান';
      }
      return;
    }

    try {
      // Must match updated security rule in Part 5:
      // verified()
      // && keys().hasOnly(['name','email','message','createdAt'])
      // && name is string && name.size() >= 1 && name.size() <= 100
      // && email == request.auth.token.email
      // && message is string && message.size() >= 1 && message.size() <= 2000
      // && createdAt == request.time
      await addDoc(collection(db, 'contactMessages'), {
        name,
        email: userEmail,
        message,
        createdAt: serverTimestamp()
      });

      // Part 4: wrap localStorage write in try/catch
      try {
        localStorage.setItem('eph_contact_cooldown', String(Date.now()));
      } catch (storageErr) {
        // Safe in private-browsing mode or storage quota errors
      }

      showToast('আপনার মেসেজটি সফলভাবে পাঠানো হয়েছে!', 'success');
      if (msgInput) msgInput.value = '';
      if (charCount) charCount.textContent = '০ / ২০০০';
    } catch (err) {
      showToast('মেসেজ পাঠানো সম্ভব হয়নি। আবার চেষ্টা করুন।', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'মেসেজ পাঠান';
      }
    }
  });
}

function renderAboutPage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  setPageMeta({
    title: 'আমাদের সম্পর্কে ও FAQ | E Product Hub',
    description: 'E Product Hub এর কার্যপ্রণালী, অটোমেটেড পেমেন্ট সিস্টেম ও সাধারণ জিজ্ঞাসা জানুন।'
  });

  main.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-8">
      
      <div class="space-y-4">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          E Product Hub সম্পর্কে
        </h1>
        <p class="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong>E Product Hub</strong> হলো একটি সর্বাধুনিক ও নিরাপদ ডিজিটাল প্রোডাক্টের ই-কমার্স প্ল্যাটফর্ম। আমাদের মূল লক্ষ্য হলো ডিজিটাল ক্রিয়েটর, শিক্ষার্থী, ডেভেলপার এবং ফ্রিল্যান্সারদের জন্য প্রিমিয়াম ডিজিটাল সম্পদসমূহ সহজলভ্য করা।
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="surface-card p-6 rounded-2xl space-y-2">
          <h3 class="font-bold text-lg text-slate-900 dark:text-white">🚀 সম্পূর্ণ অটোমেটেড পেমেন্ট</h3>
          <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
            TrxSync প্রযুক্তির সমন্বয়ে বিকাশ, নগদ বা রকেটে পেমেন্ট করার পর ট্রানজ্যাকশন আইডি সাবমিট করলেই কোনো মানুষের হস্তক্ষেপ ছাড়াই সেকেন্ডের মধ্যে আপনার ফাইল প্রস্তুত হয়ে যায়।
          </p>
        </div>

        <div class="surface-card p-6 rounded-2xl space-y-2">
          <h3 class="font-bold text-lg text-slate-900 dark:text-white">🔐 ক্লাউড সিকিউরিটি</h3>
          <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
            গুগল ফায়ারস্টোর v10 সিকিউরিটি রুলস এর মাধ্যমে প্রতিটি ফাইলের লিংক সংরক্ষিত রাখা হয়। শুধুমাত্র যাচাইকৃত ক্রেতাই তাঁর ক্রয়কৃত ফাইল অ্যাক্সেস করতে পারেন।
          </p>
        </div>
      </div>

      <div class="surface-card p-6 rounded-2xl space-y-4">
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">সাধারণ জিজ্ঞাসা (FAQ)</h3>
        <div class="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <div>
            <strong class="text-slate-900 dark:text-white block">১. পেমেন্টের পর ফাইল কোথায় পাবো?</strong>
            <span>পেমেন্ট সফল হওয়ার সাথে সাথে আপনি 'আমার পারচেজ' পেজে চলে যাবেন। সেখান থেকে সরাসরি 'ডাউনলোড ফাইল' বাটনে ক্লিক করে ফাইল নামাতে পারবেন।</span>
          </div>
          <div>
            <strong class="text-slate-900 dark:text-white block">২. এসএমএস আসতে দেরি হলে কী করবো?</strong>
            <span>মোবাইল অপারেটর থেকে ফিরতি SMS আসার পর TrxSync সিঙ্ক হতে ৩০ থেকে ৬০ সেকেন্ড লাগতে পারে। একটু অপেক্ষা করে পুনরায় 'চেষ্টা করুন' বাটনে চাপুন।</span>
          </div>
          <div>
            <strong class="text-slate-900 dark:text-white block">৩. ইমেইল ভেরিফিকেশন কেন প্রয়োজন?</strong>
            <span>আপনার অ্যাকাউন্টের লাইফটাইম নিরাপত্তা এবং অপব্যবহার রোধ করার জন্য কেনার আগে ইমেইল ভেরিফিকেশন বাধ্যতামূলক।</span>
          </div>
        </div>
      </div>

      <!-- Sitemap / Policy Links Section -->
      <div class="surface-card p-6 rounded-2xl space-y-3 border border-slate-200/80 dark:border-slate-800/80">
        <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <span>📜</span> গুরুত্বপূর্ণ পলিসি ও নির্দেশিকা
        </h3>
        <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <a href="/terms" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1.5">
              <span>➔</span> ব্যবহারের নিয়মাবলী ও শর্তাবলী (Terms & Conditions)
            </a>
          </li>
          <li>
            <a href="/privacy" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1.5">
              <span>➔</span> গোপনীয়তা নীতি (Privacy Policy)
            </a>
          </li>
          <li>
            <a href="/refund-policy" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1.5">
              <span>➔</span> রিফান্ড ও রিটার্ন পলিসি (Refund Policy)
            </a>
          </li>
        </ul>
      </div>

    </div>
  `;
}

// ==========================================
// Policy Pages (/terms, /privacy, /refund-policy)
// ==========================================
function renderTermsPage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  setPageMeta({
    title: 'ব্যবহারের শর্তাবলী | E Product Hub',
    description: 'E Product Hub ব্যবহারের নীতিমালা, ডিজিটাল লাইসেন্স এবং ক্রয় সংক্রান্ত শর্তাবলী।'
  });

  main.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-6">
      
      <!-- Owner Review Note -->
      <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs sm:text-sm font-medium">
        ℹ️ এই নীতিমালা সাইট মালিক পর্যালোচনা করে হালনাগাদ করবেন।
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">ব্যবহারের শর্তাবলী (Terms & Conditions)</h1>
        <p class="text-xs text-slate-500">সর্বশেষ আপডেট: ${new Date().toLocaleDateString('bn-BD')}</p>
      </div>

      <div class="surface-card p-6 sm:p-8 rounded-3xl space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        
        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">১. ভূমিকা ও গ্রহণযোগ্যতা</h2>
          <p>
            E Product Hub-এ স্বাগতম। এই ওয়েবসাইটে প্রবেশ বা কোনো ডিজিটাল প্রোডাক্ট ক্রয় করার মাধ্যমে আপনি এই শর্তাবলীর প্রতি সম্পূর্ণ সম্মতি প্রকাশ করছেন। যদি আপনি এই শর্তাবলীতে সম্মত না হন, তবে অনুগ্রহ করে সাইটটি ব্যবহার বা কোনো পণ্য ক্রয় থেকে বিরত থাকুন।
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">২. ক্রয় ও অটোমেটেড পেমেন্ট পদ্ধতি</h2>
          <p>
            আমাদের প্ল্যাটফর্মে বিকাশ, নগদ, রকেট ও উপায়-এর মাধ্যমে পেমেন্ট সম্পন্ন করা যায়। গ্রাহক নির্ধারিত নম্বরে অর্থ Send Money করে প্রাপ্ত Transaction ID (TrxID) এবং যে নম্বর থেকে টাকা পাঠিয়েছেন (Payer Number) তা চেকআউটে প্রবেশ করান। আমাদের TrxSync সিস্টেম স্বয়ংক্রিয়ভাবে লেনদেন যাচাই করে তাৎক্ষণিক ফাইল ডাউনলোডের অ্যাক্সেস প্রদান করে।
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">৩. লাইসেন্স ও ডিজিটাল অ্যাক্সেস</h2>
          <p>
            প্রতিটি সফল কেনাকাটার বিপরীতে একজন ক্রেতাকে শুধুমাত্র <strong>ব্যক্তিগত ও লাইফটাইম ব্যবহারের (Personal Use Lifetime Access)</strong> অনুমতি দেওয়া হয়। ক্রয়কৃত ফাইল, সোর্স কোড, ই-বুক বা টেমপ্লেট কোনোভাবেই অন্য কারও কাছে পুনরায় বিক্রি (Resale), শেয়ার, বা কোনো প্রকাশ্য ফোরাম/ওয়েবসাইটে বিনামূল্যে পুনঃবিতরণ (Redistribution) করা সম্পূর্ণ নিষিদ্ধ।
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">৪. বৌদ্ধিক সম্পত্তি ও কপিরাইট</h2>
          <p>
            প্ল্যাটফর্মের সমস্ত টেক্সট, লোগো, কোড, মেটাডাটা এবং ডিজিটাল পণ্যের কপিরাইট E Product Hub এবং সংশ্লিষ্ট নির্মাতাদের অনুকূলে সংরক্ষিত। যেকোনো ধরণের অননুমোদিত অনুলিপি বা পরিবর্তন আইনত দণ্ডনীয়।
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">৫. অ্যাকাউন্ট নিরাপত্তা</h2>
          <p>
            সঠিক ফাইল অ্যাক্সেস নিশ্চিত করতে ব্যবহারকারীকে অবশ্যই নিজস্ব বৈধ ইমেইল দিয়ে রেজিস্টার ও ইমেইল ভেরিফাই করতে হবে। আপনার লগইন তথ্যের গোপনীয়তা রক্ষার দায়িত্ব সম্পূর্ণ আপনার।
          </p>
        </section>

      </div>

    </div>
  `;
}

function renderPrivacyPage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  setPageMeta({
    title: 'গোপনীয়তা নীতি | E Product Hub',
    description: 'E Product Hub ব্যবহারকারীর ব্যক্তিগত তথ্যের সুরক্ষা ও গোপনীয়তা রক্ষার নীতিমালা।'
  });

  main.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-6">
      
      <!-- Owner Review Note -->
      <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs sm:text-sm font-medium">
        ℹ️ এই নীতিমালা সাইট মালিক পর্যালোচনা করে হালনাগাদ করবেন।
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">গোপনীয়তা নীতি (Privacy Policy)</h1>
        <p class="text-xs text-slate-500">সর্বশেষ আপডেট: ${new Date().toLocaleDateString('bn-BD')}</p>
      </div>

      <div class="surface-card p-6 sm:p-8 rounded-3xl space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        
        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">১. সংগৃহীত তথ্যাবলী</h2>
          <p>
            আমরা শুধুমাত্র অর্ডার প্রক্রিয়াকরণ এবং অ্যাকাউন্ট সুরক্ষার জন্য প্রয়োজনীয় ব্যক্তিগত তথ্য সংগ্রহ করি। এর মধ্যে অন্তর্ভুক্ত:
          </p>
          <ul class="list-disc list-inside space-y-1 pl-2">
            <li>নাম এবং ইমেইল ঠিকানা (রেজিস্ট্রেশন ও ভেরিফিকেশনের জন্য)</li>
            <li>মোবাইল নম্বর (যোগাযোগের প্রয়োজনে)</li>
            <li>পেমেন্ট প্রেরক নম্বর (Payer Number) এবং লেনদেন আইডি (TrxID)</li>
          </ul>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">২. তথ্যের ব্যবহার</h2>
          <p>
            সংগৃহীত তথ্য শুধুমাত্র আপনার ক্রয়কৃত পণ্যের তাৎক্ষণিক ডেলিভারি নিশ্চিত করতে, অ্যাকাউন্টে লাইফটাইম ডাউনলোড লিংক সংরক্ষিত রাখতে এবং কোনো টেকনিক্যাল সমস্যা হলে কাস্টমার সাপোর্ট প্রদানে ব্যবহৃত হয়।
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">৩. আর্থিক তথ্যের নিরাপত্তা</h2>
          <p>
            <strong>পেমেন্ট পিন বা ব্যাংক পাসওয়ার্ড:</strong> আমাদের সাইটে কোনো প্রকার পিন, পাসওয়ার্ড বা ওটিপি কখনোই চাওয়া হয় না এবং সংরক্ষণ করা হয় না। ট্রানজ্যাকশন ভেরিফিকেশনের জন্য কেবলমাত্র আপনার প্রদানকৃত TrxID ও প্রেরক নম্বর ব্যবহার করা হয়।
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">৪. তথ্য সুরক্ষা ও ফায়ারস্টোর এনক্রিপশন</h2>
          <p>
            আপনার তথ্য গুগল ক্লাউড ফায়ারস্টোরের এনক্রিপ্টেড ডাটাবেজে সংরক্ষিত থাকে। আমাদের সিকিউরিটি রুলস এমনভাবে সাজানো যাতে কোনো ব্যবহারকারী অন্য কোনো ব্যবহারকারীর ব্যক্তিগত তথ্য দেখতে না পারেন।
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">৫. তৃতীয় পক্ষের সাথে তথ্য প্রকাশ</h2>
          <p>
            আমরা কোনো অবস্থাতেই আপনার ব্যক্তিগত তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি, ভাড়া বা বিপণনের উদ্দেশ্যে উন্মুক্ত করি না।
          </p>
        </section>

      </div>

    </div>
  `;
}

function renderRefundPolicyPage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  setPageMeta({
    title: 'রিফান্ড পলিসি | E Product Hub',
    description: 'E Product Hub এর ডিজিটাল প্রোডাক্ট ক্রয় ও রিফান্ড সংক্রান্ত সুনির্দিষ্ট নীতিমালা।'
  });

  main.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-6">
      
      <!-- Owner Review Note -->
      <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs sm:text-sm font-medium">
        ℹ️ এই নীতিমালা সাইট মালিক পর্যালোচনা করে হালনাগাদ করবেন।
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">রিফান্ড পলিসি (Refund Policy)</h1>
        <p class="text-xs text-slate-500">সর্বশেষ আপডেট: ${new Date().toLocaleDateString('bn-BD')}</p>
      </div>

      <div class="surface-card p-6 sm:p-8 rounded-3xl space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        
        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">১. ডিজিটাল ডেলিভারি ও সাধারণ রিফান্ড নীতি</h2>
          <p>
            E Product Hub-এ বিক্রি হওয়া সমস্ত পণ্য ইনস্ট্যান্ট ডিজিটাল ডেলিভারি (Instant Cloud Download) পদ্ধতিতে তাৎক্ষণিকভাবে ক্রেতার অ্যাকাউন্টে আনলক করা হয়। যেহেতু ডিজিটাল ফাইল একবার ডাউনলোড বা অ্যাক্সেস হয়ে গেলে তা ফেরত নেওয়া অসম্ভব, তাই <strong>ফাইল সফলভাবে ডাউনলোড করার পর সাধারণত কোনো রিফান্ড প্রযোজ্য নয়</strong>।
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">২. রিফান্ডের যোগ্য ব্যতিক্রমসমূহ</h2>
          <p>
            নিম্নলিখিত বিশেষ পরিস্থিতিতে গ্রাহক রিফান্ড বা বিকল্প ফাইলের দাবি করতে পারবেন:
          </p>
          <ul class="list-disc list-inside space-y-1 pl-2">
            <li>যদি প্রদত্ত ফাইলটি ত্রুটিপূর্ণ, নষ্ট (Corrupted) বা অকার্যকর প্রমাণিত হয় এবং আমাদের টিম তা সংশোধন করতে ব্যর্থ হয়।</li>
            <li>বর্ণনার সাথে ফাইলের মূল বিষয়ের গুরুতর অমিল থাকলে।</li>
            <li>পেমেন্ট সফল হওয়া সত্ত্বেও প্রযুক্তিগত কারণে ২৪ ঘণ্টার মধ্যে ফাইল লিংক প্রস্তুত না হলে।</li>
          </ul>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">৩. রিপোর্ট করার সময়সীমা ও প্রক্রিয়া</h2>
          <p>
            ফাইলে কোনো প্রকার ত্রুটি দেখা দিলে ক্রয়ের <strong>৩ (তিন) দিনের মধ্যে</strong> আমাদের সাইটের <a href="/contact" class="text-indigo-600 dark:text-indigo-400 underline font-semibold">Contact</a> পেজের মাধ্যমে আপনার TrxID, নিবন্ধিত ইমেইল এবং সমস্যার বিবরণ লিখে যোগাযোগ করতে হবে।
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">৪. রিফান্ড নিষ্পত্তির মাধ্যম</h2>
          <p>
            যথাযথ যাচাই-বাছাইয়ের পর রিফান্ডের দাবি অনুমোদিত হলে ৩ থেকে ৫ কার্যদিবসের মধ্যে যে নম্বর থেকে পেমেন্ট করা হয়েছিল (bKash/Nagad/Rocket/Upay) সেই নম্বরে অর্থ রিফান্ড করা হবে।
          </p>
        </section>

      </div>

    </div>
  `;
}

// ==========================================
// Page 10: Admin Panel (/admin)
// ==========================================
async function renderAdminPage() {
  const main = document.getElementById('app-main');
  if (!main) return;

  setPageMeta({
    title: 'অ্যাডমিন ড্যাশবোর্ড | E Product Hub',
    description: 'E Product Hub অ্যাডমিন কন্ট্রোল প্যানেল - প্রোডাক্ট, বিক্রয়, ট্রানজ্যাকশন ও সেটিংস।'
  });

  const authState = getAuthState();
  if (!authState.isAdmin) {
    main.innerHTML = `
      <div class="max-w-md mx-auto py-16 text-center space-y-4">
        <div class="text-4xl">⛔</div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">অনুমতি নেই</h2>
        <p class="text-sm text-slate-500">এই পেজটি শুধুমাত্র অনুমোদিত অ্যাডমিনের জন্য।</p>
        <a href="/" class="btn-primary px-5 py-2.5 rounded-xl text-sm inline-block">হোমে ফিরে যান</a>
      </div>
    `;
    return;
  }

  main.innerHTML = `
    <div class="space-y-6">
      
      <!-- Admin Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-bold text-xs uppercase">অ্যাডমিন ড্যাশবোর্ড</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">E Product Hub কন্ট্রোল প্যানেল</h1>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">লগইন: <strong>${escapeHtml(authState.user.email)}</strong></span>
        </div>
      </div>

      <!-- Admin Tabs Navigation -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold">
        <button type="button" class="admin-tab-btn px-4 py-2 rounded-xl transition bg-primary-600 text-white shrink-0" data-tab="products">
          📦 প্রোডাক্টস
        </button>
        <button type="button" class="admin-tab-btn px-4 py-2 rounded-xl transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 shrink-0" data-tab="sales">
          📈 বিক্রয়
        </button>
        <button type="button" class="admin-tab-btn px-4 py-2 rounded-xl transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 shrink-0" data-tab="sliders">
          🖼️ হিরো স্লাইডার
        </button>
        <button type="button" class="admin-tab-btn px-4 py-2 rounded-xl transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 shrink-0" data-tab="payments">
          💳 পেমেন্ট সেটিংস
        </button>
        <button type="button" class="admin-tab-btn px-4 py-2 rounded-xl transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 shrink-0" data-tab="site-settings">
          ⚙️ সাইট সেটিংস
        </button>
        <button type="button" class="admin-tab-btn px-4 py-2 rounded-xl transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 shrink-0" data-tab="imgbb">
          ☁️ ImgBB আপলোডার
        </button>
        <button type="button" class="admin-tab-btn px-4 py-2 rounded-xl transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 shrink-0" data-tab="transactions">
          📊 TrxSync ট্রানজ্যাকশন
        </button>
        <button type="button" class="admin-tab-btn px-4 py-2 rounded-xl transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 shrink-0" data-tab="messages">
          📬 মেসেজসমূহ
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="admin-tab-content" class="min-h-[400px]"></div>

    </div>
  `;

  // Attach tab switching
  const tabs = document.querySelectorAll('.admin-tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.className = 'admin-tab-btn px-4 py-2 rounded-xl transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 shrink-0';
      });
      tab.className = 'admin-tab-btn px-4 py-2 rounded-xl transition bg-primary-600 text-white shrink-0';
      loadAdminTab(tab.getAttribute('data-tab'));
    });
  });

  // Load default tab
  loadAdminTab('products');
}

/**
 * Loads specific admin tab
 */
async function loadAdminTab(tabName) {
  const container = document.getElementById('admin-tab-content');
  if (!container) return;

  container.innerHTML = '<div class="py-12 text-center text-slate-500">তথ্য লোড হচ্ছে...</div>';

  if (tabName === 'products') {
    await renderAdminProductsTab(container);
  } else if (tabName === 'sales') {
    await renderAdminSalesTab(container);
  } else if (tabName === 'sliders') {
    await renderAdminSlidersTab(container);
  } else if (tabName === 'payments') {
    await renderAdminPaymentsTab(container);
  } else if (tabName === 'site-settings') {
    await renderAdminSiteSettingsTab(container);
  } else if (tabName === 'imgbb') {
    await renderAdminImgBBTab(container);
  } else if (tabName === 'transactions') {
    await renderAdminTransactionsTab(container);
  } else if (tabName === 'messages') {
    await renderAdminMessagesTab(container);
  }
}

// Admin Tab 1: Products Management
async function renderAdminProductsTab(container) {
  const products = await adminLoadProducts();

  container.innerHTML = `
    <div class="space-y-6">
      
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">সব প্রোডাক্ট (${products.length})</h3>
        <button type="button" id="admin-add-product-btn" class="btn-primary text-xs sm:text-sm px-4 py-2 rounded-xl font-bold flex items-center gap-1.5">
          <span>+</span> নতুন প্রোডাক্ট যোগ করুন
        </button>
      </div>

      <!-- Product Form Modal / Section (Hidden initially) -->
      <div id="admin-product-form-container" class="hidden surface-card p-6 rounded-2xl space-y-4 border-2 border-primary-500/30"></div>

      <!-- Products Table / Cards -->
      <div class="surface-card rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th class="p-3 sm:p-4">ছবি</th>
                <th class="p-3 sm:p-4">নাম</th>
                <th class="p-3 sm:p-4">মূল্য (BDT)</th>
                <th class="p-3 sm:p-4">স্ট্যাটাস</th>
                <th class="p-3 sm:p-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              ${products.length === 0 ? `
                <tr><td colspan="5" class="p-6 text-center text-slate-500">কোনো প্রোডাক্ট যোগ করা হয়নি।</td></tr>
              ` : products.map((p) => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td class="p-3 sm:p-4">
                    <img src="${getSafeImageUrl(p.mainImage, p.name, 'code')}" alt="${escapeHtml(p.name)}" data-fallback="${getProductFallbackSvg(p.name, 'code')}" referrerpolicy="no-referrer" class="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
                  </td>
                  <td class="p-3 sm:p-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                    ${escapeHtml(p.name)}
                  </td>
                  <td class="p-3 sm:p-4 font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                    ${formatBDT(p.price)}
                  </td>
                  <td class="p-3 sm:p-4">
                    <span class="px-2 py-1 rounded-md text-[11px] font-bold ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'}">
                      ${p.status === 'active' ? 'অ্যাক্টিভ' : 'নিষ্ক্রিয়'}
                    </span>
                  </td>
                  <td class="p-3 sm:p-4 text-right space-x-2 shrink-0">
                    <button type="button" class="admin-edit-prod-btn text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg font-bold" data-id="${escapeHtml(p.id)}">
                      এডিট
                    </button>
                    <button type="button" class="admin-delete-prod-btn text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 px-3 py-1.5 rounded-lg font-bold" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}">
                      মুছুন
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  const formContainer = document.getElementById('admin-product-form-container');

  function showProductForm(product = null, fileData = null) {
    if (!formContainer) return;
    formContainer.classList.remove('hidden');
    formContainer.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h4 class="font-bold text-slate-900 dark:text-white text-base">
          ${product ? 'প্রোডাক্ট এডিট করুন' : 'নতুন প্রোডাক্ট যুক্ত করুন'}
        </h4>
        <button type="button" id="close-prod-form-btn" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
      </div>

      <form id="save-product-form" class="space-y-4">
        <input type="hidden" id="prod-id" value="${escapeHtml(product?.id || '')}">

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold mb-1">প্রোডাক্টের নাম *</label>
            <input type="text" id="prod-name" required value="${escapeHtml(product?.name || '')}" class="input-field" placeholder="যেমন: ফুলস্ট্যাক ওয়েবসাইট সোর্স কোড">
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">মূল্য (BDT পূর্ণসংখ্যা) *</label>
            <input type="number" id="prod-price" required min="1" step="1" value="${escapeHtml(product?.price || '')}" class="input-field" placeholder="যেমন: ৫০০">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1">প্রোডাক্টের বিবরণ (Formatting: # Heading, * List, **Bold**) *</label>
          <textarea id="prod-desc" rows="4" required class="input-field resize-y" placeholder="বিস্তারিত বর্ণনা...">${escapeHtml(product?.description || '')}</textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold mb-1">প্রধান ছবির লিংক (https://i.ibb.co/...) *</label>
            <input type="url" id="prod-main-img" required value="${escapeHtml(product?.mainImage || '')}" class="input-field font-mono text-xs" placeholder="https://i.ibb.co/xxxxxx.jpg">
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">ইউটিউব ভিডিও লিঙ্ক (ঐচ্ছিক)</label>
            <input type="url" id="prod-yt" value="${escapeHtml(product?.youtubeUrl || '')}" class="input-field font-mono text-xs" placeholder="https://youtube.com/watch?v=...">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1">অতিরিক্ত ছবির লিংকসমূহ (কমা দিয়ে আলাদা করুন, i.ibb.co)</label>
          <input type="text" id="prod-add-imgs" value="${escapeHtml((product?.images || []).join(', '))}" class="input-field font-mono text-xs" placeholder="https://i.ibb.co/1.jpg, https://i.ibb.co/2.jpg">
        </div>

        <!-- Secret File Download URL (Saved to productFiles/{pid}, never in products doc) -->
        <div class="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
          <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
            <span>🔒</span> গোপন ডাউনলোড লিংক (শুধুমাত্র ক্রেতা দেখতে পাবেন)
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1">সিক্রেট ডাউনলোড লিংক (Drive/Mega/etc) *</label>
              <input type="url" id="prod-download-url" required value="${escapeHtml(fileData?.downloadUrl || '')}" class="input-field font-mono text-xs" placeholder="https://drive.google.com/...">
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">ফাইলের নাম</label>
              <input type="text" id="prod-file-name" value="${escapeHtml(fileData?.fileName || '')}" class="input-field text-xs" placeholder="যেমন: E-Book-Complete.zip">
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold mb-1">ক্যাটাগরি *</label>
            <select id="prod-category" class="input-field text-sm">
              <option value="ebook" ${product?.category === 'ebook' ? 'selected' : ''}>ই-বুক</option>
              <option value="ui" ${product?.category === 'ui' ? 'selected' : ''}>UI/টেমপ্লেট</option>
              <option value="script" ${product?.category === 'script' ? 'selected' : ''}>স্ক্রিপ্ট/কোড</option>
              <option value="graphic" ${product?.category === 'graphic' ? 'selected' : ''}>গ্রাফিক্স</option>
              <option value="other" ${(!product?.category || product?.category === 'other') ? 'selected' : ''}>অন্যান্য</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">লাইভ প্রিভিউ লিঙ্ক (ঐচ্ছিক, https://)</label>
            <input type="url" id="prod-preview-url" value="${escapeHtml(product?.previewUrl || '')}" class="input-field font-mono text-xs" placeholder="https://preview.example.com">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold mb-1">ফাইলের সাইজ (সর্বোচ্চ ৩০ অক্ষর)</label>
            <input type="text" id="prod-file-size" maxlength="30" value="${escapeHtml(product?.fileSize || '')}" class="input-field text-xs" placeholder="যেমন: 25 MB">
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">ভার্সন (সর্বোচ্চ ২০ অক্ষর)</label>
            <input type="text" id="prod-version" maxlength="20" value="${escapeHtml(product?.version || '')}" class="input-field text-xs" placeholder="যেমন: 1.0.0">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1">স্ট্যাটাস</label>
          <select id="prod-status" class="input-field text-sm">
            <option value="active" ${product?.status === 'active' ? 'selected' : ''}>অ্যাক্টিভ (সরাসরি স্টোরে দেখাবে)</option>
            <option value="inactive" ${product?.status === 'inactive' ? 'selected' : ''}>নিষ্ক্রিয় (লুকিয়ে রাখুন)</option>
          </select>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3">
          <button type="button" id="cancel-prod-form-btn" class="btn-secondary px-4 py-2 rounded-xl text-xs">বাতিল</button>
          <button type="submit" id="save-prod-submit-btn" class="btn-primary px-6 py-2 rounded-xl text-xs font-bold">সংরক্ষণ করুন</button>
        </div>
      </form>
    `;

    document.getElementById('close-prod-form-btn')?.addEventListener('click', () => formContainer.classList.add('hidden'));
    document.getElementById('cancel-prod-form-btn')?.addEventListener('click', () => formContainer.classList.add('hidden'));

    document.getElementById('save-product-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('save-prod-submit-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'সংরক্ষণ হচ্ছে...';

      const id = document.getElementById('prod-id')?.value || null;
      const name = document.getElementById('prod-name')?.value;
      const price = document.getElementById('prod-price')?.value;
      const description = document.getElementById('prod-desc')?.value;
      const mainImage = document.getElementById('prod-main-img')?.value;
      const youtubeUrl = document.getElementById('prod-yt')?.value;
      const rawAddImgs = document.getElementById('prod-add-imgs')?.value || '';
      const downloadUrl = document.getElementById('prod-download-url')?.value;
      const fileName = document.getElementById('prod-file-name')?.value;
      const status = document.getElementById('prod-status')?.value;
      const category = document.getElementById('prod-category')?.value;
      const fileSize = document.getElementById('prod-file-size')?.value;
      const version = document.getElementById('prod-version')?.value;
      const previewUrl = document.getElementById('prod-preview-url')?.value;

      const images = rawAddImgs.split(',').map((s) => s.trim()).filter(Boolean);

      try {
        await adminSaveProduct({
          id,
          name,
          price,
          description,
          mainImage,
          youtubeUrl,
          images,
          downloadUrl,
          fileName,
          status,
          category,
          fileSize,
          version,
          previewUrl
        });
        showToast('প্রোডাক্ট সফলভাবে সংরক্ষণ করা হয়েছে!', 'success');
        formContainer.classList.add('hidden');
        renderAdminProductsTab(container);
      } catch (err) {
        showToast(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'সংরক্ষণ করুন';
      }
    });
  }

  document.getElementById('admin-add-product-btn')?.addEventListener('click', () => {
    showProductForm();
  });

  document.querySelectorAll('.admin-edit-prod-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const prod = products.find((p) => p.id === id);
      const fileData = await adminGetProductFile(id);
      showProductForm(prod, fileData);
    });
  });

  document.querySelectorAll('.admin-delete-prod-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      showConfirmDialog({
        title: 'প্রোডাক্ট ডিলিট',
        message: `আপনি কি নিশ্চিত যে "${name}" প্রোডাক্টটি ডিলিট করতে চান? এটি সাথে সাথে স্টোর ও ফাইল ডাটাবেজ থেকে মুছে যাবে।`,
        confirmText: 'হ্যাঁ, মুছুন',
        onConfirm: async () => {
          await adminDeleteProduct(id);
          showToast('প্রোডাক্ট মুছে ফেলা হয়েছে', 'info');
          renderAdminProductsTab(container);
        }
      });
    });
  });
}

// Buyer email lookup cache for Sales tab
const buyerEmailCache = new Map();
async function getBuyerEmail(uid) {
  if (!uid) return 'অজানা';
  if (buyerEmailCache.has(uid)) return buyerEmailCache.get(uid);
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const email = snap.exists() ? (snap.data().email || 'ইমেইল নেই') : 'ইউজার নেই';
    buyerEmailCache.set(uid, email);
    return email;
  } catch (e) {
    buyerEmailCache.set(uid, 'অনুপলব্ধ');
    return 'অনুপলব্ধ';
  }
}

// Admin Tab: Sales & Revenue Analytics (purchases)
async function renderAdminSalesTab(container) {
  const [purchases, products] = await Promise.all([
    adminLoadPurchases(),
    adminLoadProducts()
  ]);

  const productMap = new Map();
  products.forEach((p) => productMap.set(p.id, p));

  // Compute stats
  const totalSalesCount = purchases.length;
  const totalRevenue = purchases.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayPurchases = purchases.filter((p) => {
    const t = p.createdAt?.toMillis ? p.createdAt.toMillis() : (p.createdAt ? new Date(p.createdAt).getTime() : 0);
    return t >= startOfToday;
  });
  const todayRevenue = todayPurchases.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const last7DaysPurchases = purchases.filter((p) => {
    const t = p.createdAt?.toMillis ? p.createdAt.toMillis() : (p.createdAt ? new Date(p.createdAt).getTime() : 0);
    return t >= sevenDaysAgo;
  });
  const last7DaysRevenue = last7DaysPurchases.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  // Top 3 products by sales count
  const countByProduct = new Map();
  purchases.forEach((p) => {
    countByProduct.set(p.productId, (countByProduct.get(p.productId) || 0) + 1);
  });
  const topProducts = Array.from(countByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pid, count]) => ({
      name: productMap.get(pid)?.name || `প্রোডাক্ট #${pid}`,
      count
    }));

  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="font-bold text-lg text-slate-900 dark:text-white">বিক্রয় ও রাজস্ব বিশ্লেষণ</h3>
          <p class="text-xs text-slate-500">ফায়ারস্টোর purchases কালেকশন থেকে রিয়েল-টাইম ডাটা (সর্বোচ্চ ৫০০টি)</p>
        </div>
        <button type="button" id="admin-manual-grant-btn" class="btn-primary text-xs sm:text-sm px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0">
          <span>+</span> ম্যানুয়াল অ্যাক্সেস দিন
        </button>
      </div>

      <!-- Manual Access Modal / Form (Hidden initially) -->
      <div id="admin-manual-grant-container" class="hidden surface-card p-6 rounded-2xl space-y-4 border-2 border-indigo-500/40">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-slate-900 dark:text-white text-base">গ্রাহককে ম্যানুয়াল অ্যাক্সেস প্রদান</h4>
          <button type="button" id="close-manual-grant-btn" class="text-slate-400 hover:text-slate-600 text-sm font-bold p-1">✕</button>
        </div>
        <form id="admin-manual-grant-form" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold mb-1">গ্রাহকের ইমেইল *</label>
              <input type="email" id="grant-buyer-email" required class="input-field text-xs" placeholder="customer@example.com">
              <span class="text-[11px] text-slate-400 block mt-1">গ্রাহকের সাইটে রেজিস্টার্ড ইমেইল দিন</span>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">প্রোডাক্ট নির্বাচন করুন *</label>
              <select id="grant-product-id" required class="input-field text-xs">
                <option value="">-- প্রোডাক্ট বেছে নিন --</option>
                ${products.map(p => `
                  <option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${formatBDT(p.price)})</option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold mb-1">Transaction ID (ঐচ্ছিক, ডিফল্ট MANUAL)</label>
              <input type="text" id="grant-trx-id" value="MANUAL" class="input-field font-mono text-xs uppercase" placeholder="MANUAL">
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">প্রেরক মোবাইল নম্বর (ঐচ্ছিক)</label>
              <input type="text" id="grant-payer-num" class="input-field font-mono text-xs" placeholder="01XXXXXXXXX">
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button" id="cancel-manual-grant-btn" class="btn-secondary px-4 py-2 rounded-xl text-xs">বাতিল</button>
            <button type="submit" id="submit-manual-grant-btn" class="btn-primary px-6 py-2 rounded-xl text-xs font-bold">অ্যাক্সেস কনফার্ম করুন</button>
          </div>
        </form>
      </div>

      <!-- Stats Cards (Grid 4 + Top Products) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="surface-card p-4 sm:p-5 rounded-2xl space-y-1">
          <span class="text-xs text-slate-400 font-medium">মোট বিক্রয় সংখ্যা</span>
          <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">${totalSalesCount}টি</div>
        </div>
        <div class="surface-card p-4 sm:p-5 rounded-2xl space-y-1">
          <span class="text-xs text-slate-400 font-medium">মোট রাজস্ব (Revenue)</span>
          <div class="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">${formatBDT(totalRevenue)}</div>
        </div>
        <div class="surface-card p-4 sm:p-5 rounded-2xl space-y-1">
          <span class="text-xs text-slate-400 font-medium">আজকের আয়</span>
          <div class="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">${formatBDT(todayRevenue)}</div>
        </div>
        <div class="surface-card p-4 sm:p-5 rounded-2xl space-y-1">
          <span class="text-xs text-slate-400 font-medium">গত ৭ দিনের আয়</span>
          <div class="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 font-mono tabular-nums">${formatBDT(last7DaysRevenue)}</div>
        </div>
      </div>

      <!-- Top 3 Products Card -->
      ${topProducts.length > 0 ? `
        <div class="surface-card p-4 sm:p-5 rounded-2xl space-y-2">
          <h4 class="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">শীর্ষ ৩ বিক্রিত প্রোডাক্ট</h4>
          <div class="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            ${topProducts.map((tp, idx) => `
              <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                <span class="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">${idx + 1}</span>
                <span class="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">${escapeHtml(tp.name)}</span>
                <span class="text-indigo-600 dark:text-indigo-400 font-mono font-bold">(${tp.count} বার)</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Search & Purchases Table -->
      <div class="surface-card rounded-2xl p-4 sm:p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 class="font-bold text-base text-slate-900 dark:text-white">বিক্রয় তালিকা (${purchases.length})</h4>
          <div class="relative w-full sm:w-72">
            <input type="text" id="sales-search-input" placeholder="ইমেইল, TrxID বা নাম খুঁজুন..." class="input-field text-xs pl-8">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        <div id="sales-table-wrapper" class="overflow-x-auto">
          <div class="py-8 text-center text-slate-400 text-xs">ডাটা লোড হচ্ছে...</div>
        </div>
      </div>
    </div>
  `;

  // Manual access form toggle
  const manualContainer = document.getElementById('admin-manual-grant-container');
  document.getElementById('admin-manual-grant-btn')?.addEventListener('click', () => {
    manualContainer?.classList.toggle('hidden');
  });
  document.getElementById('close-manual-grant-btn')?.addEventListener('click', () => {
    manualContainer?.classList.add('hidden');
  });
  document.getElementById('cancel-manual-grant-btn')?.addEventListener('click', () => {
    manualContainer?.classList.add('hidden');
  });

  // Manual access form submit
  document.getElementById('admin-manual-grant-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const buyerEmail = document.getElementById('grant-buyer-email')?.value;
    const productId = document.getElementById('grant-product-id')?.value;
    const trxId = document.getElementById('grant-trx-id')?.value || 'MANUAL';
    const payerNumber = document.getElementById('grant-payer-num')?.value || '';

    const selectedProduct = productMap.get(productId);
    const prodName = selectedProduct?.name || 'প্রোডাক্ট';

    showConfirmDialog({
      title: 'ম্যানুয়াল অ্যাক্সেস নিশ্চিতকরণ',
      message: `আপনি কি "${escapeHtml(buyerEmail)}" ইউজারকে "${escapeHtml(prodName)}" প্রোডাক্টটির অ্যাক্সেস দিতে নিশ্চিত?`,
      confirmText: 'হ্যাঁ, অ্যাক্সেস দিন',
      onConfirm: async () => {
        const btn = document.getElementById('submit-manual-grant-btn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'প্রসেসিং...';
        }
        try {
          await adminGrantManualAccess({
            buyerEmail,
            productId,
            trxId,
            payerNumber
          });
          showToast('ম্যানুয়াল অ্যাক্সেস সফলভাবে দেওয়া হয়েছে!', 'success');
          manualContainer?.classList.add('hidden');
          renderAdminSalesTab(container);
        } catch (err) {
          showToast(err.message || 'অ্যাক্সেস দেওয়া ব্যর্থ হয়েছে', 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'অ্যাক্সেস কনফার্ম করুন';
          }
        }
      }
    });
  });

  // Resolve buyer emails for all purchases and render table
  async function renderSalesTable(queryFilter = '') {
    const wrapper = document.getElementById('sales-table-wrapper');
    if (!wrapper) return;

    const term = queryFilter.trim().toLowerCase();

    // Map each purchase with product name and resolved email
    const salesWithDetails = await Promise.all(
      purchases.map(async (p) => {
        const email = await getBuyerEmail(p.uid);
        const prod = productMap.get(p.productId);
        const prodName = prod?.name || `প্রোডাক্ট #${p.productId}`;
        return {
          ...p,
          email,
          productName: prodName
        };
      })
    );

    const filtered = salesWithDetails.filter((p) => {
      if (!term) return true;
      return (
        (p.email || '').toLowerCase().includes(term) ||
        (p.trxId || '').toLowerCase().includes(term) ||
        (p.payerNumber || '').toLowerCase().includes(term) ||
        (p.productName || '').toLowerCase().includes(term)
      );
    });

    if (filtered.length === 0) {
      wrapper.innerHTML = `
        <div class="py-10 text-center text-slate-500 text-xs">
          ${term ? 'কোনো ফলাফল পাওয়া যায়নি।' : 'এখনো কোনো বিক্রয় রেকর্ড নেই।'}
        </div>
      `;
      return;
    }

    wrapper.innerHTML = `
      <table class="w-full text-left text-xs sm:text-sm">
        <thead class="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th class="p-3 sm:p-4">প্রোডাক্ট</th>
            <th class="p-3 sm:p-4">ক্রেতার ইমেইল</th>
            <th class="p-3 sm:p-4">প্রেরক নম্বর</th>
            <th class="p-3 sm:p-4">TrxID</th>
            <th class="p-3 sm:p-4">মূল্য</th>
            <th class="p-3 sm:p-4">তারিখ</th>
            <th class="p-3 sm:p-4 text-right">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          ${filtered.map((p) => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <td class="p-3 sm:p-4 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
                ${escapeHtml(p.productName)}
                ${p.grantedByAdmin ? '<span class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 font-bold">MANUAL</span>' : ''}
              </td>
              <td class="p-3 sm:p-4 font-mono text-xs">
                ${escapeHtml(p.email)}
              </td>
              <td class="p-3 sm:p-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                ${escapeHtml(p.payerNumber || 'N/A')}
              </td>
              <td class="p-3 sm:p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                ${escapeHtml(p.trxId || 'N/A')}
              </td>
              <td class="p-3 sm:p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ${formatBDT(p.price || 0)}
              </td>
              <td class="p-3 sm:p-4 text-xs text-slate-400 whitespace-nowrap">
                ${formatDate(p.createdAt)}
              </td>
              <td class="p-3 sm:p-4 text-right whitespace-nowrap">
                <button 
                  type="button" 
                  class="admin-revoke-purchase-btn px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-xs font-bold transition"
                  data-id="${escapeHtml(p.id)}"
                  data-name="${escapeHtml(p.productName)}"
                  data-email="${escapeHtml(p.email)}"
                >
                  অ্যাক্সেস বাতিল
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Wire 'অ্যাক্সেস বাতিল' button
    wrapper.querySelectorAll('.admin-revoke-purchase-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const prodName = btn.getAttribute('data-name');
        const buyer = btn.getAttribute('data-email');

        showConfirmDialog({
          title: 'অ্যাক্সেস বাতিল নিশ্চিতকরণ',
          message: `আপনি কি "${buyer}" ইউজারের "${prodName}" প্রোডাক্টের ডাউনলোড অ্যাক্সেস বাতিল করতে চান?`,
          confirmText: 'হ্যাঁ, বাতিল করুন',
          onConfirm: async () => {
            try {
              await adminRevokePurchase(id);
              showToast('অ্যাক্সেস সফলভাবে বাতিল করা হয়েছে', 'info');
              renderAdminSalesTab(container);
            } catch (err) {
              showToast(err.message || 'বাতিল করা যায়নি', 'error');
            }
          }
        });
      });
    });
  }

  // Initial table render
  await renderSalesTable();

  // Search input debounce
  const searchInput = document.getElementById('sales-search-input');
  let searchTimer = null;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderSalesTable(searchInput.value);
    }, 250);
  });
}

// Admin Tab 2: Hero Sliders
async function renderAdminSlidersTab(container) {
  const sliders = await adminLoadSliders();

  container.innerHTML = `
    <div class="space-y-6">
      
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">হিরো স্লাইডার ব্যানার (${sliders.length})</h3>
        <button type="button" id="admin-add-slider-btn" class="btn-primary text-xs sm:text-sm px-4 py-2 rounded-xl font-bold flex items-center gap-1.5">
          <span>+</span> নতুন স্লাইডার যোগ করুন
        </button>
      </div>

      <!-- Slider Form Container -->
      <div id="admin-slider-form-container" class="hidden surface-card p-6 rounded-2xl space-y-4 border-2 border-primary-500/30"></div>

      <!-- Sliders List -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${sliders.length === 0 ? `
          <div class="col-span-full py-8 text-center text-slate-500">কোনো স্লাইডার তৈরি করা হয়নি।</div>
        ` : sliders.map((s) => `
          <div class="surface-card rounded-2xl overflow-hidden p-4 space-y-3">
            <div class="aspect-[21/9] rounded-xl overflow-hidden bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
              <img src="${getSafeImageUrl(s.imageUrl)}" data-fallback="${getSliderFallbackSvg()}" referrerpolicy="no-referrer" class="w-full h-full object-cover">
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">ক্রমিক: <strong>${escapeHtml(s.order || 0)}</strong></span>
              <span class="text-slate-500 truncate max-w-[150px]">লিংক: ${escapeHtml(s.link || 'নাই')}</span>
            </div>
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" class="admin-edit-slider-btn text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg font-bold" data-id="${escapeHtml(s.id)}">
                এডিট
              </button>
              <button type="button" class="admin-delete-slider-btn text-xs text-rose-600 bg-rose-500/10 px-3 py-1.5 rounded-lg font-bold" data-id="${escapeHtml(s.id)}">
                মুছুন
              </button>
            </div>
          </div>
        `).join('')}
      </div>

    </div>
  `;

  const formContainer = document.getElementById('admin-slider-form-container');

  function showSliderForm(slider = null) {
    if (!formContainer) return;
    formContainer.classList.remove('hidden');
    formContainer.innerHTML = `
      <h4 class="font-bold text-slate-900 dark:text-white text-base mb-3">
        ${slider ? 'স্লাইডার এডিট' : 'নতুন স্লাইডার যুক্ত করুন'}
      </h4>
      <form id="save-slider-form" class="space-y-4">
        <input type="hidden" id="slider-id" value="${escapeHtml(slider?.id || '')}">
        <div>
          <label class="block text-xs font-semibold mb-1">ছবির লিংক (https://i.ibb.co/...) *</label>
          <input type="url" id="slider-img" required value="${escapeHtml(slider?.imageUrl || '')}" class="input-field font-mono text-xs" placeholder="https://i.ibb.co/banner.jpg">
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold mb-1">ক্লিক করলে যে লিংকে যাবে (ঐচ্ছিক)</label>
            <input type="text" id="slider-link" value="${escapeHtml(slider?.link || '')}" class="input-field text-xs" placeholder="/products অথবা /product/xxx">
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">ক্রমিক (Order) *</label>
            <input type="number" id="slider-order" required value="${escapeHtml(slider?.order ?? 0)}" class="input-field text-xs">
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 pt-2">
          <button type="button" id="cancel-slider-btn" class="btn-secondary px-4 py-2 rounded-xl text-xs">বাতিল</button>
          <button type="submit" class="btn-primary px-6 py-2 rounded-xl text-xs font-bold">সংরক্ষণ করুন</button>
        </div>
      </form>
    `;

    document.getElementById('cancel-slider-btn')?.addEventListener('click', () => formContainer.classList.add('hidden'));
    document.getElementById('save-slider-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('slider-id')?.value || null;
      const imageUrl = document.getElementById('slider-img')?.value;
      const link = document.getElementById('slider-link')?.value;
      const order = document.getElementById('slider-order')?.value;

      try {
        await adminSaveSlider({ id, imageUrl, link, order });
        showToast('স্লাইডার সংরক্ষিত হয়েছে!', 'success');
        formContainer.classList.add('hidden');
        renderAdminSlidersTab(container);
      } catch (err) {
        showToast(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে', 'error');
      }
    });
  }

  document.getElementById('admin-add-slider-btn')?.addEventListener('click', () => showSliderForm());

  document.querySelectorAll('.admin-edit-slider-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const s = sliders.find((item) => item.id === id);
      showSliderForm(s);
    });
  });

  document.querySelectorAll('.admin-delete-slider-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      showConfirmDialog({
        title: 'স্লাইডার মুছুন',
        message: 'আপনি কি নিশ্চিত যে এই স্লাইডারটি মুছে ফেলতে চান?',
        confirmText: 'হ্যাঁ, মুছুন',
        onConfirm: async () => {
          await adminDeleteSlider(id);
          showToast('স্লাইডার মুছে ফেলা হয়েছে', 'info');
          renderAdminSlidersTab(container);
        }
      });
    });
  });
}

// Admin Tab 3: Payment Settings
async function renderAdminPaymentsTab(container) {
  const cfg = await adminLoadPaymentConfig();

  container.innerHTML = `
    <div class="max-w-2xl space-y-6">
      
      <div>
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">পেমেন্ট গেটওয়ে কনফিগারেশন</h3>
        <p class="text-xs text-slate-500">বিকাশ, নগদ, রকেট নম্বর ও কাস্টমার নির্দেশনাবলী (config/payment)</p>
      </div>

      <form id="admin-payment-config-form" class="surface-card p-6 rounded-2xl space-y-5">
        
        <!-- bKash -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-pink-500/20 bg-pink-500/5">
          <div>
            <label class="block text-xs font-semibold mb-1 text-pink-600">bKash নম্বর</label>
            <input type="text" id="pay-bkash-num" value="${escapeHtml(cfg.bkashNumber || '')}" class="input-field font-mono text-sm" placeholder="017XXXXXXXX">
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1 text-pink-600">অ্যাকাউন্টের ধরন</label>
            <input type="text" id="pay-bkash-type" value="${escapeHtml(cfg.bkashType || 'Send Money (Personal)')}" class="input-field text-sm">
          </div>
        </div>

        <!-- Nagad -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
          <div>
            <label class="block text-xs font-semibold mb-1 text-orange-600">Nagad নম্বর</label>
            <input type="text" id="pay-nagad-num" value="${escapeHtml(cfg.nagadNumber || '')}" class="input-field font-mono text-sm" placeholder="018XXXXXXXX">
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1 text-orange-600">অ্যাকাউন্টের ধরন</label>
            <input type="text" id="pay-nagad-type" value="${escapeHtml(cfg.nagadType || 'Send Money (Personal)')}" class="input-field text-sm">
          </div>
        </div>

        <!-- Rocket -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
          <div>
            <label class="block text-xs font-semibold mb-1 text-purple-600">Rocket নম্বর</label>
            <input type="text" id="pay-rocket-num" value="${escapeHtml(cfg.rocketNumber || '')}" class="input-field font-mono text-sm" placeholder="019XXXXXXXXX">
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1 text-purple-600">অ্যাকাউন্টের ধরন</label>
            <input type="text" id="pay-rocket-type" value="${escapeHtml(cfg.rocketType || 'Send Money (Personal)')}" class="input-field text-sm">
          </div>
        </div>

        <!-- Upay -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <div>
            <label class="block text-xs font-semibold mb-1 text-blue-600">Upay নম্বর</label>
            <input type="text" id="pay-upay-num" value="${escapeHtml(cfg.upayNumber || '')}" class="input-field font-mono text-sm" placeholder="01XXXXXXXXX">
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1 text-blue-600">অ্যাকাউন্টের ধরন</label>
            <input type="text" id="pay-upay-type" value="${escapeHtml(cfg.upayType || 'Send Money (Personal)')}" class="input-field text-sm">
          </div>
        </div>

        <!-- Instructions -->
        <div>
          <label class="block text-xs font-semibold mb-1">চেকআউট পেজে প্রদর্শিত নির্দেশনাবলী</label>
          <textarea id="pay-instructions" rows="4" class="input-field text-sm leading-relaxed">${escapeHtml(cfg.instructions || 'উপরের যেকোনো নম্বরে মোট টাকা Send Money করুন। এরপর ফিরতি SMS থেকে Transaction ID (TrxID) এবং যে নম্বর থেকে টাকা পাঠিয়েছেন তা নিচে দিয়ে নিশ্চিত করুন।')}</textarea>
        </div>

        <button type="submit" id="save-pay-cfg-btn" class="btn-primary px-6 py-2.5 rounded-xl font-bold text-sm">
          পেমেন্ট সেটিংস সংরক্ষণ করুন
        </button>
      </form>

    </div>
  `;

  document.getElementById('admin-payment-config-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-pay-cfg-btn');
    btn.disabled = true;
    btn.textContent = 'সংরক্ষণ হচ্ছে...';

    const bkashNumber = document.getElementById('pay-bkash-num')?.value;
    const bkashType = document.getElementById('pay-bkash-type')?.value;
    const nagadNumber = document.getElementById('pay-nagad-num')?.value;
    const nagadType = document.getElementById('pay-nagad-type')?.value;
    const rocketNumber = document.getElementById('pay-rocket-num')?.value;
    const rocketType = document.getElementById('pay-rocket-type')?.value;
    const upayNumber = document.getElementById('pay-upay-num')?.value;
    const upayType = document.getElementById('pay-upay-type')?.value;
    const instructions = document.getElementById('pay-instructions')?.value;

    try {
      await adminSavePaymentConfig({
        bkashNumber,
        bkashType,
        nagadNumber,
        nagadType,
        rocketNumber,
        rocketType,
        upayNumber,
        upayType,
        instructions
      });
      showToast('পেমেন্ট কনফিগারেশন আপডেট হয়েছে!', 'success');
    } catch (err) {
      showToast('সেটিংস সংরক্ষণ ব্যর্থ হয়েছে', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'পেমেন্ট সেটিংস সংরক্ষণ করুন';
    }
  });
}

// Admin Tab: Site Settings (config/site)
async function renderAdminSiteSettingsTab(container) {
  const cfg = await adminLoadSiteConfig();

  container.innerHTML = `
    <div class="max-w-2xl space-y-6">
      <div>
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">সাইট সেটিংস ও সোশ্যাল লিংক</h3>
        <p class="text-xs text-slate-500">ফুটার, কন্টাক্ট পেজ ও ফ্লোটিং WhatsApp বাটনের তথ্য (config/site)</p>
      </div>

      <form id="admin-site-settings-form" class="surface-card p-6 rounded-2xl space-y-5">
        <div>
          <label class="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">সাইটের নাম</label>
          <input type="text" id="site-name-input" value="${escapeHtml(cfg.siteName || 'E Product Hub')}" class="input-field text-sm" placeholder="E Product Hub">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">WhatsApp নম্বর (কান্ট্রি কোডসহ ৮-১৫ ডিজিট)</label>
            <input type="text" id="site-wa-input" value="${escapeHtml(cfg.whatsapp || '')}" class="input-field font-mono text-sm" placeholder="88017XXXXXXXX">
            <span class="text-[11px] text-slate-400 block mt-1">লিংক হবে: https://wa.me/&lt;digits&gt;</span>
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Telegram ইউজারনেম (৪-৩২ অক্ষর)</label>
            <input type="text" id="site-tg-input" value="${escapeHtml(cfg.telegram || '')}" class="input-field font-mono text-sm" placeholder="username">
            <span class="text-[11px] text-slate-400 block mt-1">লিংক হবে: https://t.me/&lt;username&gt;</span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Facebook URL</label>
          <input type="url" id="site-fb-input" value="${escapeHtml(cfg.facebookUrl || '')}" class="input-field font-mono text-sm" placeholder="https://facebook.com/yourpage">
          <span class="text-[11px] text-slate-400 block mt-1">অবশ্যই https://facebook.com/ বা https://fb.com/ দিয়ে শুরু হতে হবে</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">অফিসিয়াল ইমেইল</label>
            <input type="email" id="site-email-input" value="${escapeHtml(cfg.email || '')}" class="input-field text-sm" placeholder="support@eproducthub.com">
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">হেল্পলাইন ফোন নম্বর</label>
            <input type="text" id="site-phone-input" value="${escapeHtml(cfg.phone || '')}" class="input-field font-mono text-sm" placeholder="+88017XXXXXXXX">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">ফুটার বায়ো / নোট</label>
          <textarea id="site-footer-note" rows="3" class="input-field text-xs resize-y" placeholder="সংক্ষিপ্ত বিবরণ...">${escapeHtml(cfg.footerNote || '')}</textarea>
        </div>

        <div class="pt-2 flex justify-end">
          <button type="submit" id="save-site-settings-btn" class="btn-primary px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm">
            সাইট সেটিংস সংরক্ষণ করুন
          </button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('admin-site-settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-site-settings-btn');
    btn.disabled = true;
    btn.textContent = 'সংরক্ষণ হচ্ছে...';

    const siteName = document.getElementById('site-name-input')?.value;
    const whatsapp = document.getElementById('site-wa-input')?.value;
    const telegram = document.getElementById('site-tg-input')?.value;
    const facebookUrl = document.getElementById('site-fb-input')?.value;
    const email = document.getElementById('site-email-input')?.value;
    const phone = document.getElementById('site-phone-input')?.value;
    const footerNote = document.getElementById('site-footer-note')?.value;

    try {
      await adminSaveSiteConfig({
        siteName,
        whatsapp,
        telegram,
        facebookUrl,
        email,
        phone,
        footerNote
      });
      showToast('সাইট সেটিংস সফলভাবে সংরক্ষিত হয়েছে!', 'success');
      // Update footer and floating WhatsApp button live
      await renderFooter();
    } catch (err) {
      showToast(err.message || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'সাইট সেটিংস সংরক্ষণ করুন';
    }
  });
}

// Admin Tab 4: ImgBB Configuration & Live Image Uploader
async function renderAdminImgBBTab(container) {
  const currentKey = await getImgBBApiKey();

  container.innerHTML = `
    <div class="max-w-3xl space-y-8">
      
      <div>
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">ImgBB ইমেজ হোস্টিং ও আপলোডার</h3>
        <p class="text-xs text-slate-500">
          সিকিউরিটি রুলস অনুযায়ী কোনো ইমেজ ফায়ারবেস স্টোরেজে যাবে না। সব ইমেজ ImgBB তে আপলোড হবে এবং i.ibb.co লিংক তৈরি হবে।
        </p>
      </div>

      <!-- ImgBB API Key Setup -->
      <form id="admin-imgbb-key-form" class="surface-card p-6 rounded-2xl space-y-4">
        <h4 class="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          ১. ImgBB API কী (config/imgbb)
        </h4>
        <p class="text-xs text-slate-500">
          এই কী-টি ফায়ারস্টোরের <code>config/imgbb</code> ডকে নিরাপদে সংরক্ষিত থাকে যা পাবলিক সোর্সে কখনো দৃশ্যমান হয় না।
        </p>

        <div>
          <label class="block text-xs font-semibold mb-1">ImgBB V1 API Key</label>
          <input type="text" id="imgbb-key-input" value="${escapeHtml(currentKey || '')}" required placeholder="যেমন: 3f8a4e8d893f0b2c1..." class="input-field font-mono text-sm">
          <span class="text-[11px] text-slate-400 mt-1 block">ImgBB অ্যাকাউন্ট থেকে Free API Key সংগ্রহ করুন (https://api.imgbb.com)</span>
        </div>

        <button type="submit" id="save-imgbb-key-btn" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">
          API কী সংরক্ষণ করুন
        </button>
      </form>

      <!-- Direct Image Upload Tool -->
      <div class="surface-card p-6 rounded-2xl space-y-4">
        <h4 class="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          ২. সরাসরি ইমেজ আপলোড টুল
        </h4>
        <p class="text-xs text-slate-500">
          আপনার ফোন বা কম্পিউটার থেকে ছবি নির্বাচন করুন, সরাসরি ImgBB তে আপলোড হবে এবং নিরাপদ <code>https://i.ibb.co/</code> লিংক পাবেন।
        </p>

        <div class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3">
          <input type="file" id="direct-image-file-input" accept="image/*" class="hidden">
          <button type="button" id="trigger-file-btn" class="btn-secondary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold">
            📁 ছবি নির্বাচন করুন
          </button>
          <span id="selected-file-name" class="block text-xs text-slate-500">কোনো ফাইল নির্বাচিত নেই</span>
        </div>

        <div id="upload-progress-box" class="hidden text-xs text-primary-600 font-bold animate-pulse">
          ছবি আপলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।
        </div>

        <!-- Result Box -->
        <div id="upload-result-box" class="hidden p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
          <span class="text-xs font-bold text-emerald-600 block">✓ ছবি সফলভাবে আপলোড হয়েছে!</span>
          
          <div class="flex items-center gap-3">
            <img id="uploaded-preview-img" class="w-16 h-16 rounded-lg object-cover bg-slate-900 shrink-0">
            <input type="text" id="uploaded-url-input" readonly class="input-field font-mono text-xs flex-1">
            <button type="button" id="copy-uploaded-url-btn" class="btn-primary text-xs px-3 py-2 rounded-lg font-bold shrink-0">
              কপি
            </button>
          </div>
        </div>

      </div>

    </div>
  `;

  // API Key Form
  document.getElementById('admin-imgbb-key-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-imgbb-key-btn');
    btn.disabled = true;
    btn.textContent = 'সংরক্ষণ হচ্ছে...';

    const key = document.getElementById('imgbb-key-input')?.value;
    try {
      await setImgBBApiKey(key);
      showToast('ImgBB API কী সফলভাবে সংরক্ষিত হয়েছে!', 'success');
    } catch (err) {
      showToast(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'API কী সংরক্ষণ করুন';
    }
  });

  // Direct upload handlers
  const fileInput = document.getElementById('direct-image-file-input');
  const triggerBtn = document.getElementById('trigger-file-btn');
  const fileNameLabel = document.getElementById('selected-file-name');
  const progressBox = document.getElementById('upload-progress-box');
  const resultBox = document.getElementById('upload-result-box');
  const previewImg = document.getElementById('uploaded-preview-img');
  const urlInput = document.getElementById('uploaded-url-input');
  const copyBtn = document.getElementById('copy-uploaded-url-btn');

  triggerBtn?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileNameLabel) fileNameLabel.textContent = file.name;
    if (progressBox) progressBox.classList.remove('hidden');
    if (resultBox) resultBox.classList.add('hidden');

    try {
      const url = await uploadImageToImgBB(file);
      if (previewImg) previewImg.src = url;
      if (urlInput) urlInput.value = url;
      if (resultBox) resultBox.classList.remove('hidden');
      showToast('ইমেজ লিঙ্ক তৈরি হয়েছে!', 'success');
    } catch (err) {
      showToast(err.message || 'আপলোড ব্যর্থ হয়েছে', 'error');
    } finally {
      if (progressBox) progressBox.classList.add('hidden');
    }
  });

  copyBtn?.addEventListener('click', () => {
    if (urlInput?.value) {
      navigator.clipboard.writeText(urlInput.value);
      showToast('ইমেজ লিঙ্ক কপি হয়েছে!', 'success');
    }
  });
}

// Admin Tab 5: TrxSync Transactions List (Read-only per specification)
async function renderAdminTransactionsTab(container) {
  const transactions = await adminLoadTransactions();

  container.innerHTML = `
    <div class="space-y-6">
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="font-bold text-lg text-slate-900 dark:text-white">TrxSync ট্রানজ্যাকশন লগ (${transactions.length})</h3>
          <p class="text-xs text-slate-500">
            অ্যান্ড্রয়েড TrxSync অ্যাপের মাধ্যমে ফায়ারস্টোর <code>transactions</code> কালেকশনে আসা SMS ডাটা (রিড-অনলি)
          </p>
        </div>

        <!-- Filter Chips: সব / অব্যবহৃত / আংশিক / ব্যবহৃত -->
        <div class="flex items-center gap-1.5 flex-wrap text-xs font-semibold">
          <button type="button" class="trx-filter-chip px-3 py-1.5 rounded-xl bg-indigo-600 text-white shadow-xs transition" data-filter="all">সব</button>
          <button type="button" class="trx-filter-chip px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition" data-filter="unspent">অব্যবহৃত</button>
          <button type="button" class="trx-filter-chip px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition" data-filter="partial">আংশিক</button>
          <button type="button" class="trx-filter-chip px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition" data-filter="spent">ব্যবহৃত</button>
        </div>
      </div>

      <div class="surface-card rounded-2xl overflow-hidden">
        <div id="trx-table-wrapper" class="overflow-x-auto">
          <!-- Rendered by renderFilteredTransactions() -->
        </div>
      </div>

    </div>
  `;

  let activeFilter = 'all';

  function renderFilteredTransactions() {
    const wrapper = document.getElementById('trx-table-wrapper');
    if (!wrapper) return;

    const now = Date.now();
    const DAY_IN_MS = 24 * 60 * 60 * 1000;

    const filtered = transactions.filter((t) => {
      const amount = Number(t.amount) || 0;
      const spent = Number(t.spent) || 0;

      if (activeFilter === 'unspent') return spent === 0;
      if (activeFilter === 'partial') return spent > 0 && spent < amount;
      if (activeFilter === 'spent') return spent >= amount;
      return true;
    });

    if (filtered.length === 0) {
      wrapper.innerHTML = `
        <div class="p-8 text-center text-slate-500 text-xs">
          কোনো ট্রানজ্যাকশন পাওয়া যায়নি।
        </div>
      `;
      return;
    }

    wrapper.innerHTML = `
      <table class="w-full text-left text-xs sm:text-sm">
        <thead class="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th class="p-3 sm:p-4">TrxID</th>
            <th class="p-3 sm:p-4">মাধ্যম</th>
            <th class="p-3 sm:p-4">টাকা</th>
            <th class="p-3 sm:p-4">ব্যয়িত (Spent)</th>
            <th class="p-3 sm:p-4">অবশিষ্ট ব্যালেন্স</th>
            <th class="p-3 sm:p-4">প্রেরক নম্বর</th>
            <th class="p-3 sm:p-4">দাবিকারী (Claimed By)</th>
            <th class="p-3 sm:p-4">সময় ও স্ট্যাটাস</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          ${filtered.map((t) => {
            const amount = Number(t.amount) || 0;
            const spent = Number(t.spent) || 0;
            const remaining = Math.max(0, amount - spent);

            const receivedTime = t.receivedAt?.toMillis ? t.receivedAt.toMillis() : (t.receivedAt ? new Date(t.receivedAt).getTime() : 0);
            const isUnspentOld = spent === 0 && (now - receivedTime > DAY_IN_MS);

            return `
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${isUnspentOld ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}">
                <td class="p-3 sm:p-4 font-mono font-bold text-slate-900 dark:text-white">
                  ${escapeHtml(t.trxId || t.id)}
                  ${isUnspentOld ? `
                    <span class="block text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                      ⚠️ ২৪+ ঘণ্টা ধরে অব্যবহৃত
                    </span>
                  ` : ''}
                </td>
                <td class="p-3 sm:p-4 uppercase font-bold text-xs">${escapeHtml(t.provider || 'bKash')}</td>
                <td class="p-3 sm:p-4 font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">${formatBDT(amount)}</td>
                <td class="p-3 sm:p-4 font-semibold text-rose-600 font-mono tabular-nums">${formatBDT(spent)}</td>
                <td class="p-3 sm:p-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  ${formatBDT(remaining)}
                </td>
                <td class="p-3 sm:p-4 font-mono">${escapeHtml(t.sender || 'N/A')}</td>
                <td class="p-3 sm:p-4 font-mono text-xs max-w-xs truncate">${t.claimedBy ? escapeHtml(t.claimedBy) : '<span class="text-emerald-600 font-medium">দাবি হয়নি</span>'}</td>
                <td class="p-3 sm:p-4 text-xs text-slate-400 whitespace-nowrap">
                  ${formatDate(t.receivedAt)}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // Filter chips click handling
  const chips = container.querySelectorAll('.trx-filter-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => {
        c.className = 'trx-filter-chip px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition';
      });
      chip.className = 'trx-filter-chip px-3 py-1.5 rounded-xl bg-indigo-600 text-white shadow-xs transition';
      activeFilter = chip.getAttribute('data-filter') || 'all';
      renderFilteredTransactions();
    });
  });

  // Initial render
  renderFilteredTransactions();
}

// Admin Tab 6: Contact Messages
async function renderAdminMessagesTab(container) {
  const messages = await adminLoadMessages();

  container.innerHTML = `
    <div class="space-y-6">
      
      <div>
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">কাস্টমার মেসেজসমূহ (${messages.length})</h3>
        <p class="text-xs text-slate-500">কন্টাক্ট ফর্ম ও পেমেন্ট সমস্যা রিপোর্ট থেকে আসা বার্তা (পেমেন্ট সমস্যা শীর্ষে প্রদর্শিত)</p>
      </div>

      <div class="space-y-4">
        ${messages.length === 0 ? `
          <div class="surface-card p-8 rounded-2xl text-center text-slate-500">বর্তমানে কোনো নতুন মেসেজ নেই।</div>
        ` : messages.map((m) => {
          const isPaymentIssue = (m.message || '').startsWith('[PAYMENT ISSUE]');
          return `
            <div class="surface-card p-5 rounded-2xl space-y-3 ${isPaymentIssue ? 'border-2 border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/20' : ''}">
              <div class="flex items-center justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <strong class="text-slate-900 dark:text-white text-base">${escapeHtml(m.name)}</strong>
                    ${isPaymentIssue ? `
                      <span class="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
                        <span>🚨</span> পেমেন্ট সংক্রান্ত সমস্যা
                      </span>
                    ` : ''}
                  </div>
                  <a href="mailto:${encodeURIComponent(m.email || '')}" class="text-xs text-indigo-600 dark:text-indigo-400 font-mono hover:underline block">${escapeHtml(m.email)}</a>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-slate-400 whitespace-nowrap">${formatDate(m.createdAt)}</span>
                  <button type="button" class="admin-del-msg-btn text-xs text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition" data-id="${escapeHtml(m.id)}" title="মুছুন">
                    ✕
                  </button>
                </div>
              </div>
              <div class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl whitespace-pre-wrap break-words font-sans">${escapeHtml(m.message)}</div>
            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;

  document.querySelectorAll('.admin-del-msg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      showConfirmDialog({
        title: 'মেসেজ ডিলিট',
        message: 'আপনি কি নিশ্চিত যে এই মেসেজটি মুছে ফেলতে চান?',
        confirmText: 'হ্যাঁ, মুছুন',
        onConfirm: async () => {
          await adminDeleteMessage(id);
          showToast('মেসেজ মুছে ফেলা হয়েছে', 'info');
          renderAdminMessagesTab(container);
        }
      });
    });
  });
}

// 404 Not Found Page
function render404Page() {
  const main = document.getElementById('app-main');
  if (!main) return;
  main.innerHTML = `
    <div class="max-w-md mx-auto py-20 text-center space-y-4">
      <div class="text-5xl font-black text-primary-600">404</div>
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white">পেজটি পাওয়া যায়নি</h2>
      <p class="text-sm text-slate-500">আপনি যে লিংকটিতে প্রবেশ করতে চেয়েছেন তা বিদ্যমান নয়।</p>
      <div class="pt-2">
        <a href="/" class="btn-primary px-6 py-2.5 rounded-xl font-bold text-sm inline-block">হোম পেজে যান</a>
      </div>
    </div>
  `;
}

// ==========================================
// Delegated Error Listener for Images (No inline onerror handlers)
// ==========================================
document.addEventListener(
  'error',
  (e) => {
    const target = e.target;
    if (target && target.tagName === 'IMG') {
      const fallback = target.getAttribute('data-fallback');
      if (fallback && !target.dataset.hasFallenBack) {
        target.dataset.hasFallenBack = 'true';
        target.src = fallback;
      }
    }
  },
  true
);

// ==========================================
// Application Bootstrap & Router Registration
// ==========================================
export async function initApp() {
  initTheme();
  renderHeader();
  renderFooter();

  // Route Registrations (Clean URL routing with History API)
  registerRoute('/', renderHomePage);
  registerRoute('/products', renderProductsPage);
  registerRoute('/product/:id', renderProductDetailsPage);
  registerRoute('/cart', renderCartPage);
  registerRoute('/checkout', renderCheckoutPage, { authRequired: true });
  registerRoute('/my-purchases', renderMyPurchasesPage, { authRequired: true });
  registerRoute('/profile', renderProfilePage, { authRequired: true });
  registerRoute('/login', renderLoginPage);
  registerRoute('/register', renderRegisterPage);
  registerRoute('/contact', renderContactPage);
  registerRoute('/about', renderAboutPage);
  registerRoute('/terms', renderTermsPage);
  registerRoute('/privacy', renderPrivacyPage);
  registerRoute('/refund-policy', renderRefundPolicyPage);
  registerRoute('/admin', renderAdminPage, { adminRequired: true });

  setNotFoundHandler(render404Page);

  // Show a small Bengali loading placeholder in #app-main
  const main = document.getElementById('app-main');
  if (main) {
    main.innerHTML = `
      <div class="flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
      </div>
    `;
  }

  // Await auth verification, load cart, then start router
  await waitForAuthReady();
  await loadCart();
  initRouter();

  // Subscribe cart changes to update badges
  subscribeCart(() => {});
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
