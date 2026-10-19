/**
 * E Product Hub - Purchases & Secure File Download Module
 * Only owners of purchases/{uid}_{pid} or admins can fetch productFiles/{pid}.
 * The secret downloadUrl is never stored in public product documents or client source.
 */
import { db } from './firebase-config.js';
import { getAuthState } from './auth.js';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { formatBDT, formatDate, getSafeImageUrl, showToast } from './utils.js';

/**
 * Loads all purchases made by the current user
 * @returns {Promise<Array>} List of purchases with product metadata
 */
export async function loadUserPurchases() {
  const { user } = getAuthState();
  if (!user) return [];

  try {
    const q = query(collection(db, 'purchases'), where('uid', '==', user.uid));
    const snap = await getDocs(q);
    
    const rawList = [];
    snap.forEach((d) => {
      rawList.push({ id: d.id, ...d.data() });
    });

    // Sort by createdAt descending
    rawList.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
      return timeB - timeA;
    });

    // Fetch product details for each purchase
    const enriched = await Promise.all(
      rawList.map(async (purchase) => {
        let product = null;
        try {
          const prodSnap = await getDoc(doc(db, 'products', purchase.productId));
          if (prodSnap.exists()) {
            product = { id: prodSnap.id, ...prodSnap.data() };
          }
        } catch (e) {
          console.warn(`Could not load product ${purchase.productId}:`, e);
        }
        return {
          ...purchase,
          product: product || { name: 'ডিজিটাল প্রোডাক্ট', mainImage: '', price: purchase.price, status: 'inactive' }
        };
      })
    );

    return enriched;
  } catch (error) {
    console.warn("Failed to load purchases:", error?.message || error);
    showToast("ক্রয়কৃত প্রোডাক্ট লোড করা সম্ভব হয়নি", "error");
    return [];
  }
}

/**
 * Fetches the secure download URL from productFiles/{productId}
 * Authorized ONLY to the purchaser per Firestore Rules.
 * @param {string} productId 
 * @returns {Promise<{ downloadUrl: string, fileName?: string }>}
 */
export async function fetchProductDownloadFile(productId) {
  if (!productId) throw new Error("প্রোডাক্ট আইডি অনুপস্থিত");
  
  try {
    const fileSnap = await getDoc(doc(db, 'productFiles', productId));
    if (!fileSnap.exists()) {
      throw new Error("ফাইলটি এখনো সংযুক্ত করা হয়নি। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।");
    }
    const data = fileSnap.data();
    if (!data.downloadUrl) {
      throw new Error("ডাউনলোড লিংক পাওয়া যায়নি।");
    }
    return {
      downloadUrl: data.downloadUrl,
      fileName: data.fileName || 'Digital-Product'
    };
  } catch (error) {
    if (error.code === 'permission-denied') {
      throw new Error("অনুমতি নেই। শুধুমাত্র প্রোডাক্টের বৈধ ক্রেতা এই ফাইল ডাউনলোড করতে পারেন।");
    }
    throw error;
  }
}
