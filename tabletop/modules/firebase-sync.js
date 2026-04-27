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

// ── Helpers internos ──────────────────────────────────────────────────────────

const r = path => ref(_db, path);

function listen(path, cb) {
  const rf = r(path);
  onValue(rf, s => cb(s.val()));
  return () => off(rf);
}

// ── Tokens ────────────────────────────────────────────────────────────────────

export const listenTokens   = (id, cb) => listen(`tabletop_v3/${id}/tokens`, v => cb(v || {}));
export const saveToken      = (id, tid, d) => set(r(`tabletop_v3/${id}/tokens/${tid}`), d);
export const patchToken     = (id, tid, d) => update(r(`tabletop_v3/${id}/tokens/${tid}`), d);
export const deleteToken    = (id, tid)    => remove(r(`tabletop_v3/${id}/tokens/${tid}`));
export const pushToken      = (id, d)      => push(r(`tabletop_v3/${id}/tokens`), d);

// ── Mapas na cena ─────────────────────────────────────────────────────────────

export const listenMapas  = (id, cb) => listen(`tabletop_v3/${id}/mapas`, v => cb(v || {}));
export const saveMapaItem = (id, mid, d) => set(r(`tabletop_v3/${id}/mapas/${mid}`), d);
export const patchMapaItem = (id, mid, d) => update(r(`tabletop_v3/${id}/mapas/${mid}`), d);
export const deleteMapaItem = (id, mid)   => remove(r(`tabletop_v3/${id}/mapas/${mid}`));
export const pushMapaItem   = (id, d)     => push(r(`tabletop_v3/${id}/mapas`), d);

// ── Configuração da cena ──────────────────────────────────────────────────────

export const listenConfig  = (id, cb) => listen(`tabletop_v3/${id}/config`, v => cb(v || {}));
export const saveConfig    = (id, d)  => update(r(`tabletop_v3/${id}/config`), d);

// ── Fog of War ────────────────────────────────────────────────────────────────

export const listenFog = (id, cb) => listen(`tabletop_v3/${id}/fog`, v => cb(v || {}));
export const saveFog   = (id, d)  => set(r(`tabletop_v3/${id}/fog`), d);

// ── Itens de cenário ──────────────────────────────────────────────────────────

export const listenItens  = (id, cb) => listen(`tabletop_v3/${id}/itens`, v => cb(v || {}));
export const saveItem     = (id, iid, d) => set(r(`tabletop_v3/${id}/itens/${iid}`), d);
export const patchItem    = (id, iid, d) => update(r(`tabletop_v3/${id}/itens/${iid}`), d);
export const deleteItem   = (id, iid)    => remove(r(`tabletop_v3/${id}/itens/${iid}`));
export const pushItem     = (id, d)      => push(r(`tabletop_v3/${id}/itens`), d);

// ── Biblioteca (assets + pastas) ──────────────────────────────────────────────

export const listenBiblioteca = (id, cb) => listen(`tabletop_v3/${id}/biblioteca`, v => cb(v || {}));

export const savePasta    = (id, pid, d)      => set(r(`tabletop_v3/${id}/biblioteca/pastas/${pid}`), d);
export const pushPasta    = (id, d)           => push(r(`tabletop_v3/${id}/biblioteca/pastas`), d);
export const deletePasta  = (id, pid)         => remove(r(`tabletop_v3/${id}/biblioteca/pastas/${pid}`));
export const patchPasta   = (id, pid, d)      => update(r(`tabletop_v3/${id}/biblioteca/pastas/${pid}`), d);

export const pushAsset    = (id, cat, d)      => push(r(`tabletop_v3/${id}/biblioteca/assets/${cat}`), d);
export const deleteAsset  = (id, cat, aid)    => remove(r(`tabletop_v3/${id}/biblioteca/assets/${cat}/${aid}`));
export const patchAsset   = (id, cat, aid, d) => update(r(`tabletop_v3/${id}/biblioteca/assets/${cat}/${aid}`), d);

// ── Pings efêmeros ────────────────────────────────────────────────────────────

export function sendPing(campanhaId, pingData) {
  return push(r(`tabletop_v3_pings/${campanhaId}`), { ...pingData, ts: Date.now() });
}

export function listenPings(campanhaId, cb) {
  const rf = r(`tabletop_v3_pings/${campanhaId}`);
  onValue(rf, s => {
    const val = s.val();
    if (!val) return;
    const recente = Object.values(val).filter(p => Date.now() - p.ts < 4000);
    if (recente.length) cb(recente[recente.length - 1]);
  });
  return () => off(rf);
}

// ── Upload para Storage com compressão opcional ───────────────────────────────

export function uploadFile(caminho, arquivo, onProgresso) {
  return new Promise((resolve, reject) => {
    const sRef = storRef(_storage, caminho);
    const task = uploadBytesResumable(sRef, arquivo);
    task.on(
      'state_changed',
      snap => onProgresso?.((snap.bytesTransferred / snap.totalBytes) * 100),
      reject,
      () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject)
    );
  });
}
