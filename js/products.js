/**
 * E Product Hub - Products & Slider Module
 * Products catalog, search, pagination, details view with safe description,
 * image gallery (only i.ibb.co), and secure YouTube embed.
 */
import { db } from './firebase-config.js';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc, 
  doc, 
  startAfter 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { 
  formatBDT, 
  getSafeImageUrl, 
  renderSafeDescription, 
  parseYouTubeVideoId,
  showToast,
  escapeHtml,
  getProductFallbackSvg,
  getSliderFallbackSvg 
} from './utils.js';
import { addToCart } from './cart.js';
import { navigateTo } from './router.js';
import { getAuthState } from './auth.js';

let lastProductDoc = null;
let hasMoreProducts = true;

// Helper to guess category and SVG type from product title or explicit category
export function guessCategory(title = '', category = null) {
  if (category) {
    if (category === 'ebook') return { tag: 'ই-বুক / PDF', type: 'ebook' };
    if (category === 'ui') return { tag: 'UI / টেমপ্লেট', type: 'ui' };
    if (category === 'script') return { tag: 'স্ক্রিপ্ট / কোড', type: 'script' };
    if (category === 'graphic') return { tag: 'গ্রাফিক্স', type: 'graphic' };
    if (category === 'other') return { tag: 'ডিজিটাল প্রোডাক্ট', type: 'code' };
  }
  const t = (title || '').toLowerCase();
  if (t.includes('ই-বুক') || t.includes('বই') || t.includes('pdf') || t.includes('guide')) return { tag: 'ই-বুক / PDF', type: 'ebook' };
  if (t.includes('ui') || t.includes('figma') || t.includes('টেমপ্লেট') || t.includes('dashboard')) return { tag: 'UI Kit', type: 'ui' };
  if (t.includes('স্ক্রিপ্ট') || t.includes('পাইথন') || t.includes('python') || t.includes('bot') || t.includes('automation')) return { tag: 'Script', type: 'script' };
  if (t.includes('গ্রাফিক্স') || t.includes('psd') || t.includes('থাম্বনেইল')) return { tag: 'Graphics', type: 'graphic' };
  return { tag: 'ডিজিটাল প্রোডাক্ট', type: 'code' };
}

/**
 * Loads hero sliders from Firestore sliders collection.
 * Returns empty array if none found or on error.
 */
