/**
 * E Product Hub - Firebase v10 Modular SDK Initialization via CDN
 * No build step, pure ES modules for direct deployment to Vercel/Firebase Hosting.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  getFirestore, 
  enableIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { 
  initializeAppCheck, 
  ReCaptchaV3Provider 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-check.js";
import { RECAPTCHA_V3_SITE_KEY } from "./site-config.js";

// Official Firebase Web Config for E Product Hub
export const firebaseConfig = {
  apiKey: "AIzaSyBfkmwtjPSQGS9YoAMaD-o69-uvau5_l9Q",
  authDomain: "e-producthub.firebaseapp.com",
  projectId: "e-producthub",
  storageBucket: "e-producthub.firebasestorage.app",
  messagingSenderId: "543782771046",
  appId: "1:543782771046:web:424bb33440fd5df24b10a7"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with Local Persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Persistence initialization error:", err);
});

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize App Check (reCAPTCHA v3) if site key configured
export let appCheck = null;
try {
  const siteKey = RECAPTCHA_V3_SITE_KEY || (typeof window !== 'undefined' && window.RECAPTCHA_V3_SITE_KEY);
  if (siteKey && typeof siteKey === 'string' && siteKey.trim() !== '') {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
  }
} catch (e) {
  console.info("App Check not enabled in local environment or pending site key config.");
}
