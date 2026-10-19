/**
 * E Product Hub - Utilities & Helpers
 * XSS-Safe DOM Manipulation, Validation, Notifications, and Formatting
 */

/**
 * Escapes characters for safe interpolation into HTML to prevent XSS
 * @param {*} v 
 * @returns {string}
 */
export function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"'`]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  }[c]));
}

/**
 * Normalizes Bangladeshi mobile numbers to standard 11 digits: 01XXXXXXXXX
 * Exact algorithm matching the Android TrxSync app:
 * 1. Digits only
 * 2. If starts with "00880", drop the first 2 digits
 * 3. If starts with "880" and length is 13, drop the first 2 digits
 * 4. If length is 10 and starts with "1", prepend "0"
 * 5. Accept only /^01[3-9][0-9]{8}$/ else return null
 * @param {string} input 
 * @returns {string|null} Normalized 11-digit phone or null if invalid
 */
export function normalizePhone(input) {
  if (!input || typeof input !== 'string') return null;
  
  // Digits only
  let digits = input.replace(/\D/g, '');
  
  if (digits.startsWith('00880')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('880') && digits.length === 13) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  }

  const bdPhoneRegex = /^01[3-9][0-9]{8}$/;
  if (bdPhoneRegex.test(digits)) {
    return digits;
  }
  
  return null;
}

/**
 * Validates whether an image URL is safe to render
 * Accepts direct HTTPS URLs from i.ibb.co and i.ibb.co.com only
 * @param {string} url 
 * @returns {boolean}
 */
export function isSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === 'https:' && (host === 'i.ibb.co' || host === 'i.ibb.co.com');
  } catch (e) {
    return false;
  }
}

/**
 * Attaches a resilient error handler to an image element to replace broken or
 * failed ImgBB images with a category-tailored SVG fallback.
 * @param {HTMLImageElement} img 
 * @param {string} fallbackSrc 
 */
export function attachImageFallback(img, fallbackSrc) {
  if (!img) return;
  img.addEventListener('error', function onImgError() {
    img.removeEventListener('error', onImgError);
    img.src = fallbackSrc;
  }, { once: true });
}

/**
 * Generates an SVG Data URI illustration for digital product cards
 * Used as high-fidelity fallback when external ImgBB URLs are broken or unavailable.
 * @param {string} title 
 * @param {string} type 'code' | 'ebook' | 'ui' | 'script' | 'graphic'
 * @returns {string} SVG Data URI
 */
