(function () {
  const PIN_KEY = 'hc_admin_pin';

  function checkPin() {
    const saved = localStorage.getItem(PIN_KEY);
    if (!saved) return true;
    const input = sessionStorage.getItem('hc_admin_session');
    return input === saved;
  }

  async function ensureAccess() {
    if (checkPin()) return true;
    const pin = await window.HC_UI.prompt('请输入管理 PIN', '');
    if (pin === null) return false;
    const saved = localStorage.getItem(PIN_KEY) || 'honor2026';
    if (pin !== saved) {
      window.HC_UI.toast('PIN 错误', 'error');
      return false;
    }
    sessionStorage.setItem('hc_admin_session', pin);
    return true;
  }

  function funnel(events) {
    const steps = [
      { key: 'landing_view', label: '落地页' },
      { key: 'gallery_view', label: '模板画廊' },
      { key: 'template_select', label: '选择模板' },
      { key: 'editor_open', label: '进入编辑器' },
      { key: 'export_png', label: '导出 PNG' },
      { key: 'pricing_view', label: '定价页' },
      { key: 'pro_activated', label: 'Pro 激活' }
    ];
    const base = events.filter(e => e.event === 'landing_view').length || 1;
    return steps.map(s => ({
      label: s.label,
      count: events.filter(e => e.event === s.key).length,
      rate: Math.round(1000 * events.filter(e => e.event === s.key).length / base) / 10
    }));
  }

  function render(view) {
    ensureAccess().then(ok => {
      if (!ok) {
        view.innerHTML = '<p class="empty">需要管理 PIN 才能查看看板</p>';
        return;
      }
      const events = window.HC_Analytics ? window.HC_Analytics.getEvents() : [];
      const steps = funnel(events);
      const recent = events.slice(-15).reverse();
      view.innerHTML = `
        <div class="admin-page">
          <h1>转化漏斗看板</h1>
          <p class="admin-note">数据来自本机 Analytics 事件（localStorage）。配置 GA4 后可同步至 Google Analytics。
            <a href="#/ops">模板运营 →</a></p>
          <table class="admin-table">
            <thead><tr><th>步骤</th><th>次数</th><th>相对落地页</th></tr></thead>
            <tbody>${steps.map(s => `<tr><td>${s.label}</td><td>${s.count}</td><td>${s.rate}%</td></tr>`).join('')}</tbody>
          </table>
          <h2>最近事件</h2>
          <ul class="admin-events">${recent.map(e =>
            `<li><time>${new Date(e.t).toLocaleString()}</time> ${e.event} <small>${JSON.stringify(e.props || {})}</small></li>`
          ).join('') || '<li>暂无事件</li>'}</ul>
          <p class="admin-hint">默认 PIN：<code>honor2026</code> · 可在控制台执行 <code>localStorage.setItem('hc_admin_pin','你的PIN')</code> 修改</p>
        </div>`;
    });
  }

  window.HC_Admin = { render };
})();
