import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 匿名UID（端末に保存）
export function getUserUID() {
  let uid = localStorage.getItem('remnant_uid');
  if (!uid) {
    uid = '#' + String(Math.floor(Math.random() * 9000) + 1000);
    localStorage.setItem('remnant_uid', uid);
  }
  return uid;
}

// Haversine距離計算（メートル）
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 近くの痕跡を取得
// orderByを使わずクライアント側でソート（Compositeインデックス不要）
export async function loadNearbyRemnants(lat, lng, radiusM = 300) {
  const snapshot = await getDocs(collection(db, 'remnants'));
  const now = new Date();
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => {
      if (!r.lat || !r.lng) return false;
      if (r.expires === 'week' && r.expiresAt) {
        const exp = r.expiresAt.toDate ? r.expiresAt.toDate() : new Date(r.expiresAt);
        if (exp < now) return false;
      }
      return haversineDistance(lat, lng, r.lat, r.lng) <= radiusM;
    })
    .map(r => ({
      ...r,
      distance: Math.round(haversineDistance(lat, lng, r.lat, r.lng)),
      timestamp: r.timestamp?.toDate
        ? r.timestamp.toDate().toISOString().slice(0,10).replace(/-/g,'.')
        : '',
    }))
    .sort((a, b) => a.distance - b.distance);
}

// 痕跡を投稿
export async function postRemnant({ text, expires, lat, lng, uid }) {
  return addDoc(collection(db, 'remnants'), {
    text, expires, lat, lng, uid,
    timestamp: serverTimestamp(),
    expiresAt: expires === 'week'
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : null,
  });
}

// 同一UIDの足跡を取得
export async function loadTrailByUID(uid) {
  const q = query(collection(db, 'remnants'), where('uid', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate
        ? d.data().timestamp.toDate().toISOString().slice(0,10).replace(/-/g,'.')
        : '',
    }))
    .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
}

// 痕跡を削除
export async function deleteRemnant(id) {
  return deleteDoc(doc(db, 'remnants', id));
}