export async function loadSliders() {
  try {
    const q = query(collection(db, 'sliders'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const sliders = [];
    snapshot.forEach((d) => {
      sliders.push({ id: d.id, ...d.data() });
    });
    return sliders;
  } catch (error) {
    try {
      const snap = await getDocs(collection(db, 'sliders'));
      const sliders = [];
      snap.forEach((d) => sliders.push({ id: d.id, ...d.data() }));
      sliders.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      return sliders;
    } catch (e) {
      console.warn("Sliders could not be loaded:", e?.message);
      return [];
    }
  }
}

/**
 * Renders Hero Slider Component into a target container
 */
export function renderHeroSlider(container, sliders) {
  container.innerHTML = '';
  if (!sliders || sliders.length === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  const wrapper = document.createElement('div');
  wrapper.className = 'relative w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-lg bg-slate-950 aspect-[21/9] min-h-[220px] sm:min-h-[300px] md:min-h-[380px] lg:min-h-[420px] border border-slate-200/80 dark:border-slate-800/80 group select-none';

  const slidesTrack = document.createElement('div');
  slidesTrack.className = 'flex transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) h-full';

  sliders.forEach((slide) => {
    const slideItem = document.createElement('div');
    slideItem.className = 'w-full shrink-0 h-full relative cursor-pointer select-none bg-slate-950 overflow-hidden';
    
    const img = document.createElement('img');
    const initialSrc = slide.imageUrl ? getSafeImageUrl(slide.imageUrl) : getSliderFallbackSvg();
    img.src = initialSrc;
    img.alt = 'Hero Banner';
    img.setAttribute('referrerpolicy', 'no-referrer');
    img.className = 'w-full h-full object-cover object-center';
    img.loading = 'eager';
    img.dataset.fallback = getSliderFallbackSvg('E Product Hub', 'বিকাশ ও নগদে পেমেন্ট করলেই সেকেন্ডে ফাইল ডাউনলোড');

    img.onerror = () => {
      img.onerror = null;
      img.src = getSliderFallbackSvg('E Product Hub', 'বিকাশ ও নগদে পেমেন্ট করলেই সেকেন্ডে ফাইল ডাউনলোড');
    };

    slideItem.appendChild(img);

    slideItem.onclick = () => {
      if (slide.link) {
        if (slide.link.startsWith('/')) {
          navigateTo(slide.link);
        } else {
          window.location.href = slide.link;
        }
      }
    };

    slidesTrack.appendChild(slideItem);
  });

  wrapper.appendChild(slidesTrack);

  // Indicators
  let currentIndex = 0;
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 px-3.5 py-1.5 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10';

  sliders.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Slide ${idx + 1}`);
    dot.className = `h-2 rounded-full transition-all duration-300 ${idx === 0 ? 'bg-indigo-500 w-6' : 'bg-white/40 hover:bg-white/80 w-2'}`;
    dot.onclick = (e) => {
      e.stopPropagation();
      goToSlide(idx);
    };
    dotsContainer.appendChild(dot);
  });
  wrapper.appendChild(dotsContainer);

  // Prev / Next Navigation Buttons with clean SVG chevrons
  if (sliders.length > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.setAttribute('aria-label', 'Previous slide');
    prevBtn.className = 'absolute left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 border border-white/10 active:scale-95 shadow-md';
    prevBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
      </svg>
    `;
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      goToSlide((currentIndex - 1 + sliders.length) % sliders.length);
    };

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.setAttribute('aria-label', 'Next slide');
    nextBtn.className = 'absolute right-3.5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 border border-white/10 active:scale-95 shadow-md';
    nextBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
      </svg>
    `;
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      goToSlide((currentIndex + 1) % sliders.length);
    };

    wrapper.appendChild(prevBtn);
    wrapper.appendChild(nextBtn);
  }

  function goToSlide(index) {
    currentIndex = index;
    slidesTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
    Array.from(dotsContainer.children).forEach((d, i) => {
      if (i === currentIndex) {
        d.className = 'h-2 rounded-full bg-indigo-500 w-6 transition-all duration-300';
      } else {
        d.className = 'h-2 rounded-full bg-white/40 hover:bg-white/80 w-2 transition-all duration-300';
      }
    });
  }

  // Auto slide with hover pause
  let interval = setInterval(() => {
    if (sliders.length > 1) {
      goToSlide((currentIndex + 1) % sliders.length);
    }
  }, 5000);

  wrapper.onmouseenter = () => clearInterval(interval);
  wrapper.onmouseleave = () => {
    clearInterval(interval);
    interval = setInterval(() => {
      if (sliders.length > 1) {
        goToSlide((currentIndex + 1) % sliders.length);
      }
    }, 5000);
  };

  container.appendChild(wrapper);
}

/**
 * Loads products from Firestore with fallback to default demo products
 * @param {boolean} isInitial True to reset pagination
 * @param {number} pageSize Number of items to fetch
 */
export async function fetchActiveProducts(isInitial = true, pageSize = 12) {
  if (isInitial) {
    lastProductDoc = null;
    hasMoreProducts = true;
  }

  try {
    let q;
    if (isInitial) {
      q = query(
        collection(db, 'products'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
    } else if (lastProductDoc) {
      q = query(
        collection(db, 'products'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        startAfter(lastProductDoc),
        limit(pageSize)
      );
    } else {
      return [];
    }

    const snap = await getDocs(q);
    if (!snap.empty) {
      lastProductDoc = snap.docs[snap.docs.length - 1];
    }
    hasMoreProducts = snap.docs.length === pageSize;

    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });

    return list;
  } catch (error) {
    // If ordered query fails (e.g. composite index pending), try active query without sort
    try {
      const fallbackQ = query(
        collection(db, 'products'),
        where('status', '==', 'active'),
        limit(40)
      );
      const snap = await getDocs(fallbackQ);
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeB - timeA;
      });
      hasMoreProducts = false;
      return list;
    } catch (fallbackErr) {
      hasMoreProducts = false;
      console.warn("Firestore products query could not be loaded:", fallbackErr?.message || fallbackErr);
      return {
        error: true,
        message: fallbackErr?.code === 'permission-denied'
          ? 'ফায়ারস্টোর সিকিউরিটি রুলস পারমিশন ডিনাইড (Firestore Rules ডিপ্লয় প্রয়োজন)।'
          : (fallbackErr?.message || 'প্রোডাক্ট লোড করা যায়নি')
      };
    }
  }
}

export function getHasMoreProducts() {
  return hasMoreProducts;
}

// In-memory cache for up to 200 active products used for client-side instant search
let cachedSearchProducts = null;
let searchFetchPromise = null;

export async function fetchSearchProductsCache() {
  if (cachedSearchProducts) return cachedSearchProducts;
  if (searchFetchPromise) return searchFetchPromise;

  searchFetchPromise = (async () => {
    try {
      let snap;
      try {
        const q = query(
          collection(db, 'products'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(200)
        );
        snap = await getDocs(q);
      } catch (orderedErr) {
        const fallbackQ = query(
          collection(db, 'products'),
          where('status', '==', 'active'),
          limit(200)
        );
        snap = await getDocs(fallbackQ);
      }

      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeB - timeA;
      });
      cachedSearchProducts = list;
      return cachedSearchProducts;
    } catch (e) {
      console.warn("Search cache fetch error:", e);
      return [];
    } finally {
      searchFetchPromise = null;
    }
  })();

  return searchFetchPromise;
}

/**
 * Creates a modern, responsive Product Card element
 * @param {object} product 
 * @returns {HTMLElement}
 */
export function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card group flex flex-col h-full bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300';

  const cat = guessCategory(product.name, product.category);

  // Check if recently added (within last 14 days)
  let isNew = false;
  if (product.createdAt) {
    const createdTime = product.createdAt.toMillis ? product.createdAt.toMillis() : (typeof product.createdAt === 'number' ? product.createdAt : Date.parse(product.createdAt));
    if (createdTime && Date.now() - createdTime < 14 * 24 * 60 * 60 * 1000) {
      isNew = true;
    }
  }

  // Image wrapper (stable aspect ratio container)
  const imgWrapper = document.createElement('div');
  imgWrapper.className = 'relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer select-none';

  const img = document.createElement('img');
  img.src = getSafeImageUrl(product.mainImage, product.name, cat.type);
  img.alt = product.name || 'Digital Product';
  img.loading = 'lazy';
  img.setAttribute('referrerpolicy', 'no-referrer');
  img.className = 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500';
  img.dataset.fallback = getProductFallbackSvg(product.name || 'Digital Product', cat.type);

  // Robust onerror handler: swaps immediately to category-matched SVG illustration
  img.onerror = () => {
    img.onerror = null;
    img.src = getProductFallbackSvg(product.name || 'Digital Product', cat.type);
  };

  imgWrapper.appendChild(img);

  // New badge if recent
  if (isNew) {
    const newBadge = document.createElement('div');
    newBadge.className = 'absolute top-3 right-3 bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs pointer-events-none';
    newBadge.textContent = 'নতুন';
    imgWrapper.appendChild(newBadge);
  }

  imgWrapper.onclick = () => navigateTo(`/product/${product.id}`);

  // Card Content Body
  const body = document.createElement('div');
  body.className = 'p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3';

  const topContent = document.createElement('div');
  topContent.className = 'space-y-1.5';

  // Metadata kicker with category badge, version, file size
  const metaKicker = document.createElement('div');
  metaKicker.className = 'flex flex-wrap items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide';
  metaKicker.innerHTML = `
    <span class="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">${escapeHtml(cat.tag)}</span>
    ${product.version ? `<span aria-hidden="true" class="text-slate-300 dark:text-slate-600">·</span><span class="text-slate-400 font-mono text-[11px]">v${escapeHtml(product.version)}</span>` : ''}
    ${product.fileSize ? `<span aria-hidden="true" class="text-slate-300 dark:text-slate-600">·</span><span class="text-slate-400 font-mono text-[11px]">${escapeHtml(product.fileSize)}</span>` : ''}
  `;

  // Product Title (Fixed height container so price rows across grid align perfectly)
  const title = document.createElement('h3');
  title.className = 'font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2 leading-snug cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition h-[2.75rem] flex items-start';
  title.textContent = product.name || 'ডিজিটাল প্রোডাক্ট';
  title.onclick = () => navigateTo(`/product/${product.id}`);

  // Short description (Clamped)
  const desc = document.createElement('p');
  desc.className = 'text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed h-[2.25rem] overflow-hidden';
  desc.textContent = product.description ? product.description.replace(/[#*`_]/g, '') : '';

  topContent.appendChild(metaKicker);
  topContent.appendChild(title);
  topContent.appendChild(desc);

  // Price & Actions (Pinned to bottom for perfect alignment)
  const bottomContent = document.createElement('div');
  bottomContent.className = 'mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3';

  const priceRow = document.createElement('div');
  priceRow.className = 'flex items-baseline justify-between';

  const priceLabel = document.createElement('span');
  priceLabel.className = 'text-[11px] text-slate-400 dark:text-slate-500 font-medium';
  priceLabel.textContent = 'এককালীন মূল্য';

  const price = document.createElement('div');
  price.className = 'text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 tracking-tight font-mono tabular-nums';
  price.textContent = formatBDT(product.price);

  priceRow.appendChild(priceLabel);
  priceRow.appendChild(price);

  // Action Buttons
  const actionGrid = document.createElement('div');
  actionGrid.className = 'grid grid-cols-2 gap-2 pt-1';

  const cartBtn = document.createElement('button');
  cartBtn.type = 'button';
  cartBtn.className = 'w-full py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition flex items-center justify-center gap-1.5 active:scale-[0.98] min-h-[40px]';
  cartBtn.innerHTML = `
    <svg class="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
    </svg>
    <span>কার্ট</span>
  `;
  cartBtn.onclick = (e) => {
    e.stopPropagation();
    addToCart(product.id);
  };

  const buyBtn = document.createElement('button');
  buyBtn.type = 'button';
  buyBtn.className = 'w-full py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.98] min-h-[40px]';
  buyBtn.innerHTML = `
    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>
    <span>কিনুন</span>
  `;
  buyBtn.onclick = (e) => {
    e.stopPropagation();
    navigateTo(`/checkout?buy=${encodeURIComponent(product.id)}`);
  };

  actionGrid.appendChild(cartBtn);
  actionGrid.appendChild(buyBtn);

  bottomContent.appendChild(priceRow);
  bottomContent.appendChild(actionGrid);

  body.appendChild(topContent);
  body.appendChild(bottomContent);

  card.appendChild(imgWrapper);
  card.appendChild(body);

  return card;
}

/**
 * Checks whether user already owns product
 */
export async function checkUserOwnsProduct(uid, productId) {
  if (!uid || !productId) return false;
  try {
    const snap = await getDoc(doc(db, 'purchases', `${uid}_${productId}`));
    return snap.exists();
  } catch (e) {
    return false;
  }
}
