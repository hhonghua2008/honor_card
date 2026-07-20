(function () {
  const SYNC_KEY = 'hc_cloud_sync_v1';

  function canSync() {
    return window.HC_API && window.HC_API.enabled() && window.HC_Auth && window.HC_Auth.isLoggedIn();
  }

  function setStatus(status, msg) {
    const row = { status, msg, at: Date.now() };
    try { localStorage.setItem(SYNC_KEY, JSON.stringify(row)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('hc-cloud-status', { detail: row }));
    return row;
  }

  function getStatus() {
    try { return JSON.parse(localStorage.getItem(SYNC_KEY) || '{}'); } catch (e) { return {}; }
  }

  async function pushProject(proj) {
    if (!canSync()) return { ok: false, skipped: true };
    setStatus('syncing', '正在同步…');
    const r = await window.HC_API.put('/projects/' + encodeURIComponent(proj.id), {
      name: proj.name,
      templateId: proj.templateId,
      scene: proj.scene,
      thumb: proj.thumb,
      updatedAt: proj.updatedAt
    });
    if (r.ok) setStatus('ok', '已同步到云端');
    else setStatus('error', r.msg || '同步失败');
    return r;
  }

  async function pullProjects() {
    if (!canSync()) return [];
    const r = await window.HC_API.get('/projects');
    if (!r.ok || !Array.isArray(r.projects)) return [];
    return r.projects;
  }

  async function syncAll() {
    if (!canSync()) {
      setStatus('local', '仅本地保存（登录并配置 API 后可云同步）');
      return { ok: true, mode: 'local' };
    }
    setStatus('syncing', '正在同步项目…');
    try {
      const remote = await pullProjects();
      const local = await window.HC_Storage.all();
      const map = {};
      local.forEach(p => { map[p.id] = p; });
      remote.forEach(p => {
        const ex = map[p.id];
        if (!ex || (p.updatedAt || 0) > (ex.updatedAt || 0)) map[p.id] = p;
      });
      const merged = Object.values(map).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      for (const p of merged) {
        await window.HC_Storage.save(p);
        if (!remote.find(r => r.id === p.id) || (p.updatedAt || 0) > (remote.find(r => r.id === p.id).updatedAt || 0)) {
          await window.HC_API.put('/projects/' + encodeURIComponent(p.id), {
            name: p.name,
            templateId: p.templateId,
            scene: p.scene,
            thumb: p.thumb,
            updatedAt: p.updatedAt
          });
        }
      }
      setStatus('ok', '云端同步完成 · ' + merged.length + ' 个项目');
      return { ok: true, count: merged.length };
    } catch (e) {
      setStatus('error', e.message || '同步失败');
      return { ok: false, msg: e.message };
    }
  }

  async function removeRemote(id) {
    if (!canSync()) return;
    await window.HC_API.del('/projects/' + encodeURIComponent(id));
  }

  window.HC_Cloud = { pushProject, pullProjects, syncAll, removeRemote, canSync, getStatus, setStatus };
})();
