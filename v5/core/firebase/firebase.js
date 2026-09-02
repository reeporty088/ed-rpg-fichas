import { firebaseConfig } from '../config/firebase-config.js';

const FIREBASE_VERSION = '10.8.0';
let servicesPromise;

/** Lazily creates the sole Firebase App instance used by V5. */
export function getFirebaseServices() {
  if (!servicesPromise) servicesPromise = initializeFirebase();
  return servicesPromise;
}

async function initializeFirebase() {
  const baseUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [appSdk, authSdk, databaseSdk, storageSdk] = await Promise.all([
    import(`${baseUrl}/firebase-app.js`),
    import(`${baseUrl}/firebase-auth.js`),
    import(`${baseUrl}/firebase-database.js`),
    import(`${baseUrl}/firebase-storage.js`),
  ]);
  const app = appSdk.getApps().find(({ options }) => options.projectId === firebaseConfig.projectId)
    ?? appSdk.initializeApp(firebaseConfig, 'ed-rpg-v5');

  return Object.freeze({
    app,
    auth: authSdk.getAuth(app),
    database: databaseSdk.getDatabase(app),
    storage: storageSdk.getStorage(app),
    sdk: Object.freeze({ authSdk, databaseSdk, storageSdk }),
  });
}
