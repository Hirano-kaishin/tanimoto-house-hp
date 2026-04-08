// =============================================
// firebase.js — Firebase設定ファイル
// =============================================
// ⚠️ firebaseConfigをFirebaseコンソールから取得して下記に貼り付けてください
// https://console.firebase.google.com/
// =============================================

const firebaseConfig = {
  apiKey: "AIzaSyAviplO4Lf5F4SVxkBDz5OBAJFR0Q0kh70",
  authDomain: "tanimoto-house.firebaseapp.com",
  projectId: "tanimoto-house",
  storageBucket: "tanimoto-house.firebasestorage.app",
  messagingSenderId: "245293176188",
  appId: "1:245293176188:web:ce9393b409a1257581c0f9"
};

// Firebase初期化
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

export { db, loadSiteData, saveSiteData };
