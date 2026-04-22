(function () {
  'use strict';

  const STORAGE_KEY = 'ed_auth_v1';
  const SESSION_KEY = 'ed_session_v1';
  const ADMIN_EMAIL = 'referrey033@gmail.com';
  const DB_PATH     = 'sistema_auth';

  const SESSION_DAYS_DEFAULT  = 3;
  const SESSION_DAYS_REMEMBER = 15;

  const firebaseConfig = {
    apiKey:            'AIzaSyCvxxwfsonP5a45nbcz34cxYhXaWBZVhwQ',
    authDomain:        'ed-rpg---sistema-de-fichas.firebaseapp.com',
    databaseURL:       'https://ed-rpg---sistema-de-fichas-default-rtdb.firebaseio.com',
    projectId:         'ed-rpg---sistema-de-fichas',
    storageBucket:     'ed-rpg---sistema-de-fichas.firebasestorage.app',
    messagingSenderId: '350999444010',
    appId:             '1:350999444010:web:d89f31d13e449b8fbfa153'
  };

  const defaultSheets = [
    { id: 'v1_ficha',      name: 'Ficha ED v1',       photo: '🧾', url: 'ed_sistemav1_ficha.html',        version: 'v1' },
    { id: 'v2_ficha',      name: 'Ficha ED v2',       photo: '📘', url: 'ed_sistemav2_ficha.html',        version: 'v2' },
    { id: 'v3_ficha_base', name: 'Ficha ED v3 - Base',photo: '🎭', url: 'ed_sistemav3_painelcentral.html',version: 'v3' }
  ];

  /* ─── Firebase state ─── */
  let db = null;
  let _ref, _get, _set, _update, _remove, _onValue;

  /* ─── localStorage helpers ─── */
  function now() { return Date.now(); }
  function normalizeEmail(e) { return (e || '').trim().toLowerCase(); }

  function readJSON(key, fallback) {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
    catch { return fallback; }
  }
  function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  /* ─── Local store (synchronous cache) ─── */
  function ensureAdmin(store) {
    if (store.users.find(u => u.email === ADMIN_EMAIL)) return;
    store.users.push({
      id: crypto.randomUUID(),
      name: 'Administrador',
      email: ADMIN_EMAIL,
      password: 'admin123',
      role: 'admin',
      status: 'approved',
      versions: ['v1', 'v2', 'v3'],
      assignedSheets: ['v1_ficha', 'v2_ficha', 'v3_ficha_base'],
      createdAt: now()
    });
    writeJSON(STORAGE_KEY, store);
  }

  function getLocalStore() {
    const store = readJSON(STORAGE_KEY, { users: [], sheets: [...defaultSheets] });
    if (!Array.isArray(store.users))  store.users  = [];
    if (!Array.isArray(store.sheets)) store.sheets = [...defaultSheets];
    ensureAdmin(store);
    return store;
  }

  function saveLocalStore(store) { writeJSON(STORAGE_KEY, store); }

  /* ─── Firebase data normalization ─── */
  // Firebase stores JS arrays as {0:…,1:…} objects — normalize both forms
  function toArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return Object.values(val);
  }

  function normalizeUser(u) {
    if (!u) return null;
    return { ...u, versions: toArray(u.versions), assignedSheets: toArray(u.assignedSheets) };
  }

  function storeFromFirebase(data) {
    return {
      users:  data?.users  ? Object.values(data.users).map(normalizeUser).filter(Boolean) : [],
      sheets: data?.sheets ? Object.values(data.sheets).filter(Boolean) : [...defaultSheets]
    };
  }

  // Convert arrays → objects keyed by id (Firebase prefers this for collections)
  function storeToFirebase(store) {
    const users = {}, sheets = {};
    store.users.forEach(u  => { users[u.id]   = u; });
    store.sheets.forEach(s => { sheets[s.id]  = s; });
    return { users, sheets };
  }

  /* ─── Firebase callback ─── */
  function onFirebaseData(snapshot) {
    if (!snapshot.exists()) {
      // First run — push local data to Firebase
      const local = getLocalStore();
      _set(_ref(db, DB_PATH), storeToFirebase(local)).catch(() => {});
      return;
    }
    const store = storeFromFirebase(snapshot.val());
    // Always guarantee the admin account exists locally
    ensureAdmin(store);
    saveLocalStore(store);
    // Signal index.html (or any page) that the store changed
    if (typeof window.onAuthStoreChanged === 'function') window.onAuthStoreChanged();
  }

  /* ─── Firebase write helpers ─── */
  function fbPatch(userId, patch) {
    if (!db) return;
    const data = {};
    for (const [k, v] of Object.entries(patch)) data[`users/${userId}/${k}`] = v;
    _update(_ref(db, DB_PATH), data).catch(console.error);
  }

  function fbDelete(userId) {
    if (!db) return;
    _remove(_ref(db, `${DB_PATH}/users/${userId}`)).catch(console.error);
  }

  function fbAddToCollection(sub, id, item) {
    if (!db) return;
    _update(_ref(db, `${DB_PATH}/${sub}`), { [id]: item }).catch(console.error);
  }

  /* ─── Firebase initialization (non-blocking dynamic import) ─── */
  async function initFirebase() {
    try {
      const [appMod, dbMod] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js')
      ]);

      const { initializeApp, getApps } = appMod;
      _ref     = dbMod.ref;
      _get     = dbMod.get;
      _set     = dbMod.set;
      _update  = dbMod.update;
      _remove  = dbMod.remove;
      _onValue = dbMod.onValue;

      // Re-use existing Firebase app if already initialized on this page
      const apps = getApps();
      const app  = apps.length ? apps[0] : initializeApp(firebaseConfig);
      db = dbMod.getDatabase(app);

      // Real-time listener — keeps localStorage in sync with Firebase
      // and triggers UI refresh whenever remote data changes
      _onValue(_ref(db, DB_PATH), onFirebaseData);

    } catch (err) {
      console.warn('[EDAuth] Firebase indisponível — usando apenas localStorage.', err.message);
    }
  }

  /* ─── Session ─── */
  function getSession() {
    const s = readJSON(SESSION_KEY, null);
    if (!s) return null;
    if (s.expiresAt < now()) { localStorage.removeItem(SESSION_KEY); return null; }
    return s;
  }

  function currentUser() {
    const s = getSession();
    if (!s) return null;
    return getLocalStore().users.find(u => u.id === s.userId) || null;
  }

  function setSession(user, remember) {
    const days = remember ? SESSION_DAYS_REMEMBER : SESSION_DAYS_DEFAULT;
    writeJSON(SESSION_KEY, { userId: user.id, expiresAt: now() + days * 86400000, remember: !!remember });
  }

  function logout() { localStorage.removeItem(SESSION_KEY); }

  /* ─── Auth ─── */
  function login(email, password, remember) {
    const normalized = normalizeEmail(email);
    const user = getLocalStore().users.find(u => u.email === normalized);
    if (!user || user.password !== password) return { ok: false, error: 'Email ou senha inválidos.' };
    if (user.status !== 'approved')          return { ok: false, error: 'Sua conta ainda não foi aprovada pelo ADM.' };
    setSession(user, remember);
    return { ok: true, user };
  }

  function register({ name, email, password, confirmPassword }) {
    const store      = getLocalStore();
    const normalized = normalizeEmail(email);
    if (!name || !normalized || !password || !confirmPassword) return { ok: false, error: 'Preencha todos os campos.' };
    if (password !== confirmPassword) return { ok: false, error: 'A confirmação de senha não confere.' };
    if (store.users.some(u => u.email === normalized))        return { ok: false, error: 'Email já registrado.' };

    const isAdmin = normalized === ADMIN_EMAIL;
    const newUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalized,
      password,
      role:           isAdmin ? 'admin'    : 'player',
      status:         isAdmin ? 'approved' : 'pending',
      versions:       isAdmin ? ['v1', 'v2', 'v3'] : [],
      assignedSheets: [],
      createdAt: now()
    };

    store.users.push(newUser);
    saveLocalStore(store);
    fbAddToCollection('users', newUser.id, newUser); // persist to Firebase

    return {
      ok: true,
      message: isAdmin
        ? 'Conta ADM registrada e aprovada automaticamente.'
        : 'Registro enviado. Aguarde aprovação do ADM.'
    };
  }

  /* ─── User management ─── */
  function updateUser(userId, patch) {
    const store = getLocalStore();
    const idx   = store.users.findIndex(u => u.id === userId);
    if (idx < 0) return false;
    store.users[idx] = { ...store.users[idx], ...patch };
    saveLocalStore(store);
    fbPatch(userId, patch); // persist to Firebase
    return true;
  }

  function deleteUser(userId) {
    const store = getLocalStore();
    const user  = store.users.find(u => u.id === userId);
    if (!user || user.email === ADMIN_EMAIL) return false;
    store.users = store.users.filter(u => u.id !== userId);
    saveLocalStore(store);
    fbDelete(userId); // persist to Firebase
    return true;
  }

  function changeUserPassword(targetUserId, newPassword, actorUserId) {
    const store   = getLocalStore();
    const session = getSession();
    const actorId = actorUserId || (session ? session.userId : null);
    const actor   = store.users.find(u => u.id === actorId);
    if (!actor || actor.role !== 'admin') return { ok: false, error: 'Apenas o ADM pode alterar senhas.' };

    const password = (newPassword || '').trim();
    if (password.length < 4) return { ok: false, error: 'A nova senha deve ter ao menos 4 caracteres.' };

    const target = store.users.find(u => u.id === targetUserId);
    if (!target) return { ok: false, error: 'Usuário não encontrado.' };

    target.password = password;
    saveLocalStore(store);
    fbPatch(targetUserId, { password }); // persist to Firebase
    return { ok: true };
  }

  /* ─── Sheet management ─── */
  function createSheet({ name, photo, url, version }) {
    const store = getLocalStore();
    const sheet = {
      id: crypto.randomUUID(),
      name: name.trim(),
      photo: photo || '🗂️',
      url: url.trim(),
      version: version || 'v3'
    };
    store.sheets.push(sheet);
    saveLocalStore(store);
    fbAddToCollection('sheets', sheet.id, sheet); // persist to Firebase
    return sheet;
  }

  function attachSheetToUser(userId, sheetId) {
    const store = getLocalStore();
    const user  = store.users.find(u => u.id === userId);
    if (!user) return false;
    user.assignedSheets = Array.isArray(user.assignedSheets) ? user.assignedSheets : [];
    if (!user.assignedSheets.includes(sheetId)) user.assignedSheets.push(sheetId);
    saveLocalStore(store);
    fbPatch(userId, { assignedSheets: user.assignedSheets }); // persist to Firebase
    return true;
  }

  /* ─── Route guard ─── */
  function requireAuth(version) {
    const user = currentUser();
    if (!user) { window.location.href = 'index.html'; return; }
    if (version && user.role !== 'admin' && !user.versions.includes(version)) {
      alert('Você não tem acesso a esta versão.');
      window.location.href = 'index.html';
    }
  }

  function initGuardFromDOM() {
    const body = document.body;
    if (body?.dataset.requireAuth === 'true') requireAuth(body.dataset.requiredVersion || null);
  }

  /* ─── Public API ─── */
  function getStore() { return getLocalStore(); }
  function saveStore(store) {
    saveLocalStore(store);
    if (db) _set(_ref(db, DB_PATH), storeToFirebase(store)).catch(console.error);
  }

  window.EDAuth = {
    ADMIN_EMAIL,
    getStore, saveStore,
    currentUser, getSession,
    login, register, logout,
    updateUser, deleteUser, changeUserPassword,
    requireAuth, initGuardFromDOM,
    createSheet, attachSheetToUser
  };

  document.addEventListener('DOMContentLoaded', initGuardFromDOM);

  // Start Firebase in background — doesn't block page rendering
  initFirebase();
})();