export function getProductFallbackSvg(title = 'Digital Product', type = 'code') {
  const styles = {
    code: {
      bg1: '#0f172a', bg2: '#1e1b4b', accent: '#6366f1',
      icon: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6" fill="none" stroke="#818cf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
      tag: 'SOURCE CODE'
    },
    ebook: {
      bg1: '#0f172a', bg2: '#1e293b', accent: '#0ea5e9',
      icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
      tag: 'E-BOOK / PDF'
    },
    ui: {
      bg1: '#111827', bg2: '#311042', accent: '#ec4899',
      icon: '<rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="#f472b6" stroke-width="2.5"/><path d="M3 9h18M9 21V9" stroke="#f472b6" stroke-width="2.5"/>',
      tag: 'UI DESIGN KIT'
    },
    script: {
      bg1: '#0f172a', bg2: '#064e3b', accent: '#10b981',
      icon: '<polyline points="4 17 10 11 4 5" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="19" x2="20" y2="19" stroke="#34d399" stroke-width="2.5" stroke-linecap="round"/>',
      tag: 'AUTOMATION SCRIPT'
    },
    graphic: {
      bg1: '#0f172a', bg2: '#431407', accent: '#f97316',
      icon: '<circle cx="12" cy="12" r="9" fill="none" stroke="#fb923c" stroke-width="2.5"/><polygon points="12 7 7 12 12 17 17 12 12 7" fill="none" stroke="#fb923c" stroke-width="2.5"/>',
      tag: 'GRAPHICS / PSD'
    }
  };

  const selected = styles[type] || styles.code;
  const safeTitle = (title || 'Digital Product').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
    <defs>
      <linearGradient id="g_${type}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${selected.bg1}"/>
        <stop offset="100%" stop-color="${selected.bg2}"/>
      </linearGradient>
      <pattern id="grid_${type}" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="600" height="400" fill="url(#g_${type})"/>
    <rect width="600" height="400" fill="url(#grid_${type})"/>
    <circle cx="500" cy="80" r="140" fill="${selected.accent}" opacity="0.16" filter="blur(40px)"/>
    <circle cx="100" cy="320" r="120" fill="${selected.accent}" opacity="0.1" filter="blur(30px)"/>
    <g transform="translate(260, 110)">
      <rect x="0" y="0" width="80" height="80" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/>
      <g transform="translate(24, 24) scale(1.33)">
        ${selected.icon}
      </g>
    </g>
    <rect x="220" y="212" width="160" height="26" rx="13" fill="rgba(255,255,255,0.08)" stroke="${selected.accent}" stroke-width="1"/>
    <text x="300" y="229" fill="${selected.accent}" font-family="'Hind Siliguri', system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="1.2" text-anchor="middle">${selected.tag}</text>
    <text x="300" y="272" fill="#ffffff" font-family="'Hind Siliguri', system-ui, sans-serif" font-size="18" font-weight="700" text-anchor="middle">${safeTitle.slice(0, 36)}</text>
    <text x="300" y="300" fill="rgba(255,255,255,0.65)" font-family="'Hind Siliguri', system-ui, sans-serif" font-size="13" text-anchor="middle">লাইফটাইম অ্যাক্সেস · তাৎক্ষণিক ডাউনলোড</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an SVG Data URI illustration for Hero Sliders
 * @param {string} title 
 * @param {string} subtitle 
 * @param {string} badge 
 * @returns {string} SVG Data URI
 */
export function getSliderFallbackSvg(title = 'ডিজিটাল প্রোডাক্ট স্টোর', subtitle = 'ইনস্ট্যান্ট অটোমেটেড ডেলিভারি', badge = 'E PRODUCT HUB') {
  const safeTitle = (title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeSubtitle = (subtitle || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeBadge = (badge || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 480" width="100%" height="100%">
    <defs>
      <linearGradient id="sliderBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0b0f19"/>
        <stop offset="45%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>
      <linearGradient id="sliderBtn" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#4f46e5"/>
        <stop offset="100%" stop-color="#7c3aed"/>
      </linearGradient>
      <pattern id="sliderGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="1200" height="480" fill="url(#sliderBg)"/>
    <rect width="1200" height="480" fill="url(#sliderGrid)"/>
    <circle cx="1020" cy="140" r="280" fill="#6366f1" opacity="0.22" filter="blur(60px)"/>
    <circle cx="140" cy="380" r="220" fill="#a855f7" opacity="0.14" filter="blur(50px)"/>
    
    <!-- Geometric Feature Artwork on right -->
    <g transform="translate(800, 90)">
      <rect width="300" height="300" rx="36" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
      <rect x="24" y="24" width="252" height="252" rx="28" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.25)" stroke-width="1.5"/>
      <circle cx="150" cy="130" r="50" fill="rgba(16,185,129,0.15)"/>
      <path d="M125 130l18 18 36-36" fill="none" stroke="#10b981" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="150" y="215" fill="#f8fafc" font-family="'Hind Siliguri', system-ui, sans-serif" font-size="15" font-weight="700" text-anchor="middle">১০০% ভেরিফাইড কোড ও ফাইল</text>
      <text x="150" y="238" fill="rgba(255,255,255,0.5)" font-family="'Hind Siliguri', system-ui, sans-serif" font-size="12" text-anchor="middle">অটো পেমেন্ট ভেরিফিকেশন</text>
    </g>

    <!-- Left Content Group -->
    <g transform="translate(80, 130)">
      <rect width="180" height="32" rx="16" fill="rgba(99,102,241,0.2)" stroke="rgba(99,102,241,0.4)" stroke-width="1"/>
      <text x="90" y="21" fill="#c7d2fe" font-family="'Hind Siliguri', system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5" text-anchor="middle">${safeBadge}</text>
      <text x="0" y="85" fill="#ffffff" font-family="'Hind Siliguri', system-ui, sans-serif" font-size="42" font-weight="800">${safeTitle}</text>
      <text x="0" y="130" fill="rgba(255,255,255,0.75)" font-family="'Hind Siliguri', system-ui, sans-serif" font-size="18">${safeSubtitle}</text>
      <g transform="translate(0, 168)">
        <rect width="190" height="50" rx="14" fill="url(#sliderBtn)"/>
        <text x="95" y="32" fill="#ffffff" font-family="'Hind Siliguri', system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">প্রোডাক্টগুলো দেখুন →</text>
      </g>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns safe image URL or category-aware SVG fallback
 * @param {string} url 
 * @param {string} [title]
 * @param {string} [type]
 * @returns {string}
 */
export function getSafeImageUrl(url, title = 'Digital Product', type = 'code') {
  if (isSafeImageUrl(url)) {
    return url;
  }
  if (typeof url === 'string' && url.trim().startsWith('data:image/')) {
    return url;
  }
  return getProductFallbackSvg(title, type);
}

/**
 * Extracts and strictly validates YouTube Video ID
 * Regex: matches standard watch, embed, shorts, and youtu.be links
 * @param {string} url 
 * @returns {string|null} 11-character video ID or null
 */
export function parseYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Formats integer BDT amount with currency symbol
 * @param {number} amount 
 * @returns {string}
 */
export function formatBDT(amount) {
  const num = Math.round(Number(amount) || 0);
  return `৳ ${num.toLocaleString('en-IN')}`;
}

/**
 * Formats date into readable Bengali/local string
 * @param {any} timestamp Firestore Timestamp or Date or string
 * @returns {string}
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  let date;
  if (timestamp && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number' || typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return '';
  }
  
  return date.toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Strict XSS-Safe Description Formatter (NO innerHTML)
 * Parses paragraphs, headings (#, ##, ###), bullet lists (- or *), and bold (**text**)
 * Returns a DocumentFragment with sanitized elements.
 * @param {string} text 
 * @returns {DocumentFragment}
 */
export function renderSafeDescription(text) {
  const fragment = document.createDocumentFragment();
  if (!text || typeof text !== 'string') return fragment;

  const lines = text.split(/\r?\n/);
  let currentList = null;

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Check for empty line -> finishes current list
    if (!trimmed) {
      currentList = null;
      return;
    }

    // Check for headings
    if (trimmed.startsWith('### ')) {
      currentList = null;
      const h4 = document.createElement('h4');
      h4.className = 'desc-h4 font-bold text-lg mt-4 mb-2 text-primary-light dark:text-primary-dark';
      appendInlineFormattedText(h4, trimmed.slice(4));
      fragment.appendChild(h4);
    } else if (trimmed.startsWith('## ')) {
      currentList = null;
      const h3 = document.createElement('h3');
      h3.className = 'desc-h3 font-bold text-xl mt-5 mb-2 text-primary-light dark:text-primary-dark';
      appendInlineFormattedText(h3, trimmed.slice(3));
      fragment.appendChild(h3);
    } else if (trimmed.startsWith('# ')) {
      currentList = null;
      const h2 = document.createElement('h2');
      h2.className = 'desc-h2 font-bold text-2xl mt-6 mb-3 text-primary-light dark:text-primary-dark';
      appendInlineFormattedText(h2, trimmed.slice(2));
      fragment.appendChild(h2);
    }
    // Check for bullet lists (* or -)
    else if (/^[-*]\s+/.test(trimmed)) {
      if (!currentList) {
        currentList = document.createElement('ul');
        currentList.className = 'desc-list list-disc list-inside space-y-1.5 my-3 text-slate-700 dark:text-slate-300';
        fragment.appendChild(currentList);
      }
      const li = document.createElement('li');
      li.className = 'desc-list-item leading-relaxed';
      appendInlineFormattedText(li, trimmed.replace(/^[-*]\s+/, ''));
      currentList.appendChild(li);
    }
    // Normal paragraph
    else {
      currentList = null;
      const p = document.createElement('p');
      p.className = 'desc-p leading-relaxed my-2 text-slate-700 dark:text-slate-300';
      appendInlineFormattedText(p, trimmed);
      fragment.appendChild(p);
    }
  });

  return fragment;
}

/**
 * Safely parses inline **bold** text without innerHTML
 */
function appendInlineFormattedText(parentEl, rawText) {
  const parts = rawText.split(/(\*\*[^*]+\*\*)/g);
  parts.forEach((part) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const strong = document.createElement('strong');
      strong.className = 'font-semibold text-slate-900 dark:text-white';
      strong.textContent = part.slice(2, -2);
      parentEl.appendChild(strong);
    } else if (part) {
      parentEl.appendChild(document.createTextNode(part));
    }
  });
}

/**
 * Toast Notification System
 */
export function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const typeStyles = {
    success: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/20',
    error: 'bg-rose-600 text-white border-rose-500 shadow-rose-950/20',
    warning: 'bg-amber-600 text-white border-amber-500 shadow-amber-950/20',
    info: 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-950/20'
  };

  toast.className = `pointer-events-auto p-4 rounded-xl shadow-lg border text-sm flex items-start gap-3 transition-all duration-300 transform translate-y-3 opacity-0 ${typeStyles[type] || typeStyles.info}`;

  const iconSpan = document.createElement('span');
  iconSpan.className = 'text-lg font-bold flex-shrink-0';
  iconSpan.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';

  const textSpan = document.createElement('span');
  textSpan.className = 'flex-1 font-medium leading-snug';
  textSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'opacity-75 hover:opacity-100 flex-shrink-0 ml-1 font-bold';
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => removeToast(toast);

  toast.appendChild(iconSpan);
  toast.appendChild(textSpan);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  const timer = setTimeout(() => {
    removeToast(toast);
  }, duration);

  function removeToast(el) {
    clearTimeout(timer);
    el.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  }
}

