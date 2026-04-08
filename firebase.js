// =============================================
// firebase.js — Firebase設定ファイル
// =============================================
// ⚠️ firebaseConfigをFirebaseコンソールから取得して下記に貼り付けてください
// https://console.firebase.google.com/
// =============================================

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase初期化
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// =============================================
// Firestore — データ読み込み
// =============================================
async function loadSiteData() {
  try {
    const snap = await getDoc(doc(db, 'siteData', 'main'));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch(e) {
    console.warn('Firebase読み込み失敗、ローカルデータを使用:', e);
    return null;
  }
}

// =============================================
// Firestore — データ保存
// =============================================
async function saveSiteData(section, data) {
  const snap = await getDoc(doc(db, 'siteData', 'main'));
  const current = snap.exists() ? snap.data() : {};
  await setDoc(doc(db, 'siteData', 'main'), {
    ...current,
    [section]: data,
    updatedAt: new Date().toISOString()
  });
}

// =============================================
// Storage — 画像アップロード
// =============================================
async function uploadImage(key, file) {
  const storageRef = ref(storage, 'images/' + key + '_' + Date.now() + '.' + file.name.split('.').pop());
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}

export { db, storage, loadSiteData, saveSiteData, uploadImage };
