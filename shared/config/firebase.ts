import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[`VITE_${key}`] || import.meta.env[key] || '';
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || '';
  }
  return '';
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID'),
};

let app: FirebaseApp | undefined;
let db: any = null;
let auth: any = null;
let storage: any = null;
let functions: any = null;

const isWeb = typeof window !== 'undefined';

if (isWeb) {
  // On ne tente l'initialisation QUE si la clé API est présente
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== '') {
    try {
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }
      db = getFirestore(app!);
      auth = getAuth(app!);
      storage = getStorage(app!);
      functions = getFunctions(app!, 'us-central1');
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
    }
  }
}

export { app, db, auth, storage, functions, firebaseConfig };
