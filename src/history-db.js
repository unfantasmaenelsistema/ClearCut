/**
 * Historial local en IndexedDB: guarda el original y el recorte a resolución
 * completa (localStorage solo admite ~5 MB y obligaba a guardar miniaturas).
 * Nada sale del navegador; el usuario puede vaciarlo o desactivarlo.
 */

const DB_NAME = 'clearcut';
const STORE = 'history';
const LIMIT = 5;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then((r) => { result = r; });
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onerror = () => { db.close(); reject(t.error); };
    t.onabort = () => { db.close(); reject(t.error); };
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listHistory() {
  const all = await tx('readonly', (s) => reqToPromise(s.getAll()));
  return (all || []).sort((a, b) => b.timestamp - a.timestamp);
}

/** Añade una entrada y recorta a las últimas LIMIT. */
export async function addHistory(entry) {
  const current = await listHistory();
  const drop = current.slice(LIMIT - 1).map((e) => e.id);
  await tx('readwrite', (s) => {
    drop.forEach((id) => s.delete(id));
    s.put(entry);
  });
}

export async function deleteHistory(id) {
  await tx('readwrite', (s) => { s.delete(id); });
}

export async function clearHistory() {
  await tx('readwrite', (s) => { s.clear(); });
}
