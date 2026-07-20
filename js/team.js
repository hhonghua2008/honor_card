(function () {
  const KEY = 'hc_team_v1';
  const MAX_CODES = 5;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function isTeamAdmin() {
    return window.HC_Plan && window.HC_Plan.isTeam && window.HC_Plan.isTeam();
  }

  function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = 'HC-';
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function listCodes() {
    const d = load();
    return d.codes || [];
  }

  function createInvite() {
    if (!isTeamAdmin()) return { ok: false, msg: '需要 Team 会员' };
    const d = load();
    d.codes = d.codes || [];
    if (d.codes.filter(c => !c.used).length >= MAX_CODES) {
      return { ok: false, msg: '最多同时存在 ' + MAX_CODES + ' 个未使用邀请码' };
    }
    const code = genCode();
    d.codes.push({ code, createdAt: Date.now(), used: false });
    save(d);
    return { ok: true, code };
  }

  function redeemInvite(code) {
    const d = load();
    const row = (d.codes || []).find(c => c.code === code.trim().toUpperCase() && !c.used);
    if (!row) return { ok: false, msg: '邀请码无效或已使用' };
    row.used = true;
    row.usedAt = Date.now();
    save(d);
    if (window.HC_Plan) {
      const r = window.HC_Plan.activateCode('BETA30');
      return r.ok ? { ok: true, msg: '已加入 Team，Pro 权益已开通 30 天' } : r;
    }
    return { ok: true, msg: '邀请码已核销' };
  }

  function render(view) {
    if (!isTeamAdmin()) {
      view.innerHTML = `<div class="gallery">
        <div class="gallery-head"><h1>Team 管理</h1></div>
        <p class="empty">Team 版专属功能。请使用 Team 激活码（如 TEAM7）开通后访问。</p>
        <a href="#/pricing" class="btn primary">了解 Team 方案</a>
      </div>`;
      return;
    }

    const codes = listCodes();
    view.innerHTML = `
      <div class="team-page">
        <h1>Team 管理</h1>
        <p>为团队成员生成 Pro 邀请码（演示模式：每码开通 30 天 Pro）。正式环境由服务端统一发码。</p>
        <div class="team-actions">
          <button class="btn primary" id="genCodeBtn">生成邀请码</button>
          <span class="team-limit">未使用 ${codes.filter(c => !c.used).length} / ${MAX_CODES}</span>
        </div>
        <table class="team-table">
          <thead><tr><th>邀请码</th><th>状态</th><th>创建时间</th></tr></thead>
          <tbody id="codeBody">${codes.length ? codes.map(c => `
            <tr><td><code>${c.code}</code></td><td>${c.used ? '已使用' : '可用'}</td>
            <td>${new Date(c.createdAt).toLocaleString()}</td></tr>`).join('') : '<tr><td colspan="3">暂无邀请码</td></tr>'}
          </tbody>
        </table>
        <section class="team-redeem">
          <h2>成员兑换邀请码</h2>
          <div class="activate-row">
            <input type="text" id="teamRedeem" class="hc-modal-input" placeholder="输入 HC-XXXXXXXX">
            <button class="btn" id="teamRedeemBtn">兑换</button>
          </div>
        </section>
      </div>`;

    view.querySelector('#genCodeBtn').onclick = () => {
      const r = createInvite();
      if (r.ok) {
        window.HC_UI.toast('已生成：' + r.code, 'success');
        render(view);
      } else window.HC_UI.toast(r.msg, 'error');
    };
    view.querySelector('#teamRedeemBtn').onclick = () => {
      const r = redeemInvite(view.querySelector('#teamRedeem').value);
      window.HC_UI.toast(r.msg, r.ok ? 'success' : 'error');
    };
  }

  window.HC_Team = { render, createInvite, redeemInvite, listCodes, isTeamAdmin };
})();
