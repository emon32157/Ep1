# E Product Hub - মোবাইল-ফ্রেন্ডলি সেটআপ গাইড (Android Phone-Only)

স্বাগতম! এই গাইডটি বিশেষভাবে তৈরি করা হয়েছে যাতে আপনি শুধুমাত্র একটি **অ্যান্ড্রয়েড ফোন (Android Browser / Chrome)** ব্যবহার করে কোনো কম্পিউটার ছাড়াই Firebase Console ও GitHub এর মাধ্যমে "E Product Hub" সম্পূর্ণ প্রস্তুত ও ডিপ্লয় করতে পারেন।

---

## ১. প্রজেক্ট ফাইল স্ট্রাকচার (File Structure Overview)

```text
├── index.html               # মূল SPA পেজ (Hind Siliguri ফন্ট, এসইও মেটাডাটা, রেসপনসিভ লেআউট)
├── css/
│   └── style.css            # আধুনিক রেসপনসিভ সিএসএস, ডার্ক/লাইট মোড ভেরিয়েবল, বাটন ও ফর্ম স্টাইল
├── js/
│   ├── firebase-config.js   # Firebase v10 CDN ইনিশিয়ালাইজেশন ও App Check সেটআপ
│   ├── auth.js              # ইমেইল/পাসওয়ার্ড অথেন্টিকেশন, সেশন, ইমেইল ভেরিফিকেশন, প্রোফাইল
│   ├── products.js          # প্রোডাক্ট ক্যাটালগ, সার্চ, পেজিনেশন, হিরো স্লাইডার ও ইউটিউব প্রিভিউ
│   ├── cart.js              # ডিজিটাল প্রোডাক্ট কার্ট (শুধুমাত্র প্রোডাক্ট আইডি ও ডাটাবেজ থেকে লাইভ মূল্য)
│   ├── checkout.js          # TrxSync অটোমেটেড পেমেন্ট ক্লেইম (অ্যাটমিক sequential writeBatch)
│   ├── purchases.js         # ক্রয়কৃত প্রোডাক্ট ও সুরক্ষিত ফাইল ডাউনলোড (productFiles)
│   ├── admin.js             # অ্যাডমিন ড্যাশবোর্ড (প্রোডাক্ট, স্লাইডার, পেমেন্ট, মেসেজ, TrxSync লগ)
│   ├── imgbb.js             # ImgBB ইমেজ আপলোডার (গোপন API কী দিয়ে সুরক্ষিত আপলোড)
│   ├── router.js            # History API SPA রাউটার ও রুট গার্ড
│   ├── utils.js             # XSS-মুক্ত বিবরণ রেন্ডারার, ফোন নরমালাইজার, টোস্ট ও কনফার্ম ডায়ালগ
│   └── app.js               # মূল অ্যাপ বুটস্ট্র্যাপ ও ভিউ কন্ট্রোলার
├── firestore.rules          # ক্লাউড ফায়ারস্টোরের কঠোর সিকিউরিটি রুলস (Rules v2)
├── firebase.json            # Firebase Hosting কনফিগারেশন, SPA রিরাইট ও কঠোর CSP হেডার্স
├── vercel.json              # Vercel ডিপ্লয়মেন্ট কনফিগারেশন ও সিকিউরিটি হেডার্স
├── .gitignore               # গিট ইগনোর ফাইল
└── SETUP.md                 # সম্পূর্ণ বাংলা নির্দেশিকা
```

---

## ২. Firebase Console-এ প্রয়োজনীয় কনফিগারেশন (ধাপে ধাপে)

