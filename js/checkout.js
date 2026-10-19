/**
 * E Product Hub - Checkout & Automated Payment Claim Module
 * Atomic sequential writeBatch claims matching Firestore Security Rules.
 * No Cloud Functions needed (Firebase Spark Plan compatible).
 */
import { db, auth } from './firebase-config.js';
import { getAuthState, resendVerificationEmail, refreshVerifiedState } from './auth.js';
import { getCartProductDetails, removeFromCart, clearCart } from './cart.js';
import { 
  doc, 
  getDoc, 
  writeBatch, 
  increment, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { 
  normalizePhone, 
  formatBDT, 
  showToast, 
  recordTrxAttemptFailure, 
  getCooldownRemainingSeconds,
  clearTrxAttemptCooldown 
} from './utils.js';
import { navigateTo } from './router.js';

/**
 * Loads payment configurations from config/payment doc
 */
export async function getPaymentConfig() {
  try {
    const snap = await getDoc(doc(db, 'config', 'payment'));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {
    console.warn("Could not load config/payment:", e);
  }
  return {
    bkashNumber: '01XXXXXXXXX',
    bkashType: 'Send Money (Personal)',
    nagadNumber: '01XXXXXXXXX',
    nagadType: 'Send Money (Personal)',
    rocketNumber: '01XXXXXXXXX',
    rocketType: 'Send Money (Personal)',
    instructions: 'উপরের যেকোনো নম্বরে মোট টাকা Send Money করুন। এরপর ফিরতি SMS থেকে Transaction ID (TrxID) এবং যে নম্বর থেকে টাকা পাঠিয়েছেন তা নিচে দিয়ে নিশ্চিত করুন।'
  };
}

/**
 * Checks which items the user has already purchased
 * @param {string} uid 
 * @param {Array} products 
 * @returns {Promise<{ unowned: Array, owned: Array }>}
 */
export async function filterUnownedProducts(uid, products) {
  const unowned = [];
  const owned = [];

  for (const p of products) {
    try {
      const pSnap = await getDoc(doc(db, 'purchases', `${uid}_${p.id}`));
      if (pSnap.exists()) {
        owned.push(p);
      } else {
        unowned.push(p);
      }
    } catch (e) {
      unowned.push(p);
    }
  }

  return { unowned, owned };
}

/**
 * Executes the atomic transaction claiming batch sequentially.
 * Rules require:
 * 1) update transactions/{trxId}: { spent: increment(price), claimedBy: uid, lastProductId: pid, lastClaimAt: serverTimestamp() }
 * 2) create purchases/{uid}_{pid}: { uid, productId: pid, trxId, payerNumber, price, createdAt: serverTimestamp() }
 * 
 * @param {string} trxId 
 * @param {string} rawPayerNumber 
 * @param {Array} itemsToClaim 
 * @returns {Promise<{ success: boolean, claimed: Array, failedItem: object|null, error: any }>}
 */
export async function claimTransactionBatch(trxId, rawPayerNumber, itemsToClaim, { countFailure = true } = {}) {
  const { user } = getAuthState();
  if (!user) throw new Error("ব্যবহারকারী লগইন করা নেই");

  // Refresh user verification and token to ensure freshest emailVerified status
  const isVerified = await refreshVerifiedState();
  if (!isVerified) {
    throw new Error("ইমেইল ভেরিফাই করা প্রয়োজন। অনুগ্রহ করে আপনার ইমেইল ভেরিফাই করুন।");
  }

  const cleanTrxId = (trxId || '').trim().toUpperCase();
  const normalizedPayer = normalizePhone(rawPayerNumber);

  if (!cleanTrxId) throw new Error("Transaction ID দিন");
  if (!normalizedPayer) throw new Error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)");
  if (!itemsToClaim || itemsToClaim.length === 0) throw new Error("কোনো প্রোডাক্ট নির্বাচিত নেই");

  const claimed = [];
  let failedItem = null;
  let lastError = null;

  for (const product of itemsToClaim) {
    try {
      const batch = writeBatch(db);
      
      const trxRef = doc(db, 'transactions', cleanTrxId);
      batch.update(trxRef, {
        spent: increment(product.price),
        claimedBy: user.uid,
        lastProductId: product.id,
        lastClaimAt: serverTimestamp()
      });

      const purchaseRef = doc(db, 'purchases', `${user.uid}_${product.id}`);
      batch.set(purchaseRef, {
        uid: user.uid,
        productId: product.id,
        trxId: cleanTrxId,
        payerNumber: normalizedPayer,
        price: product.price,
        createdAt: serverTimestamp()
      });

      // Commit the single batch for this item
      await batch.commit();
      claimed.push(product);
    } catch (err) {
      failedItem = product;
      lastError = err;
      break; // Stop loop, transaction balance exhausted or mismatch
    }
  }

  if (claimed.length > 0) {
    clearTrxAttemptCooldown();
    return {
      success: true,
      claimed,
      failedItem,
      error: lastError
    };
  }

  // If 0 items were claimed, record failure attempt for client rate limiting (manual attempts only)
  if (countFailure) {
    recordTrxAttemptFailure();
  }
  return {
    success: false,
    claimed: [],
    failedItem,
    error: lastError
  };
}