/**
 * Normalizes and validates secret product download URL.
 * Converts Google Drive view/open/uc links to direct download link:
 * https://drive.google.com/uc?export=download&id=<ID>
 * 
 * @param {string} url 
 * @returns {string} The normalized direct download HTTPS URL
 */
export function normalizeDownloadUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('ডাউনলোড লিংক দিতে হবে');
  }
  const trimmed = url.trim();
  if (trimmed.length > 500) {
    throw new Error('ডাউনলোড লিংক সর্বোচ্চ ৫০০ অক্ষরের হতে পারে');
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (e) {
    throw new Error('সঠিক ডাউনলোড URL প্রদান করুন');
  }

  // Reject javascript:, data:, http:, ftp:. Only https: allowed
  if (parsed.protocol !== 'https:') {
    throw new Error('ডাউনলোড লিংক অবশ্যই HTTPS প্রোটোকল হতে হবে (http, javascript, data বা ftp অনুমোদিত নয়)');
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    let fileId = null;

    if (host === 'drive.google.com') {
      const fileDMatch = parsed.pathname.match(/\/d\/([A-Za-z0-9_-]{10,})/);
      if (fileDMatch) {
        fileId = fileDMatch[1];
      } else if (parsed.searchParams.has('id')) {
        const idParam = parsed.searchParams.get('id');
        if (idParam && /^[A-Za-z0-9_-]{10,}$/.test(idParam)) {
          fileId = idParam;
        }
      }
    } else if (host === 'docs.google.com') {
      if (parsed.pathname.startsWith('/file/d/')) {
        const fileDMatch = parsed.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,})/);
        if (fileDMatch) {
          fileId = fileDMatch[1];
        }
      }
    }

    if (!fileId || !/^[A-Za-z0-9_-]{10,}$/.test(fileId)) {
      throw new Error('Google Drive লিংকে কোনো সঠিক ফাইল আইডি (ID) পাওয়া যায়নি');
    }

    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return trimmed;
}

