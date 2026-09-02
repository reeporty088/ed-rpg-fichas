import { getFirebaseServices } from '../firebase/firebase.js';

export const authProviders = Object.freeze({ email: 'password', google: 'google.com', microsoft: 'microsoft.com', discord: 'discord.com' });

export async function observeAuthState(callback) {
  const { auth, sdk: { authSdk } } = await getFirebaseServices();
  return authSdk.onAuthStateChanged(auth, callback);
}

export async function signInWithEmail(email, password) {
  const { auth, sdk: { authSdk } } = await getFirebaseServices();
  return authSdk.signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  const { auth, sdk: { authSdk } } = await getFirebaseServices();
  return authSdk.signOut(auth);
}

// OAuth UI and flows are deliberately deferred; only provider support is declared here.
export const supportedOAuthProviders = Object.freeze(['google', 'microsoft', 'discord']);
