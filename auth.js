(function () {
  const STORAGE_KEY = 'ed_auth_v1';
  const SESSION_KEY = 'ed_session_v1';
  const ADMIN_EMAIL = 'referrey033@gmail.com';

  const SESSION_DAYS_DEFAULT = 3;
  const SESSION_DAYS_REMEMBER = 15;

  const defaultSheets = [
    { id: 'v1_ficha', name: 'Ficha ED v1', photo: '🧾', url: 'ed_sistemav1_ficha.html', version: 'v1' },
    { id: 'v2_ficha', name: 'Ficha ED v2', photo: '📘', url: 'ed_sistemav2_ficha.html', version: 'v2' },
    { id: 'v3_ficha_base', name: 'Ficha ED v3 - Base', photo: '🎭', url: 'ed_sistemav3_painelcentral.html', version: 'v3' }
  ];

  function now() { return Date.now(); }
  function normalizeEmail(email) { return (email || '').trim().toLowerCase(); }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getStore() {
    const store = readJSON(STORAGE_KEY, { users: [], sheets: defaultSheets });
    if (!Array.isArray(store.users)) store.users = [];
    if (!Array.isArray(store.sheets)) store.sheets = [...defaultSheets];

    let admin = store.users.find((u) => u.email === ADMIN_EMAIL);
    if (!admin) {
      admin = {
        id: crypto.randomUUID(),
        name: 'Administrador',
        email: ADMIN_EMAIL,
        password: 'admin123',
        role: 'admin',
        status: 'approved',
        versions: ['v1', 'v2', 'v3'],
        assignedSheets: ['v1_ficha', 'v2_ficha', 'v3_ficha_base'],
        createdAt: now()
      };
      store.users.push(admin);
      writeJSON(STORAGE_KEY, store);
    }
    return store;
  }

  function saveStore(store) { writeJSON(STORAGE_KEY, store); }

  function getSession() {
    const session = readJSON(SESSION_KEY, null);
    if (!session) return null;
    if (session.expiresAt < now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  }

  function currentUser() {
    const session = getSession();
    if (!session) return null;
    const store = getStore();
    return store.users.find((u) => u.id === session.userId) || null;
  }

  function setSession(user, remember) {
    const days = remember ? SESSION_DAYS_REMEMBER : SESSION_DAYS_DEFAULT;
    const expiresAt = now() + days * 24 * 60 * 60 * 1000;
    writeJSON(SESSION_KEY, { userId: user.id, expiresAt, remember: !!remember });
  }

  function logout() { localStorage.removeItem(SESSION_KEY); }

  function login(email, password, remember) {
    const store = getStore();
    const normalized = normalizeEmail(email);
    const user = store.users.find((u) => u.email === normalized);

    if (!user || user.password !== password) {
      return { ok: false, error: 'Email ou senha inválidos.' };
    }
    if (user.status !== 'approved') {
      return { ok: false, error: 'Sua conta ainda não foi aprovada pelo ADM.' };
    }
    setSession(user, remember);
    return { ok: true, user };
  }

  function register({ name, email, password, confirmPassword }) {
    const store = getStore();
    const normalized = normalizeEmail(email);
    if (!name || !normalized || !password || !confirmPassword) {
      return { ok: false, error: 'Preencha todos os campos.' };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: 'A confirmação de senha não confere.' };
    }
    if (store.users.some((u) => u.email === normalized)) {
      return { ok: false, error: 'Email já registrado.' };
    }

    const isAdmin = normalized === ADMIN_EMAIL;
    const newUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalized,
      password,
      role: isAdmin ? 'admin' : 'player',
      status: isAdmin ? 'approved' : 'pending',
      versions: isAdmin ? ['v1', 'v2', 'v3'] : [],
      assignedSheets: [],
      createdAt: now()
    };

    store.users.push(newUser);
    saveStore(store);
    return {
      ok: true,
      message: isAdmin
        ? 'Conta ADM registrada e aprovada automaticamente.'
        : 'Registro enviado. Aguarde aprovação do ADM.'
    };
  }

  function updateUser(userId, patch) {
    const store = getStore();
    const idx = store.users.findIndex((u) => u.id === userId);
    if (idx < 0) return false;
    store.users[idx] = { ...store.users[idx], ...patch };
    saveStore(store);
    return true;
  }

  function deleteUser(userId) {
    const store = getStore();
    const user = store.users.find((u) => u.id === userId);
    if (!user || user.email === ADMIN_EMAIL) return false;
    store.users = store.users.filter((u) => u.id !== userId);
    saveStore(store);
    return true;
  }

  function changeUserPassword(targetUserId, newPassword, actorUserId) {
    const store = getStore();
    const session = getSession();
    const actorId = actorUserId || (session ? session.userId : null);
    const actor = store.users.find((u) => u.id === actorId);
    if (!actor || actor.role !== 'admin') {
      return { ok: false, error: 'Apenas o ADM pode alterar senhas.' };
    }

    const password = (newPassword || '').trim();
    if (password.length < 4) {
      return { ok: false, error: 'A nova senha deve ter ao menos 4 caracteres.' };
    }

    const target = store.users.find((u) => u.id === targetUserId);
    if (!target) {
      return { ok: false, error: 'Usuário não encontrado.' };
    }

    target.password = password;
    saveStore(store);
    return { ok: true };
  }

  function createSheet({ name, photo, url, version }) {
    const store = getStore();
    const sheet = {
      id: crypto.randomUUID(),
      name: name.trim(),
      photo: photo || '🗂️',
      url: url.trim(),
      version: version || 'v3'
    };
    store.sheets.push(sheet);
    saveStore(store);
    return sheet;
  }

  function attachSheetToUser(userId, sheetId) {
    const store = getStore();
    const user = store.users.find((u) => u.id === userId);
    if (!user) return false;
    user.assignedSheets = Array.isArray(user.assignedSheets) ? user.assignedSheets : [];
    if (!user.assignedSheets.includes(sheetId)) user.assignedSheets.push(sheetId);
    saveStore(store);
    return true;
  }

  function requireAuth(version) {
    const user = currentUser();
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    if (version && user.role !== 'admin' && !user.versions.includes(version)) {
      alert('Você não tem acesso a esta versão.');
      window.location.href = 'index.html';
    }
  }

  function initGuardFromDOM() {
    const body = document.body;
    if (!body) return;
    if (body.dataset.requireAuth === 'true') {
      requireAuth(body.dataset.requiredVersion || null);
    }
  }

  window.EDAuth = {
    ADMIN_EMAIL,
    getStore,
    saveStore,
    currentUser,
    getSession,
    login,
    register,
    logout,
    updateUser,
    deleteUser,
    changeUserPassword,
    requireAuth,
    initGuardFromDOM,
    createSheet,
    attachSheetToUser
  };

  document.addEventListener('DOMContentLoaded', initGuardFromDOM);
})();
