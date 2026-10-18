/* Firebase Auth on the modular SDK, exposed as the small slice of the compat
 * `firebase` global the hub and Analytics use (apps, initializeApp, auth(),
 * auth.GoogleAuthProvider). Load as <script type="module">; inline code that
 * uses it must run on DOMContentLoaded (module scripts execute before it).
 *
 * Why: compat auth always boots the popup/redirect resolver, which pulls
 * iframe.js and gapi on every page load. Here the resolver is passed only to
 * signInWithPopup, so those load when someone actually clicks Google sign-in.
 *
 * Persistence lists IndexedDB FIRST on purpose: that is where the compat SDK
 * (still used by Lineup and Ops) stores the session, under the same key, so a
 * device stays signed in across pages and across this switch. localStorage is
 * only the fallback for browsers without IndexedDB.
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup, browserPopupRedirectResolver
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const auths = new Map();
function authFor(app){
  if (!auths.has(app.name)) {
    const a = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
    auths.set(app.name, {
      get currentUser(){ return a.currentUser; },
      onAuthStateChanged: (cb, err) => onAuthStateChanged(a, cb, err),
      signInWithEmailAndPassword: (e, p) => signInWithEmailAndPassword(a, e, p),
      signInWithPopup: (provider) => signInWithPopup(a, provider, browserPopupRedirectResolver),
      signOut: () => signOut(a)
    });
  }
  return auths.get(app.name);
}
const wrap = (app) => ({ name: app.name, options: app.options, auth: () => authFor(app) });
const auth = () => authFor(getApp());
auth.GoogleAuthProvider = GoogleAuthProvider;

window.firebase = {
  get apps(){ return getApps().map(wrap); },
  initializeApp: (cfg, name) => wrap(initializeApp(cfg, name)),
  auth
};