/**
 * Checks if the original URL was converted from a Google Drive or Docs URL to a direct uc download link
 * @param {string} original 
 * @param {string} normalized 
 * @returns {boolean}
 */
export function isDriveUrlConverted(original, normalized) {
  if (!original || !normalized || typeof original !== 'string' || typeof normalized !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(original.trim());
    const host = parsed.hostname.toLowerCase();
    return (host === 'drive.google.com' || host === 'docs.google.com') && original.trim() !== normalized.trim();
  } catch (e) {
    return false;
  }
}


/**
 * Mobile-friendly Confirmation Modal Dialog
 * Rendered strictly as textContent, supporting array of text lines.
 */
export function showConfirmDialog({ title, message, confirmText = 'হ্যাঁ, মুছুন', cancelText = 'বাতিল', onConfirm }) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity';

  const box = document.createElement('div');
  box.className = 'bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4';

  const h3 = document.createElement('h3');
  h3.className = 'text-lg font-bold text-slate-900 dark:text-white';
  h3.textContent = title;

  const contentBox = document.createElement('div');
  contentBox.className = 'space-y-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed';

  const lines = Array.isArray(message)
    ? message
    : (typeof message === 'string' ? message.split('\n') : [String(message ?? '')]);

  lines.forEach((line) => {
    const p = document.createElement('p');
    p.textContent = line;
    contentBox.appendChild(p);
  });

  const btnContainer = document.createElement('div');
  btnContainer.className = 'flex items-center justify-end gap-3 pt-3';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition';
  cancelBtn.textContent = cancelText;

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm';
  confirmBtn.textContent = confirmText;

  cancelBtn.onclick = () => {
    if (overlay.parentNode) document.body.removeChild(overlay);
  };

  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'প্রসেসিং...';
    try {
      await onConfirm();
    } finally {
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
    }
  };

  btnContainer.appendChild(cancelBtn);
  btnContainer.appendChild(confirmBtn);

  box.appendChild(h3);
  box.appendChild(contentBox);
  box.appendChild(btnContainer);
  overlay.appendChild(box);

  document.body.appendChild(overlay);
}

