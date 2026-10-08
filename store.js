// Local library: every disc (video + cover + details) is saved in this
// browser's IndexedDB, so it stays on the iPad between visits.

const DB_NAME = "disc-library";
const STORE = "discs";
let dbPromise;

function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const library = {
  async all() {
    const list = (await run("readonly", (s) => s.getAll())) || [];
    return list.sort((a, b) => (a.order ?? a.created) - (b.order ?? b.created));
  },
  put: (record) => run("readwrite", (s) => s.put(record)),
  remove: (id) => run("readwrite", (s) => s.delete(id)),
};

// Ask the browser not to clear our storage when space runs low
export async function keepStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (_) { /* not supported */ }
}

export async function storageUsed() {
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  } catch (_) {
    return null;
  }
}
