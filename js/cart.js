/**
 * E Product Hub - Cart Module
 * Digital goods store only product IDs (qty 1) in Firestore carts/{uid}.
 * Prices are ALWAYS re-read directly from products collection, never trusted from client!
 */
import { db } from './firebase-config.js';
import { getAuthState, subscribeAuth } from './auth.js';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showToast } from './utils.js';

const GUEST_CART_KEY = 'eph_guest_cart_ids';
let cartItemIds = [];
const cartSubscribers = [];

function getGuestCartIds() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveGuestCartIds(ids) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(ids));
  } catch (e) {}
}

export function subscribeCart(cb) {
  cartSubscribers.push(cb);
  cb(cartItemIds);
  return () => {
    const idx = cartSubscribers.indexOf(cb);
    if (idx !== -1) cartSubscribers.splice(idx, 1);
  };
}

function notifyCartSubscribers() {
  cartSubscribers.forEach((cb) => {
    try {
      cb([...cartItemIds]);
    } catch (e) {}
  });
  updateCartBadge();
}

export function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-count-badge');
  const count = cartItemIds.length;
  badges.forEach((b) => {
    b.textContent = count > 0 ? String(count) : '';
    b.classList.toggle('hidden', count === 0);
  });
}

/**
 * Loads cart from Firestore or Guest LocalStorage
 */
export async function loadCart() {
  const { user } = getAuthState();
  if (user) {
    try {
      const cartSnap = await getDoc(doc(db, 'carts', user.uid));
      if (cartSnap.exists()) {
        const data = cartSnap.data();
        cartItemIds = Array.isArray(data.items) ? data.items : [];
      } else {
        // Sync any guest items if exist
        const guestIds = getGuestCartIds();
        if (guestIds.length > 0) {
          cartItemIds = Array.from(new Set(guestIds)).slice(0, 50);
          await setDoc(doc(db, 'carts', user.uid), {
            items: cartItemIds,
            updatedAt: serverTimestamp()
          });
          localStorage.removeItem(GUEST_CART_KEY);
        } else {
          cartItemIds = [];
        }
      }
    } catch (e) {
      console.warn("Could not load cart from Firestore, using guest cart:", e);
      cartItemIds = getGuestCartIds();
    }
  } else {
    cartItemIds = getGuestCartIds();
  }
  notifyCartSubscribers();
  return cartItemIds;
}

// React to auth state changes to reload cart
subscribeAuth((authState) => {
  if (authState.isInitialized) {
    loadCart();
  }
});

/**
 * Saves cartItemIds to either Firestore carts/{uid} or localStorage
 */
async function persistCart() {
  const { user } = getAuthState();
  if (user) {
    try {
      await setDoc(doc(db, 'carts', user.uid), {
        items: cartItemIds,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Failed to persist cart to Firestore:", e);
    }
  } else {
    saveGuestCartIds(cartItemIds);
  }
  notifyCartSubscribers();
}

/**
 * Adds product ID to cart
 */
export async function addToCart(productId) {
  if (!productId) return;
  if (cartItemIds.includes(productId)) {
    showToast('প্রোডাক্টটি ইতিমধ্যে কার্টে রয়েছে', 'info');
    return;
  }
  if (cartItemIds.length >= 50) {
    showToast('কার্টে সর্বোচ্চ ৫০টি প্রোডাক্ট যোগ করা যাবে', 'warning');
    return;
  }

  cartItemIds.push(productId);
  await persistCart();
  showToast('কার্টে যোগ করা হয়েছে!', 'success');
}

/**
 * Removes product ID from cart
 */
export async function removeFromCart(productId) {
  const index = cartItemIds.indexOf(productId);
  if (index !== -1) {
    cartItemIds.splice(index, 1);
    await persistCart();
    showToast('কার্ট থেকে সরানো হয়েছে', 'info');
  }
}

/**
 * Clears entire cart
 */
export async function clearCart() {
  cartItemIds = [];
  const { user } = getAuthState();
  if (user) {
    try {
      await deleteDoc(doc(db, 'carts', user.uid));
    } catch (e) {}
  } else {
    localStorage.removeItem(GUEST_CART_KEY);
  }
  notifyCartSubscribers();
}

/**
 * Re-reads products fresh from Firestore products collection.
 * Re-computes live subtotal and total, never trusting client state.
 * Only returns active Firestore products; silently prunes non-existent or inactive products.
 * @param {string[]} [overrideIds] Optional specific list of IDs (e.g. for Buy Now)
 * @returns {Promise<{ products: Array, total: number, count: number, removedCount: number }>}
 */
export async function getCartProductDetails(overrideIds = null) {
  const isGuestOrUserCart = overrideIds === null;
  const ids = overrideIds || cartItemIds;
  if (!ids || ids.length === 0) {
    return { products: [], total: 0, count: 0, removedCount: 0 };
  }

  // Fetch all products in parallel directly from Firestore
  const validProducts = [];
  const validIds = [];

  const promises = ids.map(async (id) => {
    try {
      const snap = await getDoc(doc(db, 'products', id));
      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'active') {
          return { id: snap.id, ...data };
        }
      }
    } catch (err) {
      console.warn(`Product ${id} fetch error:`, err?.message);
    }
    return null;
  });

  const resolved = await Promise.all(promises);
  for (const p of resolved) {
    if (p) {
      validProducts.push(p);
      validIds.push(p.id);
    }
  }

  const removedCount = ids.length - validProducts.length;

  // If this is the active user/guest cart and some items no longer exist or are inactive, silently remove them
  if (isGuestOrUserCart && removedCount > 0) {
    cartItemIds = validIds;
    await persistCart();
    notifyCartSubscribers();
  }

  const total = validProducts.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  return {
    products: validProducts,
    total,
    count: validProducts.length,
    removedCount
  };
}