/**
 * Client-Side Cooldown Manager for failed checkout attempts
 * 5 failures within 2 minutes locks checkout submit for 60 seconds.
 */
const COOLDOWN_KEY = 'eph_trx_cooldown';
export function recordTrxAttemptFailure() {
  try {
    const now = Date.now();
    const data = JSON.parse(localStorage.getItem(COOLDOWN_KEY) || '{"count": 0, "firstAttempt": 0, "lockedUntil": 0}');
    
    // Check if previous window expired (2 minutes)
    if (now - data.firstAttempt > 120000) {
      data.count = 1;
      data.firstAttempt = now;
      data.lockedUntil = 0;
    } else {
      data.count += 1;
      if (data.count >= 5) {
        data.lockedUntil = now + 60000; // 60s cooldown
      }
    }
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(data));
  } catch (e) {}
}

export function getCooldownRemainingSeconds() {
  try {
    const data = JSON.parse(localStorage.getItem(COOLDOWN_KEY) || '{}');
    if (data.lockedUntil && data.lockedUntil > Date.now()) {
      return Math.ceil((data.lockedUntil - Date.now()) / 1000);
    }
  } catch (e) {}
  return 0;
}

export function clearTrxAttemptCooldown() {
  try {
    localStorage.removeItem(COOLDOWN_KEY);
  } catch (e) {}
}

/**
 * Strictly sanitizes redirect URL parameter to prevent open redirects.
 * Accepts only paths that start with a single "/" and not "//",
 * and contain no backslash ("\") or "://"; otherwise returns "/".
 * @param {string|null} redirect 
 * @returns {string} Safe redirect relative path
 */
export function sanitizeRedirect(redirect) {
  if (!redirect || typeof redirect !== 'string') return '/';
  const trimmed = redirect.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('\\') &&
    !trimmed.includes('://')
  ) {
    return trimmed;
  }
  return '/';
}

const DEFAULT_PAGE_TITLE = 'E Product Hub - প্রিমিয়াম ডিজিটাল প্রোডাক্ট স্টোর';
const DEFAULT_PAGE_DESC = 'বিকাশ, নগদ বা রকেটে স্বয়ংক্রিয় TrxID ভেরিফিকেশনের মাধ্যমে ই-বুক, UI কিট, স্ক্রিপ্ট ও ডিজিটাল রিসোর্স কিনুন তাৎক্ষণিকভাবে।';

function setOrUpdateMeta(selector, attribute, attrValue, content) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(selector) {
  const el = document.querySelector(selector);
  if (el) el.remove();
}

/**
 * Updates document.title, meta description, robots, OpenGraph, Twitter tags and canonical link
 * @param {object} [options]
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {string} [options.image]
 * @param {boolean} [options.noindex]
 */
export function setPageMeta({ title, description, image, noindex = false } = {}) {
  const metaTitle = title ? String(title).trim() : DEFAULT_PAGE_TITLE;
  const metaDesc = description ? String(description).trim().slice(0, 200) : DEFAULT_PAGE_DESC;

  document.title = metaTitle;

  setOrUpdateMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  setOrUpdateMeta('meta[name="description"]', 'name', 'description', metaDesc);
  setOrUpdateMeta('meta[property="og:title"]', 'property', 'og:title', metaTitle);
  setOrUpdateMeta('meta[property="og:description"]', 'property', 'og:description', metaDesc);
  setOrUpdateMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setOrUpdateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', metaTitle);
  setOrUpdateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', metaDesc);

  if (image && isSafeImageUrl(image)) {
    setOrUpdateMeta('meta[property="og:image"]', 'property', 'og:image', image.trim());
    setOrUpdateMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image.trim());
  } else {
    removeMeta('meta[property="og:image"]');
    removeMeta('meta[name="twitter:image"]');
  }

  try {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + window.location.pathname);
  } catch (e) {}
}

