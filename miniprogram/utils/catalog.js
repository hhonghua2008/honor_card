const catalogData = require('../data/catalog.json');
const { h5Base, apiBase } = require('./config');

function assetUrl(rel) {
  if (!rel) return '';
  if (/^https?:\/\//.test(rel)) return rel;
  return h5Base.replace(/\/$/, '') + '/' + rel.replace(/^\//, '');
}

function withUrls(t) {
  return Object.assign({}, t, {
    thumbUrl: assetUrl(t.thumb),
    bgUrl: assetUrl(t.bg)
  });
}

function loadBuiltin() {
  return (catalogData.templates || []).map(withUrls);
}

function getById(id) {
  const t = (catalogData.templates || []).find(x => x.id === id);
  return t ? withUrls(t) : null;
}

function filterList(list, scene, orient, keyword) {
  let out = list.slice();
  if (scene && scene !== 'all') out = out.filter(t => t.scene === scene);
  if (orient === 'portrait') out = out.filter(t => !t.landscape);
  if (orient === 'landscape') out = out.filter(t => t.landscape);
  if (keyword) {
    const q = keyword.trim().toLowerCase();
    if (q) {
      out = out.filter(t =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.sceneLabel && t.sceneLabel.toLowerCase().includes(q))
      );
    }
  }
  return out;
}

function countByScene(list) {
  const m = { all: list.length };
  list.forEach(t => { m[t.scene] = (m[t.scene] || 0) + 1; });
  return m;
}

function countByOrient(list) {
  return {
    all: list.length,
    portrait: list.filter(t => !t.landscape).length,
    landscape: list.filter(t => t.landscape).length
  };
}

function fetchRemoteCatalog() {
  return new Promise(resolve => {
    if (!apiBase) return resolve(null);
    wx.request({
      url: apiBase.replace(/\/$/, '') + '/api/v1/catalog',
      success: res => {
        if (!res.data || !res.data.ok || !res.data.catalog) return resolve(null);
        const disabled = new Set(res.data.catalog.disabled || []);
        resolve(loadBuiltin().filter(t => !disabled.has(t.id)));
      },
      fail: () => resolve(null)
    });
  });
}

module.exports = {
  loadBuiltin,
  getById,
  filterList,
  countByScene,
  countByOrient,
  fetchRemoteCatalog,
  assetUrl
};
