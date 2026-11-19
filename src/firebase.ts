import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// Use persistent local cache (IndexedDB) with multi-tab support.
// This makes menu navigation near-instant on repeat visits because Firestore
// serves documents from the local cache while simultaneously syncing updates
// from the server in the background, eliminating the full re-download on
// every page switch.
function createDb() {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    }, dbId || undefined);
  } catch (e: any) {
    // initializeFirestore throws if called more than once; fall back to getFirestore
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = createDb();
export const auth = getAuth(app);

export { firebaseConfig };
