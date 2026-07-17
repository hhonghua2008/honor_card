const catalogData = require('../data/catalog.json');
const { h5Base, apiBase } = require('./config');

function withThumbUrl(list) {
  const base = h5Base.replace(/\/$/, '');
  return list.map(t => ({
    ...t,
    thumbUrl: base + '/' + t.thumb.replace(/^\//, '')
  }));
}

function loadBuiltin() {
  return withThumbUrl(catalogData.templates || []);
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
  list.forEach(t => {
    m[t.scene] = (m[t.scene] || 0) + 1;
  });
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
        let list = loadBuiltin().filter(t => !disabled.has(t.id));
        (res.data.catalog.custom || []).forEach(c => {
          if (!disabled.has(c.id)) {
            list.push({
              id: c.id,
              name: c.name,
              category: c.category || '自定义',
              scene: c.scene || 'campus',
              sceneLabel: c.sceneLabel || '自定义',
              landscape: !!c.landscape,
              thumb: c.thumb || '',
              thumbUrl: c.thumb ? h5Base.replace(/\/$/, '') + '/' + c.thumb : ''
            });
          }
        });
        resolve(list);
      },
      fail: () => resolve(null)
    });
  });
}

module.exports = {
  loadBuiltin,
  filterList,
  countByScene,
  countByOrient,
  fetchRemoteCatalog
};
