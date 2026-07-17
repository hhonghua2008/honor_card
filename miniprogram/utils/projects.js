const KEY = 'hc_mp_projects_v1';

function list() {
  try {
    const arr = wx.getStorageSync(KEY);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveAll(arr) {
  wx.setStorageSync(KEY, arr);
}

function upsert(proj) {
  const arr = list();
  const i = arr.findIndex(p => p.id === proj.id);
  const next = Object.assign({}, proj, {
    updatedAt: proj.updatedAt || Date.now()
  });
  if (i >= 0) arr[i] = next;
  else arr.unshift(next);
  saveAll(arr.slice(0, 40));
  return next;
}

function remove(id) {
  saveAll(list().filter(p => p.id !== id));
}

function get(id) {
  return list().find(p => p.id === id) || null;
}

module.exports = { list, upsert, remove, get };
