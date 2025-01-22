import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyChPcaHDVCuz6Whhr87xaT-X_3lStqL_Is",
  authDomain: "pedifacil-6e91e.firebaseapp.com",
  projectId: "pedifacil-6e91e",
  storageBucket: "pedifacil-6e91e.firebasestorage.app",
  messagingSenderId: "247060176018",
  appId: "1:247060176018:web:6a9020775b169151769a4b",
  measurementId: "G-LYP6JFSKHK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Enable Firestore offline persistence
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistência offline falhou: múltiplas abas abertas');
    } else if (err.code === 'unimplemented') {
      console.warn('O navegador não suporta persistência offline');
    }
  }); 