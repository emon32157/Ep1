/**
 * E Product Hub - Authentication Module
 * Firebase Email/Password Auth, Session Persistence, Verification, Profile, Admin Detection
 */
import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showToast, normalizePhone } from './utils.js';

let currentUser = null;
let isUserAdmin = false;
let userProfile = null;
let authInitialized = false;
const authSubscribers = [];

export function getAuthState() {
  return {
    user: currentUser,
    isAdmin: isUserAdmin,
    profile: userProfile,
    isInitialized: authInitialized
  };
}

export function subscribeAuth(callback) {
  authSubscribers.push(callback);
  if (authInitialized) {
    try {
      callback(getAuthState());
    } catch (e) {
      console.warn("Auth subscriber error:", e);
    }
  }
  return () => {
    const idx = authSubscribers.indexOf(callback);
    if (idx !== -1) authSubscribers.splice(idx, 1);
  };
}

function notifySubscribers() {
  const state = getAuthState();
  authSubscribers.forEach((cb) => {
    try {
      cb(state);
    } catch (e) {
      console.warn("Auth subscriber notification error:", e);
    }
  });
}

/**
 * Checks whether currently signed in user has Admin privilege.
 * Tests access to doc(db, 'config', 'imgbb'), which rules allow only for isAdmin().
 */
async function checkAdminStatus(uid) {
  if (!uid) return false;
  try {
    const testDoc = await getDoc(doc(db, 'config', 'imgbb'));
    // If the read didn't throw permission-denied, user has admin access
    return true;
  } catch (err) {
    // Permission denied means not an admin
    return false;
  }
}

/**
 * Fetches user profile from users/{uid}
 */
async function fetchUserProfile(uid) {
  if (!uid) return null;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
  } catch (e) {
    console.warn("Could not fetch user profile:", e);
  }
  return null;
}

let resolveAuthReady;
export const authReady = new Promise((resolve) => {
  resolveAuthReady = resolve;
});

let isFirstAuthCall = true;

/**
 * Waits for initial auth state verification or falls back after 8 seconds
 * @returns {Promise<Object>}
 */
export function waitForAuthReady() {
  return Promise.race([
    authReady,
    new Promise((resolve) => setTimeout(() => resolve(getAuthState()), 8000))
  ]);
}

// Global Auth State Observer
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    // Fetch profile and check admin permissions
    const [profile, adminCheck] = await Promise.all([
      fetchUserProfile(user.uid),
      checkAdminStatus(user.uid)
    ]);
    userProfile = profile;
    isUserAdmin = adminCheck;
  } else {
    userProfile = null;
    isUserAdmin = false;
  }
  authInitialized = true;
  notifySubscribers();

  if (isFirstAuthCall) {
    isFirstAuthCall = false;
    if (resolveAuthReady) {
      resolveAuthReady(getAuthState());
    }
  }
});

/**
 * Signs in user with email and password
 */
export async function loginUser(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    showToast('সফলভাবে লগইন হয়েছে!', 'success');
    return cred.user;
  } catch (error) {
    let msg = 'লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড সঠিক নয়।';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      msg = 'ভুল ইমেইল বা পাসওয়ার্ড প্রদান করা হয়েছে।';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'অতিরিক্ত ব্যর্থ চেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।';
    }
    showToast(msg, 'error');
    throw error;
  }
}

/**
 * Registers new user with Email and Password
 * Enforces verified email requirement by sending verification link immediately.
 */
export async function registerUser({ email, password, name, phone }) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || '').trim();
  const cleanPhone = normalizePhone(phone);

  if (!cleanName) {
    showToast('আপনার পুরো নাম লিখুন', 'error');
    throw new Error('Name is required');
  }

  if (!cleanPhone) {
    showToast('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)', 'error');
    throw new Error('Valid phone number is required');
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = cred.user;

    // Send email verification immediately
    await sendEmailVerification(user);

    // Create user document in users/{uid}
    // Strict rules check: keys().hasOnly(['name','email','phone','createdAt'])
    await setDoc(doc(db, 'users', user.uid), {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      createdAt: serverTimestamp()
    });

    showToast('রেজিস্ট্রেশন সফল! আপনার ইমেইলে একটি ভেরিফিকেশন লিঙ্ক পাঠানো হয়েছে।', 'success', 6000);
    return user;
  } catch (error) {
    let msg = 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।';
    if (error.code === 'auth/email-already-in-use') {
      msg = 'এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে। দয়া করে লগইন করুন।';
    } else if (error.code === 'auth/weak-password') {
      msg = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।';
    }
    showToast(msg, 'error');
    throw error;
  }
}

/**
 * Resends email verification link to current user
 */
export async function resendVerificationEmail() {
  if (!auth.currentUser) {
    showToast('প্রথমে লগইন করুন', 'error');
    return;
  }
  try {
    await sendEmailVerification(auth.currentUser);
    showToast('ভেরিফিকেশন লিঙ্ক পাঠানো হয়েছে! আপনার ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করুন।', 'success');
  } catch (error) {
    if (error.code === 'auth/too-many-requests') {
      showToast('অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।', 'warning');
    } else {
      showToast('ভেরিফিকেশন লিঙ্ক পাঠানো যায়নি।', 'error');
    }
  }
}

/**
 * Refreshes user email verification state and forces ID token refresh
 * @returns {Promise<boolean>}
 */
export async function refreshVerifiedState() {
  const u = auth.currentUser;
  if (!u) return false;
  try {
    await u.reload();
    const t = await u.getIdTokenResult();
    if (u.emailVerified && !t.claims.email_verified) {
      await u.getIdToken(true);
    }
  } catch (e) {
    console.warn("Failed to refresh user auth state:", e);
    return u.emailVerified;
  }
  notifySubscribers();
  return u.emailVerified;
}

/**
 * Sends password reset email
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    showToast('পাসওয়ার্ড রিসেট লিঙ্ক ইমেইলে পাঠানো হয়েছে।', 'success');
  } catch (error) {
    showToast('পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে। ইমেইল চেক করুন।', 'error');
    throw error;
  }
}

/**
 * Updates profile fields (only name and phone allowed per Rules)
 */
export async function updateUserProfile({ name, phone }) {
  if (!auth.currentUser) throw new Error('Not authenticated');
  const uid = auth.currentUser.uid;
  const cleanName = (name || '').trim();
  let cleanPhone = '';
  if (phone && String(phone).trim()) {
    cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      showToast('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)', 'error');
      throw new Error('Valid phone number is required');
    }
  }

  try {
    await updateDoc(doc(db, 'users', uid), {
      name: cleanName,
      phone: cleanPhone
    });
    userProfile = { ...(userProfile || {}), name: cleanName, phone: cleanPhone };
    notifySubscribers();
    showToast('প্রোফাইল সফলভাবে আপডেট হয়েছে', 'success');
  } catch (error) {
    showToast('প্রোফাইল আপডেট করা যায়নি', 'error');
    throw error;
  }
}

/**
 * Signs out current user
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    showToast('লগআউট সফল হয়েছে', 'info');
  } catch (error) {
    showToast('লগআউট হতে সমস্যা হয়েছে', 'error');
  }
}
