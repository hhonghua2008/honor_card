(function () {
  const KEY = 'hc_plan_v1';
  const FREE_COUNT = 10;
  const FREE_BATCH = 10;
  const PRO_BATCH = 500;

  // 演示激活码（正式环境应服务端校验）
  const ACTIVATION_CODES = {
    'HONORPRO2026': 365,
    'BETA30': 30,
    'TEAM7': 7
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('hc-plan-change'));
  }

  function isPro() {
    const d = load();
    if (d.teamUntil && d.teamUntil > Date.now()) return true;
    if (d.proUntil && d.proUntil > Date.now()) return true;
    if (d.lifetime) return true;
    return false;
  }

  function isTeam() {
    const d = load();
    return !!(d.teamUntil && d.teamUntil > Date.now());
  }

  function applyServerEntitlements(user) {
    if (!user) return;
    const d = load();
    if (user.proUntil) d.proUntil = Math.max(d.proUntil || 0, user.proUntil);
    if (user.teamUntil) d.teamUntil = Math.max(d.teamUntil || 0, user.teamUntil);
    save(d);
  }

  function proUntil() {
    const d = load();
    return d.proUntil || 0;
  }

  function freeTemplateIds() {
    return (window.HC_TEMPLATES || []).slice(0, FREE_COUNT).map(t => t.id);
  }

  function isTemplateFree(id) {
    return freeTemplateIds().includes(id);
  }

  function canUseTemplate(id) {
    return isPro() || isTemplateFree(id);
  }

  function batchLimit() {
    return isPro() ? PRO_BATCH : FREE_BATCH;
  }

  function needsWatermark() {
    return !isPro();
  }

  function canExportHQ() {
    return isPro();
  }

  function activateCode(code) {
    const days = ACTIVATION_CODES[(code || '').trim().toUpperCase()];
    if (!days) return { ok: false, msg: '激活码无效或已过期' };
    const isTeamCode = (code || '').trim().toUpperCase() === 'TEAM7';
    const d = load();
    const base = Math.max(d.proUntil || 0, d.teamUntil || 0, Date.now());
    if (isTeamCode) d.teamUntil = base + days * 86400000;
    else d.proUntil = base + days * 86400000;
    d.activatedAt = Date.now();
    d.code = code.trim().toUpperCase();
    save(d);
    return { ok: true, msg: (isTeamCode ? 'Team' : 'Pro') + ' 已激活 ' + days + ' 天', until: isTeamCode ? d.teamUntil : d.proUntil };
  }

  async function activateCodeRemote(code) {
    if (!window.HC_API || !window.HC_API.enabled() || !window.HC_Auth || !window.HC_Auth.isLoggedIn()) {
      return activateCode(code);
    }
    const r = await window.HC_API.post('/activate', { code });
    if (r.ok && r.user) applyServerEntitlements(r.user);
    return r.ok ? { ok: true, msg: r.msg || '激活成功' } : { ok: false, msg: r.msg || '激活失败' };
  }

  function planLabel() {
    if (isTeam()) return 'Team · ' + Math.ceil((load().teamUntil - Date.now()) / 86400000) + '天';
    if (!isPro()) return 'Free';
    const u = proUntil();
    if (u > Date.now() + 3650 * 86400000) return 'Pro';
    const days = Math.ceil((u - Date.now()) / 86400000);
    return 'Pro · ' + days + '天';
  }

  function renderProBadge(el) {
    if (!el) return;
    el.innerHTML = isPro()
      ? '<span class="pro-badge active">' + planLabel() + '</span>'
      : '<a href="#/pricing" class="pro-badge upgrade">升级 Pro</a>';
  }

  window.HC_Plan = {
    isPro, isTeam, proUntil, planLabel, activateCode, activateCodeRemote, applyServerEntitlements,
    freeTemplateIds, isTemplateFree, canUseTemplate,
    batchLimit, needsWatermark, canExportHQ, renderProBadge,
    FREE_COUNT, FREE_BATCH, PRO_BATCH
  };
})();
