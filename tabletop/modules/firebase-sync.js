// Sincronização com Firebase Realtime Database para o módulo Tabletop
import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
  getDatabase, ref, onValue, set, update, push, remove, off
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import {
  getStorage, ref as storRef, uploadBytesResumable, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

let _db, _storage;

export function initFirebase() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  _db = getDatabase(app);
  _storage = getStorage(app);
  return { db: _db, storage: _storage };
}

// ── Tokens ────────────────────────────────────────────────────────────────────

export function listenTokens(campanhaId, cb) {
  const r = ref(_db, `tabletop_v3/${campanhaId}/tokens`);
  onValue(r, s => cb(s.val() || {}));
  return () => off(r);
}

export function saveToken(campanhaId, tokenId, data) {
  return set(ref(_db, `tabletop_v3/${campanhaId}/tokens/${tokenId}`), data);
}

export function patchToken(campanhaId, tokenId, fields) {
  return update(ref(_db, `tabletop_v3/${campanhaId}/tokens/${tokenId}`), fields);
}

export function deleteToken(campanhaId, tokenId) {
  return remove(ref(_db, `tabletop_v3/${campanhaId}/tokens/${tokenId}`));
}

export function pushToken(campanhaId, data) {
  return push(ref(_db, `tabletop_v3/${campanhaId}/tokens`), data);
}

// ── Configuração do mapa ──────────────────────────────────────────────────────

export function listenMapConfig(campanhaId, cb) {
  const r = ref(_db, `tabletop_v3/${campanhaId}/config`);
  onValue(r, s => cb(s.val() || {}));
  return () => off(r);
}

export function saveMapConfig(campanhaId, data) {
  return update(ref(_db, `tabletop_v3/${campanhaId}/config`), data);
}

// ── Fog of War ────────────────────────────────────────────────────────────────

export function listenFog(campanhaId, cb) {
  const r = ref(_db, `tabletop_v3/${campanhaId}/fog`);
  onValue(r, s => cb(s.val() || {}));
  return () => off(r);
}

export function saveFog(campanhaId, fogData) {
  return set(ref(_db, `tabletop_v3/${campanhaId}/fog`), fogData);
}

// ── Iniciativa ────────────────────────────────────────────────────────────────

export function listenInitiative(campanhaId, cb) {
  const r = ref(_db, `tabletop_v3/${campanhaId}/iniciativa`);
  onValue(r, s => cb(s.val() || []));
  return () => off(r);
}

export function saveInitiative(campanhaId, data) {
  return set(ref(_db, `tabletop_v3/${campanhaId}/iniciativa`), data);
}

// ── Pings efêmeros (Realtime Database) ───────────────────────────────────────

export function sendPing(campanhaId, pingData) {
  return push(ref(_db, `tabletop_v3_pings/${campanhaId}`), { ...pingData, ts: Date.now() });
}

export function listenPings(campanhaId, cb) {
  const r = ref(_db, `tabletop_v3_pings/${campanhaId}`);
  onValue(r, s => {
    const val = s.val();
    if (!val) return;
    const pings = Object.values(val);
    const recente = pings.filter(p => Date.now() - p.ts < 4000);
    if (recente.length) cb(recente[recente.length - 1]);
  });
  return () => off(r);
}

// ── Upload de arquivo para Storage ───────────────────────────────────────────

export function uploadFile(caminho, arquivo, onProgresso) {
  return new Promise((resolve, reject) => {
    const sRef = storRef(_storage, caminho);
    const task = uploadBytesResumable(sRef, arquivo);
    task.on(
      'state_changed',
      snap => onProgresso && onProgresso((snap.bytesTransferred / snap.totalBytes) * 100),
      reject,
      () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject)
    );
  });
}
