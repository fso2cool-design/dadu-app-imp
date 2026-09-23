import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  Firestore
} from 'firebase/firestore';
import firebaseConfigJson from '../../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId || '(default)';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

const forceLongPolling = import.meta.env.VITE_FIRESTORE_FORCE_LONG_POLLING === 'true';

// Initialize Firestore with offline persistence and high-speed WebChannel streaming
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    ...(forceLongPolling ? { experimentalForceLongPolling: true } : {}),
  }, databaseId);
} catch (e) {
  try {
    // If persistent cache failed (e.g. storage access restriction in iframe), try memory cache
    firestoreInstance = initializeFirestore(app, {
      ...(forceLongPolling ? { experimentalForceLongPolling: true } : {}),
    }, databaseId);
  } catch {
    // If already initialized, get instance
    firestoreInstance = getFirestore(app, databaseId);
  }
}

export const db = firestoreInstance;
