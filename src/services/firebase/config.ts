import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
  connectFirestoreEmulator
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

// S2.3 App Check (anti-abuse: hanya request dari aplikasi resmi yang lolos).
// Aktif hanya bila VITE_APPCHECK_SITE_KEY terisi (reCAPTCHA Enterprise site key
// dari Google Cloud Console). Tanpa key → App Check nonaktif, aplikasi tetap jalan.
const appCheckSiteKey = import.meta.env.VITE_APPCHECK_SITE_KEY as string | undefined;
if (appCheckSiteKey) {
  if (import.meta.env.DEV) {
    // Token debug lokal: nilai tercetak di console browser saat dev,
    // daftarkan di Firebase Console > Build > App Check > Manage debug tokens.
    (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
  }
  void import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  });
}

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

if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
