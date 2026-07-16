(function () {
  const DB_NAME = 'honorcard_v1';
  const STORE = 'projects';
  const LS_KEY = 'hc_projects_v1';
  const MAX_BYTES = 50 * 1024 * 1024;
  let dbPromise = null;
  let ready = false;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('NO_IDB'));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(mode) {
    return openDB().then(db => {
      const t = db.transaction(STORE, mode);
      return { store: t.objectStore(STORE), tx: t };
    });
  }

  function promisify(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function estimateSize(obj) {
    try { return new Blob([JSON.stringify(obj)]).size; } catch (e) { return 0; }
  }

  async function migrateFromLS() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list) || !list.length) return;
      const { store, tx } = await tx('readwrite');
      for (const p of list) {
        store.put(p);
      }
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
      localStorage.removeItem(LS_KEY);
    } catch (e) { /* migration best-effort */ }
  }

  async function init() {
    if (ready) return;
    await openDB();
    await migrateFromLS();
    ready = true;
  }

  async function all() {
    await init();
    const { store, tx } = await tx('readonly');
    const list = await promisify(store.getAll());
    await new Promise(res => { tx.oncomplete = res; });
    return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async function get(id) {
    await init();
    const { store, tx } = await tx('readonly');
    const item = await promisify(store.get(id));
    await new Promise(res => { tx.oncomplete = res; });
    return item;
  }

  async function save(proj) {
    await init();
    proj.updatedAt = Date.now();
    const size = estimateSize(proj);
    if (size > MAX_BYTES) {
      const err = new Error('QUOTA');
      err.size = size;
      throw err;
    }
    const { store, tx } = await tx('readwrite');
    store.put(proj);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    return proj;
  }

  async function remove(id) {
    await init();
    const { store, tx } = await tx('readwrite');
    store.delete(id);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }

  async function quota() {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      return { used: est.usage || 0, quota: est.quota || 0 };
    }
    return { used: 0, quota: 0 };
  }

  // sync wrappers for backward compat (editor uses sync get in route - fix in app.js)
  window.HC_Storage = {
    init,
    all, get, save, remove, quota, estimateSize,
    allSync: () => { throw new Error('Use HC_Storage.all() async'); }
  };
})();