আপনার ফোনে ক্রোম বা যেকোনো ব্রাউজারে **[Firebase Console](https://console.firebase.google.com/)** এ প্রবেশ করুন এবং ডেস্কটপ সাইট (Desktop Site) মোড অন করে নিতে পারেন।

### (ক) Firebase Auth সেটআপ
1. প্রজেক্টের **Build > Authentication** সেকশনে যান।
2. **Sign-in method** ট্যাবে গিয়ে **Email/Password** অপশনটি **Enable** করুন (Email link অপশনটি বন্ধ থাকবে)।
3. **Settings** ট্যাবে যান:
   - **Email enumeration protection** এনাবল (Enable) নিশ্চিত করুন যাতে নিরাপত্তা বজায় থাকে।

---

### (খ) অ্যাডমিন রোল তৈরি (admins/{ADMIN_UID})
সিকিউরিটি রুলস অনুযায়ী কেউ ক্লায়েন্ট থেকে অ্যাডমিন হতে পারবে না। এটি ফায়ারবেস কনসোল থেকে ম্যানুয়ালি তৈরি করতে হবে:
1. **Build > Firestore Database > Data** ট্যাবে যান।
2. **Start collection**-এ ক্লিক করুন:
   - Collection ID দিন: `admins`
   - Document ID দিন: `iCms16V0DSNbAHB1iewpE7JtnoH2`
   - যেকোনো ডামি ফিল্ড দিন: যেমন `role`: `"admin"`
3. **Save** চাপুন।
> **ফলাফল:** এই UID যুক্ত ইউজার লগইন করলে স্বয়ংক্রিয়ভাবে `/admin` প্যানেল অ্যাক্সেস করতে পারবেন।

---

### (গ) সিস্টেম কনফিগারেশন ডক তৈরি (config/imgbb ও config/payment)

#### ১. `config/imgbb` তৈরি (ImgBB API Key):
1. **Firestore Database > Data**-তে গিয়ে **Start collection** চাপুন:
   - Collection ID: `config`
   - Document ID: `imgbb`
   - Field: `apiKey` (string) = আপনার ImgBB V1 API Key (সংগ্রহ করুন [api.imgbb.com](https://api.imgbb.com) থেকে)
2. **Save** চাপুন।
> **নিরাপত্তা নোট:** সিকিউরিটি রুলসে `config/imgbb` শুধুমাত্র অ্যাডমিনদের জন্য রিড/রাইট অনুমোদিত। সাধারণ পাবলিক বা সোর্স কোডে এই কী কখনো প্রকাশ পাবে না।

#### ২. `config/payment` তৈরি (পেমেন্ট নম্বর ও নির্দেশিকা):
1. `config` কালেকশনের ভেতরে **Add document** চাপুন:
   - Document ID: `payment`
   - Fields যোগ করুন:
     - `bkashNumber` (string): যেমন `"017XXXXXXXX"`
     - `bkashType` (string): `"Send Money (Personal)"`
     - `nagadNumber` (string): যেমন `"018XXXXXXXX"`
     - `nagadType` (string): `"Send Money (Personal)"`
     - `rocketNumber` (string): যেমন `"019XXXXXXXX"`
     - `rocketType` (string): `"Send Money (Personal)"`
     - `upayNumber` (string): যেমন `"01XXXXXXXXX"`
     - `upayType` (string): `"Send Money (Personal)"`
     - `instructions` (string): `"উপরের যেকোনো নম্বরে মোট টাকা Send Money করুন। এরপর ফিরতি SMS এর TrxID এবং প্রেরক নম্বর নিচে দিয়ে ভেরিফাই করুন।"`
2. **Save** চাপুন। (এটি পরবর্তীতে সরাসরি অ্যাডমিন প্যানেলের **পেমেন্ট সেটিংস** ট্যাব থেকেও পরিবর্তন করা যাবে)।

---

### (ঘ) Firestore Composite Index তৈরি
প্রোডাক্টগুলোকে অ্যাক্টিভ অনুযায়ী এবং নতুনতম তারিখ অনুযায়ী সাজাতে একটি কম্পোজিট ইনডেক্স প্রয়োজন:
1. **Firestore Database > Indexes** ট্যাবে যান।
2. **Composite > Add index** চাপুন:
   - **Collection ID**: `products`
   - **Fields to index**:
     - Field 1: `status` | Query scope: Collection | Order: **Ascending**
     - Field 2: `createdAt` | Query scope: Collection | Order: **Descending**
3. **Create index** চাপুন। (ইনডেক্স তৈরি হতে ২-৩ মিনিট সময় লাগতে পারে)।

---

### (ঙ) Firebase App Check সেটআপ ও মনিটরিং (reCAPTCHA v3)

1. **Google reCAPTCHA কনসোলে কী তৈরি:**
   - [Google reCAPTCHA Console](https://www.google.com/recaptcha/admin) এ গিয়ে **reCAPTCHA v3** সিলেক্ট করুন।
   - Domains ঘরে আপনার Netlify ডোমেইন (যেমন: `your-store.netlify.app` ও `localhost`) যুক্ত করে **Site Key** এবং **Secret Key** সংগ্রহ করুন।
2. **প্রজেক্টে সাইট কী কনফিগার:**
   - প্রজেক্টের `js/site-config.js` ফাইলে `export const RECAPTCHA_V3_SITE_KEY = "YOUR_RECAPTCHA_V3_SITE_KEY";` এ আপনার সংগৃহীত সাইট কী পেস্ট করুন।
3. **Firebase App Check এ রেজিস্ট্রেশন:**
   - **Firebase Console > Build > App Check > Apps** ট্যাবে গিয়ে আপনার ওয়েব অ্যাপটি সিলেক্ট করে **Register** চাপুন।
   - **reCAPTCHA v3** নির্বাচন করে reCAPTCHA Secret Key প্রদান করুন।
4. **মেট্রিক্স মনিটর করুন (MONITOR first):**
   - প্রথমে মেট্রিক্স মনিটর (Monitor) করুন।
   - ⚠️ **বিশেষ সতর্কবার্তা (CRITICAL):** ফায়ারস্টোরে (Firestore) ভুলেও App Check **Enforce** করবেন না! কারণ যতক্ষণ না অ্যান্ড্রয়েড **TrxSync** অ্যাপে Firebase App Check Provider (যেমন Play Integrity) কনফিগার করা হচ্ছে, ততক্ষণ ফায়ারস্টোরে App Check Enforce করলে TrxSync-এর ট্রানজ্যাকশন ডাটা রাইট ব্লক হয়ে যাবে এবং অটো-পেমেন্ট সম্পূর্ণ বন্ধ হয়ে যাবে!

---

### (চ) সোশ্যাল মিডিয়া শেয়ারিং ও লিংক প্রিভিউ নোট (SEO Note)

> ℹ️ **জরুরি তথ্য:** WhatsApp, Facebook, বা Messenger-এর মতো সোশ্যাল মিডিয়া বটগুলো জাভাস্ক্রিপ্ট রান করে না। তাই ক্লায়েন্ট-সাইড SPA (Single Page Application)-এ ব্রাউজারে মেটা ট্যাগ ডাইনামিক হলেও সোশ্যাল প্রিভিউ কার্ড জেনারেট হতে সার্ভার-সাইড মেটা ট্যাগ বা SSR (Server-Side Rendering) প্রয়োজন হয়, যা পিওর ক্লায়েন্ট-সাইড স্ট্যাটিক হোস্টিং থেকে দেওয়া সম্ভব নয়। তবে ওয়েব ব্রাউজারে বুকমার্ক, সার্চ ইঞ্জিন ও ব্রাউজার ট্যাবে সকল বাংলা মেটা ও ক্যানোনিকাল ট্যাগ সঠিকভাবে কাজ করবে।

---

### (চ) GitHub থেকে Vercel অথবা Firebase Hosting-এ ডিপ্লয়

প্রজেক্টের স্টাইলিং আধুনিক **Tailwind CSS v4** (`src/index.css`) ব্যবহার করে তৈরি, যা Vite বান্ডলারের মাধ্যমে সংকলিত হয়।

#### অপশন ১: Vercel এ ডিপ্লয় (প্রস্তাবিত ও সহজতম)
1. গিটহাবে আপনার রিপোজিটরিতে কোড পুশ করুন।
2. ব্রাউজারে **[vercel.com](https://vercel.com)**-এ লগইন করুন।
3. **Add New > Project** চেপে আপনার GitHub রিপোজিটরি ইমপোর্ট করুন।
4. **Framework Preset**: `Vite` সিলেক্ট করুন।
5. **Build Command**: `npm run build` (বা ডিফল্ট `vite build`)।
6. **Output Directory**: `dist`
7. **Deploy** বাটনে চাপুন! প্রজেক্টে দেওয়া `vercel.json` স্বয়ংক্রিয়ভাবে SPA রাউটিং এবং কঠোর CSP হেডার্স কনফিগার করে নেবে।

#### অপশন ২: Firebase Hosting এ ডিপ্লয়
1. কম্পিউটার বা টার্মিনালে প্রজেক্ট ফোল্ডারে বিল্ড করুন:
   ```bash
   npm install
   npm run build
   firebase login
   firebase deploy
   ```
2. প্রজেক্টের `firebase.json` এবং `firestore.rules` স্বয়ংক্রিয়ভাবে সিকিউরিটি রুলস ও `dist` ফোল্ডারের ফাইল হোস্টিংয়ে ডিপ্লয় করে দেবে।

#### অপশন ৩: Netlify এ ডিপ্লয় (GitHub থেকে)
1. গিটহাবে আপনার রিপোজিটরিতে কোড পুশ করুন।
2. **[netlify.com](https://netlify.com)**-এ লগইন করে **Add new site > Import an existing project** চেপে আপনার GitHub রিপোজিটরি সিলেক্ট করুন।
3. প্রজেক্টের রুটে থাকা `netlify.toml` স্বয়ংক্রিয়ভাবে Build Command (`npm run build`), Publish directory (`dist`), Node 22, SPA রিডাইরেক্ট রুলস এবং কঠোর সিকিউরিটি হেডার্স (CSP) কনফিগার করে নেবে।
4. **Deploy site** বাটনে ক্লিক করুন।
5. **অতীব জরুরি (Firebase Auth Authorized Domain):** সাইট ডিপ্লয় হওয়ার পর Netlify-এর দেওয়া সাবডোমেনটি (যেমন: `your-project.netlify.app` বা কাস্টম ডোমেন) কপি করুন। এরপর **Firebase Console > Authentication > Settings > Authorized domains**-এ গিয়ে **Add domain** বাটনে ক্লিক করে ডোমেনটি যুক্ত করুন। এটি না করলে Netlify লাইভ সাইট থেকে Firebase ইউজার সাইন-ইন বা রেজিস্ট্রেশন অনুমোদিত হবে না।

---

## ৩. সিকিউরিটি রুলস প্লেগ্রাউন্ড টেস্ট চেকলিস্ট (Rules Playground Test)

Firebase Console-এ **Firestore Database > Rules > Rules Playground**-এ গিয়ে নিচের টেস্টগুলো চালিয়ে নিরাপত্তা যাচাই করতে পারেন:

| টেস্টের বিষয় | টেস্ট সেটিংস (Playground) | প্রত্যাশিত ফলাফল | ব্যাখ্যা |
| :--- | :--- | :--- | :--- |
| **১. আন-অথেনটিকেটেড ইউজার** | `get /transactions/TRX123` (Auth বন্ধ) | ❌ **DENIED** | গ্রাহক বা বহিরাগত কেউ ট্রানজ্যাকশন দেখতে পারবে না। |
| **২. আন-অথেনটিকেটেড ফাইল লিংক** | `get /productFiles/prod_1` (Auth বন্ধ) | ❌ **DENIED** | লগইন ছাড়া ডাউনলোড লিংক পাওয়া অসম্ভব। |
| **৩. অপেন/অবৈধ ক্রেতার ফাইল রিড** | `get /productFiles/prod_1` (লগইন করা, কিন্তু `purchases/UID_prod_1` নেই) | ❌ **DENIED** | শুধুমাত্র প্রোডাক্টটি কেনা থাকলে `owns(pid)` পাস করবে। |
| **৪. ভুল প্রেরক নম্বর দিয়ে ক্লেইম** | Trx এর `sender: "01700000000"` কিন্তু রিকোয়েস্টে `payerNumber: "01800000000"` | ❌ **DENIED** | `purchase.data.payerNumber == before.sender` শর্তে আটকে যাবে। |
| **৫. অতিরিক্ত বা রি-ইউজড TrxID** | Trx এর `amount: 500`, `spent: 500`, আবার নতুন কেনাকাটার চেষ্টা | ❌ **DENIED** | `after.spent <= before.amount` শর্তে আটকে যাবে। |
| **৬. বৈধ কেনাকাটার পর ডাউনলোড** | `purchases/UID_prod_1` তৈরি হওয়ার পর `get /productFiles/prod_1` | ✅ **ALLOWED** | অনুমোদিত মালিক তাৎক্ষণিক ডাউনলোড লিংক পাবেন। |

---

## ৪. TrxSync অ্যান্ড্রয়েড অ্যাপ ও অটোমেশন গাইড

1. আপনার Android ফোনে **TrxSync** অ্যাপটি ইনস্টল করুন।
2. অ্যাপটিতে আপনার অ্যাডমিন ক্রেডেনশিয়াল দিয়ে লগইন করুন (যাতে `transactions` কালেকশনে লেখার অনুমতি থাকে)।
3. বিকাশ/নগদ/রকেট থেকে এসএমএস আসলে TrxSync সাথে সাথে ফায়ারস্টোরে লিখে দেবে:
   ```json
   {
     "trxId": "BLG74H3KJ",
     "provider": "bkash",
     "amount": 500,
     "sender": "01712345678",
     "status": "received",
     "receivedAt": "Timestamp"
   }
   ```
4. গ্রাহক যখন চেকআউট পেজে এই TrxID এবং প্রেরক নম্বর দিয়ে সাবমিট করবেন, `claimTransactionBatch` ফাংশন স্বয়ংক্রিয়ভাবে ট্রানজ্যাকশনটি ক্লেইম করে তাঁর অ্যাকাউন্টে প্রোডাক্টটির পারচেজ রেকর্ড যুক্ত করে দেবে এবং কোনো মানুষের সহায়তা ছাড়াই সাথে সাথে ফাইল ডাউনলোড লিংক উন্মুক্ত হয়ে যাবে!
