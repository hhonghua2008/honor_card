/**
 * 模板运营 — catalog 合并、上下架、自定义模板元数据
 */

function defaultCatalog() {
  return { disabled: [], overrides: {}, custom: [], order: null };
}

function getCatalog(db) {
  if (!db.catalog) db.catalog = defaultCatalog();
  return db.catalog;
}

function listPublicCatalog(db) {
  const cat = getCatalog(db);
  return {
    disabled: cat.disabled || [],
    overrides: cat.overrides || {},
    custom: cat.custom || [],
    order: cat.order || null,
    updatedAt: cat.updatedAt || null
  };
}

function applyCatalogOps(db, body) {
  const cat = getCatalog(db);
  if (Array.isArray(body.disabled)) cat.disabled = body.disabled;
  if (body.overrides && typeof body.overrides === 'object') cat.overrides = body.overrides;
  if (Array.isArray(body.custom)) cat.custom = body.custom;
  if (body.order === null || Array.isArray(body.order)) cat.order = body.order;
  cat.updatedAt = Date.now();
  db.catalog = cat;
  return cat;
}

function upsertCustomTemplate(db, tpl) {
  const cat = getCatalog(db);
  cat.custom = cat.custom || [];
  const i = cat.custom.findIndex(t => t.id === tpl.id);
  if (i >= 0) cat.custom[i] = Object.assign({}, cat.custom[i], tpl, { updatedAt: Date.now() });
  else cat.custom.push(Object.assign({}, tpl, { createdAt: Date.now(), updatedAt: Date.now() }));
  cat.updatedAt = Date.now();
  db.catalog = cat;
  return tpl;
}

function removeCustomTemplate(db, id) {
  const cat = getCatalog(db);
  cat.custom = (cat.custom || []).filter(t => t.id !== id);
  cat.updatedAt = Date.now();
  db.catalog = cat;
}

function toggleTemplate(db, id, enabled) {
  const cat = getCatalog(db);
  const set = new Set(cat.disabled || []);
  if (enabled) set.delete(id);
  else set.add(id);
  cat.disabled = Array.from(set);
  cat.updatedAt = Date.now();
  db.catalog = cat;
  return cat.disabled;
}

module.exports = {
  defaultCatalog, getCatalog, listPublicCatalog,
  applyCatalogOps, upsertCustomTemplate, removeCustomTemplate, toggleTemplate
};
