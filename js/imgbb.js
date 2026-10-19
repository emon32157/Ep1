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
 * Compresses an image file client-side before uploading:
 * - Skips GIF, SVG, and files under 300 KB whose longest side <= maxSide
 * - Decodes with createImageBitmap({ imageOrientation: 'from-image' }), fallback to HTMLImageElement
 * - Scales down so longest side <= maxSide
 * - Exports with canvas.toBlob as image/webp quality 0.85 (fallback to image/jpeg 0.85)
 * - Releases memory (bitmap.close(), URL.revokeObjectURL)
 * - Returns original file if compression fails or produces a larger file
 */
export async function compressImageIfNeeded(file, { maxSide = 1600, onProgress } = {}) {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  // Skip compression for GIF and SVG
  if (type === 'image/gif' || type === 'image/svg+xml' || name.endsWith('.gif') || name.endsWith('.svg')) {
    return file;
  }

  let bitmap = null;
  let objectUrl = null;

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let sourceDrawable = null;

    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        sourceWidth = bitmap.width;
        sourceHeight = bitmap.height;
        sourceDrawable = bitmap;
      } catch (e) {
        bitmap = null;
      }
    }

    if (!sourceDrawable) {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = objectUrl;
      });
      sourceWidth = img.naturalWidth || img.width;
      sourceHeight = img.naturalHeight || img.height;
      sourceDrawable = img;
    }

    const longestSide = Math.max(sourceWidth, sourceHeight);

    // Skip compression if file < 300 KB AND longest side <= maxSide
    if (file.size < 300 * 1024 && longestSide <= maxSide) {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      return file;
    }

    if (typeof onProgress === 'function') {
      onProgress('ছবি ছোট করা হচ্ছে...');
    }

    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;
    if (longestSide > maxSide) {
      const scale = maxSide / longestSide;
      targetWidth = Math.max(1, Math.round(sourceWidth * scale));
      targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }

    ctx.drawImage(sourceDrawable, 0, 0, targetWidth, targetHeight);

    // Release source image memory immediately
    if (bitmap && typeof bitmap.close === 'function') {
      bitmap.close();
      bitmap = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }

    // Export with canvas.toBlob as image/webp quality 0.85 (fallback to image/jpeg 0.85)
    const blob = await new Promise((resolve) => {
      canvas.toBlob(
        (b) => {
          if (b && b.type === 'image/webp') {
            resolve(b);
          } else {
            canvas.toBlob((jpegBlob) => resolve(jpegBlob), 'image/jpeg', 0.85);
          }
        },
        'image/webp',
        0.85
      );
    });

    if (!blob) {
      return file;
    }

    // If compressed file is larger than original, keep original
    if (blob.size >= file.size) {
      return file;
    }

    const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';
    return new File([blob], `${baseName}${ext}`, { type: blob.type });

  } catch (err) {
    console.warn("Image compression skipped, falling back to original:", err);
    return file;
  } finally {
    if (bitmap && typeof bitmap.close === 'function') {
      try { bitmap.close(); } catch (e) {}
    }
    if (objectUrl) {
      try { URL.revokeObjectURL(objectUrl); } catch (e) {}
    }
  }
}

/**
 * Uploads an image file to ImgBB and returns the direct i.ibb.co URL
 * @param {File|Blob} file 
 * @param {Function} [onProgress] Optional progress callback
 * @param {object} [options]
 * @param {number} [options.maxSide=1600]
 * @returns {Promise<string>} Direct image URL on i.ibb.co
 */
export async function uploadImageToImgBB(file, onProgress, { maxSide = 1600 } = {}) {
  if (!file) throw new Error("অনুগ্রহ করে একটি ছবি নির্বাচন করুন");

  // Validate type on original file
  if (!file.type.startsWith('image/')) {
    throw new Error("শুধুমাত্র ইমেজ ফাইল (.jpg, .png, .webp, .gif, .svg) অনুমোদিত");
  }

  // Size limit (32MB max on ImgBB) on original file
  if (file.size > 32 * 1024 * 1024) {
    throw new Error("ছবির সাইজ ৩২ মেগাবাইট (32MB) এর বেশি হওয়া যাবে না");
  }

  // Client-side compression before network upload
  const fileToUpload = await compressImageIfNeeded(file, { maxSide, onProgress });

  if (typeof onProgress === 'function') {
    onProgress('আপলোড হচ্ছে...');
  }

  const apiKey = await getImgBBApiKey();
  if (!apiKey) {
    throw new Error("ImgBB API কী কনফিগার করা নেই। অনুগ্রহ করে অ্যাডমিন সেটিংস থেকে ImgBB API কী সংরক্ষণ করুন।");
  }

  const formData = new FormData();
  formData.append('image', fileToUpload);

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
