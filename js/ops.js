(function () {
  const KEY = 'hc_ops_key';

  function getOpsKey() {
    return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || '';
  }

  function setOpsKey(k) {
    sessionStorage.setItem(KEY, k);
    localStorage.setItem(KEY, k);
  }

  async function opsFetch(method, path, body, isForm) {
    const base = (window.HC_API_URL || '').replace(/\/$/, '');
    if (!base) return { ok: false, msg: '未配置 HC_API_URL' };
    const opts = {
      method,
      headers: { 'X-Ops-Key': getOpsKey() }
    };
    if (body && !isForm) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else if (body && isForm) {
      opts.body = body;
    }
    try {
      const res = await fetch(base + '/api/v1' + path, opts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, msg: data.error || 'HTTP ' + res.status };
      return Object.assign({ ok: true }, data);
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  function render(view) {
    if (!window.HC_API || !window.HC_API.enabled()) {
      view.innerHTML = '<div class="gallery"><p class="empty">模板运营需要配置 HC_API_URL 并启动 server/</p></div>';
      return;
    }

    if (!getOpsKey()) {
      view.innerHTML = `
        <div class="ops-page">
          <h1>模板运营后台</h1>
          <p>请输入 Ops API 密钥（与服务端 OPS_API_KEY 一致）</p>
          <div class="activate-row">
            <input type="password" id="opsKeyInp" class="hc-modal-input" placeholder="honorcard-ops-dev">
            <button class="btn primary" id="opsKeyBtn">进入</button>
          </div>
        </div>`;
      view.querySelector('#opsKeyBtn').onclick = () => {
        setOpsKey(view.querySelector('#opsKeyInp').value);
        render(view);
      };
      return;
    }

    loadAndRender(view);
  }

  async function loadAndRender(view) {
    const cat = await opsFetch('GET', '/ops/catalog');
    if (!cat.ok) {
      view.innerHTML = `<div class="ops-page"><p class="empty">${cat.msg}</p>
        <button class="btn" id="opsRetry">重试</button></div>`;
      view.querySelector('#opsRetry').onclick = () => render(view);
      return;
    }

    const list = window.HC_Catalog.getAllTemplates();
    const disabled = new Set(cat.catalog.disabled || []);

    view.innerHTML = `
      <div class="ops-page">
        <div class="ops-head">
          <h1>模板运营</h1>
          <div class="ops-head-actions">
            <a href="#/admin" class="btn ghost">转化看板</a>
            <button class="btn" id="opsRefresh">刷新</button>
          </div>
        </div>
        <p class="admin-note">上下架即时生效（需用户刷新画廊）。自定义模板需上传背景图。</p>
        <table class="admin-table ops-table">
          <thead><tr><th>ID</th><th>名称</th><th>分类</th><th>状态</th><th>操作</th></tr></thead>
          <tbody id="opsTplBody"></tbody>
        </table>
        <section class="ops-add">
          <h2>新增自定义模板</h2>
          <form id="opsAddForm" class="ops-form">
            <label>ID<input name="id" required placeholder="tpl-custom-01"></label>
            <label>名称<input name="name" required placeholder="春季限定"></label>
            <label>背景图 URL<input name="bg" placeholder="上传后自动填入"></label>
            <label>上传背景<input type="file" name="file" accept="image/*"></label>
            <label>复制布局自
              <select name="baseId">${list.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
            </label>
            <label>场景
              <select name="sceneCategory">
                <option value="campus">校园</option><option value="corporate">企业</option>
                <option value="activity">活动</option><option value="festival">节日</option><option value="photo">照片</option>
              </select>
            </label>
            <button type="submit" class="btn primary">创建</button>
          </form>
        </section>
      </div>`;

    const tbody = view.querySelector('#opsTplBody');
    tbody.innerHTML = list.map(t => {
      const on = !disabled.has(t.id);
      return `<tr>
        <td><code>${t.id}</code></td>
        <td>${t.name}</td>
        <td>${t.category || ''}</td>
        <td>${on ? '<span class="ops-on">上架</span>' : '<span class="ops-off">下架</span>'}</td>
        <td><button class="btn ghost ops-toggle" data-id="${t.id}" data-on="${on ? '1' : '0'}">${on ? '下架' : '上架'}</button></td>
      </tr>`;
    }).join('');

    view.querySelector('#opsRefresh').onclick = () => loadAndRender(view);
    view.querySelectorAll('.ops-toggle').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const enabled = btn.dataset.on !== '1';
        const r = await opsFetch('POST', '/ops/templates/' + encodeURIComponent(id) + '/toggle', { enabled });
        if (r.ok) {
          window.HC_UI.toast(enabled ? '已上架' : '已下架', 'success');
          await window.HC_Catalog.fetchAndApply();
          loadAndRender(view);
        } else window.HC_UI.toast(r.msg, 'error');
      };
    });

    const fileInp = view.querySelector('input[name=file]');
    fileInp.onchange = async () => {
      const f = fileInp.files[0];
      if (!f) return;
      const fd = new FormData();
      fd.append('file', f);
      const r = await opsFetch('POST', '/ops/upload', fd, true);
      if (r.ok) {
        view.querySelector('input[name=bg]').value = (window.HC_API_URL || '').replace(/\/$/, '') + r.url;
        window.HC_UI.toast('上传成功', 'success');
      } else window.HC_UI.toast(r.msg, 'error');
    };

    view.querySelector('#opsAddForm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const base = list.find(t => t.id === fd.get('baseId'));
      if (!base) return;
      const bg = fd.get('bg');
      const tpl = {
        id: fd.get('id'),
        name: fd.get('name'),
        sceneCategory: fd.get('sceneCategory'),
        bg: bg,
        bgFallback: bg,
        thumb: bg,
        category: base.category,
        tags: (base.tags || []).concat(['自定义']),
        canvas: base.canvas,
        themePresets: base.themePresets,
        layers: base.layers,
        layoutArchetype: base.layoutArchetype || 'classic'
      };
      const r = await opsFetch('POST', '/ops/templates', tpl);
      if (r.ok) {
        window.HC_UI.toast('模板已创建', 'success');
        await window.HC_Catalog.fetchAndApply();
        e.target.reset();
        loadAndRender(view);
      } else window.HC_UI.toast(r.msg, 'error');
    };
  }

  window.HC_Ops = { render, getOpsKey, setOpsKey };
})();
