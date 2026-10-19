/**
 * E Product Hub - ImgBB Secure Image Upload & Validation Module
 * The ImgBB API key is NEVER bundled in public code. It is stored securely in Firestore
 * doc `config/imgbb` (admin-only read per security rules).
 */
import { db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { isSafeImageUrl } from './utils.js';

let cachedApiKey = null;

/**
 * Fetches the ImgBB API key from config/imgbb (Admin-only read)
 */
export async function getImgBBApiKey() {
  if (cachedApiKey) return cachedApiKey;
  try {
    const snap = await getDoc(doc(db, 'config', 'imgbb'));
    if (snap.exists() && snap.data().apiKey) {
      cachedApiKey = snap.data().apiKey.trim();
      return cachedApiKey;
    }
  } catch (err) {
    console.warn("Could not read config/imgbb:", err.message);
  }
  return null;
}

/**
 * Sets or updates the ImgBB API key in config/imgbb (Admin only)
 */
export async function setImgBBApiKey(apiKey) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) throw new Error("API Key cannot be empty");
  await setDoc(doc(db, 'config', 'imgbb'), {
    apiKey: cleanKey,
    updatedAt: new Date().toISOString()
  });
  cachedApiKey = cleanKey;
  return cleanKey;
}

/**
 * Uploads an image file to ImgBB and returns the direct i.ibb.co URL
 * @param {File|Blob} file 
 * @param {Function} onProgress Optional progress callback
 * @returns {Promise<string>} Direct image URL on i.ibb.co
 */
export async function uploadImageToImgBB(file, onProgress) {
  if (!file) throw new Error("অনুগ্রহ করে একটি ছবি নির্বাচন করুন");

  // Validate type
  if (!file.type.startsWith('image/')) {
    throw new Error("শুধুমাত্র ইমেজ ফাইল (.jpg, .png, .webp) অনুমোদিত");
  }

  // Size limit (32MB max on ImgBB)
  if (file.size > 32 * 1024 * 1024) {
    throw new Error("ছবির সাইজ ৩২ মেগাবাইট (32MB) এর বেশি হওয়া যাবে না");
  }

  const apiKey = await getImgBBApiKey();
  if (!apiKey) {
    throw new Error("ImgBB API কী কনফিগার করা নেই। অনুগ্রহ করে অ্যাডমিন সেটিংস থেকে ImgBB API কী সংরক্ষণ করুন।");
  }

  const formData = new FormData();
  formData.append('image', file);

  const endpoint = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || "ImgBB এ ছবি আপলোড ব্যর্থ হয়েছে");
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error("ImgBB থেকে সঠিক ইমেজ ইউআরএল পাওয়া যায়নি");
  }

  // Use direct image URL: display_url or image.url over page URL
  const finalUrl = result.data.display_url || result.data.image?.url || result.data.url;
  if (!finalUrl) {
    throw new Error("ImgBB থেকে ছবির সরাসরি লিংক পাওয়া যায়নি");
  }

  // Strict check: must start with https://i.ibb.co/ or https://i.ibb.co.com/
  if (!isSafeImageUrl(finalUrl)) {
    throw new Error("নিরাপত্তা সতর্কতা: অপ্রত্যাশিত ডোমেন থেকে ইমেজ ইউআরএল এসেছে। শুধুমাত্র i.ibb.co গ্রহণযোগ্য।");
  }

  return finalUrl;
}
