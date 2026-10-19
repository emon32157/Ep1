import { db } from './firebase-config.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  limit,
  orderBy, 
  serverTimestamp,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { 
  formatBDT, 
  formatDate, 
  getSafeImageUrl, 
  isSafeImageUrl, 
  parseYouTubeVideoId, 
  showToast, 
  showConfirmDialog,
  normalizeDownloadUrl
} from './utils.js';
import { getImgBBApiKey, setImgBBApiKey, uploadImageToImgBB } from './imgbb.js';

/**
 * Counts total purchases recorded for a specific product
 * @param {string} productId 
 * @returns {Promise<number>}
 */
export async function adminCountPurchasesForProduct(productId) {
  if (!productId) return 0;
  try {
    const q = query(collection(db, 'purchases'), where('productId', '==', productId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (err) {
    try {
      const q = query(collection(db, 'purchases'), where('productId', '==', productId), limit(1));
      const snap = await getDocs(q);
      return snap.empty ? 0 : 1;
    } catch (e) {
      console.warn("Could not check purchases count:", e?.message);
      return 0;
    }
  }
}

/**
 * Updates a product's status (active / inactive)
 * @param {string} productId 
 * @param {'active'|'inactive'} status 
 */
export async function adminSetProductStatus(productId, status) {
  if (!productId) throw new Error("প্রোডাক্ট আইডি অনুপস্থিত");
  const newStatus = status === 'active' ? 'active' : 'inactive';
  await updateDoc(doc(db, 'products', productId), {
    status: newStatus
  });
  return newStatus;
}

/**
 * Loads all products (active and inactive) for admin
 */
export async function adminLoadProducts() {
  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (error) {
    // If composite index is pending, fallback to simple collection read
    const snap = await getDocs(collection(db, 'products'));
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
      return timeB - timeA;
    });
    return list;
  }
}

/**
 * Saves product document to products/{id} and productFiles/{id}
 */
export async function adminSaveProduct({
  id = null,
  name,
  description,
  price,
  mainImage,
  images = [],
  youtubeUrl = '',
  status = 'active',
  downloadUrl = '',
  fileName = '',
  category = 'other',
  fileSize = '',
  version = '',
  previewUrl = ''
}) {
  const cleanName = (name || '').trim();
  const cleanPrice = Math.round(Number(price) || 0);
  const cleanDesc = (description || '').trim();
  const cleanMainImage = (mainImage || '').trim();
  const cleanDownloadUrl = (downloadUrl || '').trim();

  if (!cleanName) throw new Error("প্রোডাক্টের নাম লিখুন");
  if (cleanPrice <= 0) throw new Error("মূল্য শূন্যের বেশি (সংখ্যা) হতে হবে");
  if (!cleanMainImage) throw new Error("প্রধান ছবি (Main Image) এর লিংক দিন");
  if (!isSafeImageUrl(cleanMainImage) || cleanMainImage.startsWith('data:')) {
    throw new Error("ছবির লিংক অবশ্যই https://i.ibb.co বা https://i.ibb.co.com এর হতে হবে");
  }

  // Validate additional images
  for (const imgUrl of (images || [])) {
    const trimmed = (imgUrl || '').trim();
    if (trimmed && (!isSafeImageUrl(trimmed) || trimmed.startsWith('data:'))) {
      throw new Error("অতিরিক্ত ছবির লিংক অবশ্যই https://i.ibb.co বা https://i.ibb.co.com এর হতে হবে");
    }
  }
  const validImages = (images || [])
    .map((u) => (u || '').trim())
    .filter((u) => u && isSafeImageUrl(u) && !u.startsWith('data:'));

  // Validate YouTube URL if provided
  let validYoutubeUrl = '';
  if (youtubeUrl && youtubeUrl.trim()) {
    const vid = parseYouTubeVideoId(youtubeUrl);
    if (!vid) {
      throw new Error("ভুল ইউটিউব ভিডিও লিঙ্ক। সঠিক YouTube লিংক দিন।");
    }
    validYoutubeUrl = youtubeUrl.trim();
  }

  // Validate preview URL (empty allowed; otherwise valid https:, length <= 300, rejects javascript:, data:, http:)
  const cleanPreviewUrl = (previewUrl || '').trim();
  if (cleanPreviewUrl) {
    if (cleanPreviewUrl.length > 300) {
      throw new Error("লাইভ প্রিভিউ লিংক সর্বোচ্চ ৩০০ অক্ষরের মধ্যে হতে হবে");
    }
    try {
      const parsed = new URL(cleanPreviewUrl);
      if (parsed.protocol !== 'https:') {
        throw new Error("লাইভ প্রিভিউ লিংক অবশ্যই https:// প্রোটোকল হতে হবে (http, javascript বা data অনুমোদিত নয়)");
      }
    } catch (e) {
      if (e.message && e.message.includes('https://')) {
        throw e;
      }
      throw new Error("সঠিক https:// লাইভ প্রিভিউ লিংক দিন (যেমন: https://example.com/demo)");
    }
  }

  // Validate downloadUrl: Required for NEW products; on edit, empty means "keep existing link"
  let validDownloadUrl = '';
  if (!id && !cleanDownloadUrl) {
    throw new Error("নতুন প্রোডাক্টের জন্য সিক্রেট ডাউনলোড লিংক দেওয়া বাধ্যতামূলক");
  }

  if (cleanDownloadUrl) {
    const norm = normalizeDownloadUrl(cleanDownloadUrl);
    validDownloadUrl = norm.url;
    if (norm.converted) {
      showToast('Google Drive লিংক সরাসরি ডাউনলোড লিংকে রূপান্তর করা হয়েছে', 'info');
    }
  }

  // Validate category
  const allowedCategories = ['ebook', 'ui', 'script', 'graphic', 'other'];
  const cleanCategory = allowedCategories.includes(category) ? category : 'other';

  const cleanFileSize = (fileSize || '').trim().slice(0, 30);
  const cleanVersion = (version || '').trim().slice(0, 20);

  // Determine doc ref (new or existing)
  const prodRef = id ? doc(db, 'products', id) : doc(collection(db, 'products'));
  const pid = prodRef.id;

  // 1. Save public product doc (NEVER contains downloadUrl)
  const productData = {
    name: cleanName,
    description: cleanDesc,
    price: cleanPrice,
    mainImage: cleanMainImage,
    images: validImages,
    youtubeUrl: validYoutubeUrl,
    category: cleanCategory,
    fileSize: cleanFileSize,
    version: cleanVersion,
    previewUrl: cleanPreviewUrl,
    status: status === 'inactive' ? 'inactive' : 'active',
    updatedAt: serverTimestamp()
  };

  if (!id) {
    productData.createdAt = serverTimestamp();
  }

  await setDoc(prodRef, productData, { merge: true });

  // 2. Save secure download link in productFiles/{pid}
  // Required on new; on edit, empty means keep existing link
  if (validDownloadUrl) {
    await setDoc(doc(db, 'productFiles', pid), {
      downloadUrl: validDownloadUrl,
      fileName: (fileName || cleanName).trim(),
      updatedAt: serverTimestamp()
    });
  }

  return pid;
}

/**
 * Loads secret file data for product editing
 */
export async function adminGetProductFile(productId) {
  try {
    const snap = await getDoc(doc(db, 'productFiles', productId));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {}
  return null;
}

/**
 * Deletes product and associated productFiles.
 * Defence-in-depth: Re-checks purchase count and throws error if purchases exist.
 */
export async function adminDeleteProduct(productId) {
  if (!productId) throw new Error("প্রোডাক্ট আইডি অনুপস্থিত");
  const count = await adminCountPurchasesForProduct(productId);
  if (count > 0) {
    throw new Error(`এই প্রোডাক্টের ${count} টি ক্রয় আছে, তাই এটি ডিলিট করা যাবে না। ক্রেতারা যেন ফাইল ডাউনলোড করতে পারে সেজন্য প্রোডাক্টটি Inactive করা হবে।`);
  }
  await deleteDoc(doc(db, 'products', productId));
  try {
    await deleteDoc(doc(db, 'productFiles', productId));
  } catch (e) {}
}

/**
 * Loads all sliders
 */
export async function adminLoadSliders() {
  const snap = await getDocs(collection(db, 'sliders'));
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  return list;
}

/**
 * Saves slider (imageUrl, link, order)
 */
export async function adminSaveSlider({ id = null, imageUrl, link = '', order = 0 }) {
  const cleanUrl = (imageUrl || '').trim();
  if (!cleanUrl) throw new Error("স্লাইডার ছবির লিংক দিন");
  if (!isSafeImageUrl(cleanUrl) || cleanUrl.startsWith('data:')) {
    throw new Error("স্লাইডার ছবির লিংক অবশ্যই https://i.ibb.co বা https://i.ibb.co.com এর হতে হবে");
  }

  const sliderRef = id ? doc(db, 'sliders', id) : doc(collection(db, 'sliders'));
  await setDoc(sliderRef, {
    imageUrl: cleanUrl,
    link: (link || '').trim(),
    order: Number(order) || 0,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return sliderRef.id;
}

/**
 * Deletes a slider
 */
export async function adminDeleteSlider(sliderId) {
  await deleteDoc(doc(db, 'sliders', sliderId));
}

/**
 * Loads payment configurations
 */
export async function adminLoadPaymentConfig() {
  const snap = await getDoc(doc(db, 'config', 'payment'));
  return snap.exists() ? snap.data() : {};
}

/**
 * Saves payment configurations
 */
export async function adminSavePaymentConfig(data) {
  await setDoc(doc(db, 'config', 'payment'), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

// In-memory cache for public site config
let cachedSiteConfig = null;
let siteConfigFetchPromise = null;

export async function loadPublicSiteConfig(forceRefresh = false) {
  if (!forceRefresh && cachedSiteConfig !== null) {
    return cachedSiteConfig;
  }
  if (!forceRefresh && siteConfigFetchPromise) {
    return siteConfigFetchPromise;
  }

  siteConfigFetchPromise = (async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'site'));
      cachedSiteConfig = snap.exists() ? snap.data() : null;
      return cachedSiteConfig;
    } catch (e) {
      console.warn("Public site config load failed:", e);
      return null;
    } finally {
      siteConfigFetchPromise = null;
    }
  })();

  return siteConfigFetchPromise;
}

/**
 * Loads site configuration (config/site)
 */
export async function adminLoadSiteConfig() {
  const snap = await getDoc(doc(db, 'config', 'site'));
  return snap.exists() ? snap.data() : {};
}

/**
 * Validates and saves site settings (config/site)
 */
export async function adminSaveSiteConfig({
  siteName = '',
  whatsapp = '',
  telegram = '',
  facebookUrl = '',
  email = '',
  phone = '',
  footerNote = ''
}) {
  const cleanSiteName = (siteName || '').trim();
  const cleanWa = (whatsapp || '').trim();
  const cleanTg = (telegram || '').trim();
  const cleanFb = (facebookUrl || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').trim();
  const cleanFooterNote = (footerNote || '').trim();

  if (cleanWa && !/^\d{8,15}$/.test(cleanWa)) {
    throw new Error("হোয়াটসঅ্যাপ নম্বরে শুধুমাত্র দেশীয় কোডসহ ৮-১৫টি ডিজিট হতে হবে (যেমন: 88017XXXXXXXX)");
  }
  if (cleanTg && !/^[A-Za-z0-9_]{4,32}$/.test(cleanTg)) {
    throw new Error("টেলিগ্রাম ইউজারনেম ৪-৩২ অক্ষরের হতে হবে (যেমন: user_name)");
  }
  if (cleanFb) {
    const isFb = cleanFb.startsWith('https://www.facebook.com/') ||
                 cleanFb.startsWith('https://facebook.com/') ||
                 cleanFb.startsWith('https://fb.com/');
    if (!isFb) {
      throw new Error("ফেসবুক লিঙ্ক অবশ্যই https://facebook.com/ বা https://fb.com/ দিয়ে শুরু হতে হবে");
    }
  }
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error("সঠিক ইমেইল ঠিকানা দিন");
  }

  const data = {
    siteName: cleanSiteName,
    whatsapp: cleanWa,
    telegram: cleanTg,
    facebookUrl: cleanFb,
    email: cleanEmail,
    phone: cleanPhone,
    footerNote: cleanFooterNote,
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, 'config', 'site'), data, { merge: true });
  cachedSiteConfig = data;
  return data;
}

/**
 * Loads purchases up to 500 for admin sales tab
 */
export async function adminLoadPurchases() {
  try {
    const q = query(
      collection(db, 'purchases'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (err) {
    const snap = await getDocs(query(collection(db, 'purchases'), limit(500)));
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
      return timeB - timeA;
    });
    return list;
  }
}

/**
 * Revokes purchase access (admin only)
 */
export async function adminRevokePurchase(purchaseId) {
  if (!purchaseId) throw new Error("Purchase ID is required");
  await deleteDoc(doc(db, 'purchases', purchaseId));
}

/**
 * Grants manual purchase access to user
 */
export async function adminGrantManualAccess({
  buyerEmail,
  productId,
  trxId = 'MANUAL',
  payerNumber = ''
}) {
  const cleanEmail = (buyerEmail || '').trim().toLowerCase();
  const cleanTrx = (trxId || 'MANUAL').trim();
  const cleanPayer = (payerNumber || '').trim();

  if (!cleanEmail) throw new Error("ক্রেতার ইমেইল দিন");
  if (!productId) throw new Error("প্রোডাক্ট নির্বাচন করুন");

  // Query users collection to find user ID
  const usersQ = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
  const userSnap = await getDocs(usersQ);
  if (userSnap.empty) {
    throw new Error("এই ইমেইল দিয়ে কোনো নিবন্ধিত ইউজার পাওয়া যায়নি। গ্রাহককে আগে সাইটে একাউন্ট খুলতে বলুন।");
  }

  const buyerUser = userSnap.docs[0];
  const uid = buyerUser.id;
  const purchaseId = `${uid}_${productId}`;

  // Check if purchase already exists
  const existingSnap = await getDoc(doc(db, 'purchases', purchaseId));
  if (existingSnap.exists()) {
    throw new Error("এই ইউজারের কাছে ইতিমধ্যেই এই প্রোডাক্টটির অ্যাক্সেস রয়েছে");
  }

  // Get product to retrieve price
  const prodSnap = await getDoc(doc(db, 'products', productId));
  if (!prodSnap.exists()) {
    throw new Error("প্রোডাক্টটি পাওয়া যায়নি");
  }
  const prodData = prodSnap.data();
  const price = typeof prodData.price === 'number' ? prodData.price : Number(prodData.price) || 0;

  // Write purchases/{uid}_{productId} matching security rules:
  // keys: ['uid','productId','trxId','payerNumber','price','createdAt','grantedByAdmin']
  // price is number, createdAt == request.time
  await setDoc(doc(db, 'purchases', purchaseId), {
    uid,
    productId,
    trxId: cleanTrx || 'MANUAL',
    payerNumber: cleanPayer,
    price,
    createdAt: serverTimestamp(),
    grantedByAdmin: true
  });

  return { purchaseId, uid, productId };
}

/**
 * Loads contact messages with [PAYMENT ISSUE] messages highlighted & sorted first
 */
export async function adminLoadMessages() {
  const snap = await getDocs(collection(db, 'contactMessages'));
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));

  list.sort((a, b) => {
    const aIsIssue = (a.message || '').startsWith('[PAYMENT ISSUE]');
    const bIsIssue = (b.message || '').startsWith('[PAYMENT ISSUE]');
    if (aIsIssue && !bIsIssue) return -1;
    if (!aIsIssue && bIsIssue) return 1;

    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
    return timeB - timeA;
  });

  return list;
}

/**
 * Deletes a contact message
 */
export async function adminDeleteMessage(id) {
  await deleteDoc(doc(db, 'contactMessages', id));
}

/**
 * Loads TrxSync transactions
 */
export async function adminLoadTransactions() {
  const snap = await getDocs(collection(db, 'transactions'));
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const timeA = a.receivedAt?.toMillis ? a.receivedAt.toMillis() : (a.receivedAt || 0);
    const timeB = b.receivedAt?.toMillis ? b.receivedAt.toMillis() : (b.receivedAt || 0);
    return timeB - timeA;
  });
  return list;
}

