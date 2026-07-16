(function () {
  let original = null;
  let catalog = { disabled: [], overrides: {}, custom: [], order: null };

  function snapshotOriginal() {
    if (!original && window.HC_TEMPLATES) {
      original = window.HC_TEMPLATES.map(t => Object.assign({}, t));
    }
  }

  function mergeOne(t, overrides) {
    const o = overrides[t.id];
    if (!o) return t;
    return Object.assign({}, t, o);
  }

  function applyCatalog(cat) {
    snapshotOriginal();
    catalog = cat || catalog;
    const disabled = new Set(catalog.disabled || []);
    let list = (original || []).filter(t => !disabled.has(t.id)).map(t => mergeOne(t, catalog.overrides || {}));
    (catalog.custom || []).forEach(c => {
      if (!disabled.has(c.id)) list.push(c);
    });
    if (catalog.order && catalog.order.length) {
      const orderMap = {};
      catalog.order.forEach((id, i) => { orderMap[id] = i; });
      list.sort((a, b) => (orderMap[a.id] ?? 999) - (orderMap[b.id] ?? 999));
    }
    window.HC_TEMPLATES = list;
    window.dispatchEvent(new CustomEvent('hc-catalog-change'));
    return list;
  }

  async function fetchAndApply() {
    if (!window.HC_API || !window.HC_API.enabled()) return applyCatalog(catalog);
    const r = await window.HC_API.get('/catalog');
    if (r.ok && r.catalog) return applyCatalog(r.catalog);
    return applyCatalog(catalog);
  }

  function getAllTemplates() {
    snapshotOriginal();
    const disabled = new Set(catalog.disabled || []);
    const list = (original || window.HC_TEMPLATES || []).slice();
    (catalog.custom || []).forEach(c => { if (!list.find(x => x.id === c.id)) list.push(c); });
    return list;
  }

  window.HC_Catalog = { fetchAndApply, applyCatalog, getAllTemplates, getCatalog: () => catalog };
})();
