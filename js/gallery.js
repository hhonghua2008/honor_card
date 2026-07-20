(function () {
  function isLandscape(t) { return t.canvas.w > t.canvas.h; }

  function card(t) {
    const land = isLandscape(t) ? ' land' : '';
    const badge = isLandscape(t)
      ? '<span class="orient-badge land-badge">横版</span>'
      : '<span class="orient-badge port-badge">竖版</span>';
    const thumb = t.thumb || t.bg;
    const locked = window.HC_Plan && !window.HC_Plan.canUseTemplate(t.id);
    const lockBadge = locked ? '<span class="tpl-lock">Pro</span>' : '';
    return `<div class="tpl-card${locked ? ' locked' : ''}" data-id="${t.id}" data-scene="${t.sceneCategory || ''}">
      <div class="thumb${land}" data-tpl-id="${t.id}">
        <div class="thumb-bg" style="background-image:url('${thumb}')"></div>
        ${badge}${lockBadge}
      </div>
      <div class="tpl-meta">
        <div class="tpl-name">${t.name}</div>
        <div class="tpl-cat">${t.category}</div>
      </div>
    </div>`;
  }

  const FILTER_ORIENT_KEY = 'hc_gallery_orient';
  const FILTER_SCENE_KEY = 'hc_gallery_scene';

  function renderLegal(view, type) {
    const isPrivacy = type === 'privacy';
    view.innerHTML = `<div class="legal-page">
      <h1>${isPrivacy ? '隐私说明' : '使用条款'}</h1>
      ${isPrivacy ? `
        <p>HonorCard 是纯前端应用，您的照片与作品<strong>仅保存在本机浏览器</strong>中（IndexedDB），我们不会收集或上传任何用户数据。</p>
        <h2>数据存储</h2>
        <ul>
          <li>「我的项目」保存在浏览器本地，清除浏览器数据会导致项目丢失</li>
          <li>分享链接将作品信息编码在 URL 中，请勿分享给不信任的人</li>
          <li>分享链接默认<strong>不含照片</strong>，接收方需自行上传</li>
        </ul>
        <h2>照片处理</h2>
        <p>您上传的照片仅在本地用于渲染奖状，不会发送至任何服务器。</p>
      ` : `
        <p>HonorCard 按「现状」提供奖状模板与编辑工具，仅供个人、教育及非商业场景使用。</p>
        <h2>用户责任</h2>
        <ul>
          <li>您对上传照片的内容及最终作品负责</li>
          <li>请勿利用本工具制作虚假、侵权或违法内容</li>
        </ul>
        <h2>模板与字体</h2>
        <p>模板背景为原创或 AI 生成素材。导出为位图，字体使用系统字体栈。</p>
        <h2>免责声明</h2>
        <p>因使用本工具产生的任何纠纷，运营方不承担法律责任。</p>
      `}
      <p><a href="#/templates">← 返回模板</a></p>
    </div>`;
  }

  function render(view) {
    const list = window.HC_TEMPLATES;
    const cats = window.HC_SCENE_CATEGORIES || {};
    const savedOrient = localStorage.getItem(FILTER_ORIENT_KEY) || 'all';
    const savedScene = localStorage.getItem(FILTER_SCENE_KEY) || 'all';

    const sceneCounts = {};
    list.forEach(t => {
      const s = t.sceneCategory || 'campus';
      sceneCounts[s] = (sceneCounts[s] || 0) + 1;
    });

    const sceneBtns = Object.keys(cats).filter(k => k !== 'all' && (sceneCounts[k] || 0) > 0).map(k =>
      `<button class="filter-btn scene-btn" data-scene="${k}">${cats[k]} (${sceneCounts[k] || 0})</button>`
    ).join('');

    view.innerHTML = `
      <div class="gallery">
        <div class="gallery-head">
          <h1>选择奖状模板</h1>
          <p>温暖喜庆 · 自由编辑文字与照片 · 自定义签章 · 一键下载 / 分享</p>
          ${window.HC_Plan && !window.HC_Plan.isPro() ? '<p class="gallery-pro-hint">Free 可用前 ' + window.HC_Plan.FREE_COUNT + ' 套 · <a href="#/pricing">升级 Pro</a> 解锁全部 ' + list.length + ' 套</p>' : ''}
          <div class="search-bar">
            <input type="search" id="gallerySearch" placeholder="搜索模板，如：红金、企业、照片、小熊…">
          </div>
          <div class="filter-bar filter-scene">
            <button class="filter-btn scene-btn" data-scene="all">全部 (${list.length})</button>
            ${sceneBtns}
          </div>
          <div class="filter-bar filter-orient">
            <button class="filter-btn orient-btn" data-orient="all">全部方向</button>
            <button class="filter-btn orient-btn" data-orient="port">竖版 (${list.filter(t=>!isLandscape(t)).length})</button>
            <button class="filter-btn orient-btn" data-orient="land">横版 (${list.filter(t=>isLandscape(t)).length})</button>
          </div>
        </div>
        <div class="grid" id="tplGrid">${list.map(card).join('')}</div>
        <p class="empty search-empty" id="searchEmpty" style="display:none">未找到匹配模板，试试其他关键词</p>
      </div>`;

    let sceneFilter = savedScene;
    let orientFilter = savedOrient;
    let searchQuery = '';

    function countMatching(scene, orient) {
      return list.filter(t => {
        const land = isLandscape(t);
        const matchScene = scene === 'all' || t.sceneCategory === scene;
        const matchOrient = orient === 'all'
          || (orient === 'land' && land)
          || (orient === 'port' && !land);
        return matchScene && matchOrient;
      }).length;
    }

    function updateFilterLabels() {
      const allOrient = view.querySelector('.orient-btn[data-orient="all"]');
      const portBtn = view.querySelector('.orient-btn[data-orient="port"]');
      const landBtn = view.querySelector('.orient-btn[data-orient="land"]');
      if (allOrient) allOrient.textContent = '全部方向 (' + countMatching(sceneFilter, 'all') + ')';
      if (portBtn) portBtn.textContent = '竖版 (' + countMatching(sceneFilter, 'port') + ')';
      if (landBtn) landBtn.textContent = '横版 (' + countMatching(sceneFilter, 'land') + ')';

      view.querySelectorAll('.scene-btn').forEach(b => {
        const s = b.dataset.scene;
        const n = countMatching(s, orientFilter);
        if (s === 'all') b.textContent = '全部 (' + n + ')';
        else b.textContent = (cats[s] || s) + ' (' + n + ')';
      });
    }

    function updateFilterHint(visible) {
      let hint = view.querySelector('#filterHint');
      if (!hint) {
        hint = document.createElement('p');
        hint.id = 'filterHint';
        hint.className = 'filter-hint';
        view.querySelector('.filter-orient')?.after(hint);
      }
      const parts = [];
      if (sceneFilter !== 'all') parts.push(cats[sceneFilter] || sceneFilter);
      if (orientFilter === 'port') parts.push('竖版');
      else if (orientFilter === 'land') parts.push('横版');
      if (searchQuery.trim()) parts.push('搜索「' + searchQuery.trim() + '」');
      if (parts.length) {
        hint.textContent = parts.join(' · ') + ' — 共 ' + visible + ' 个模板';
        hint.style.display = '';
      } else {
        hint.style.display = 'none';
      }
    }

    function applyFilters() {
      const q = searchQuery.toLowerCase().trim();
      let visible = 0;
      view.querySelectorAll('.tpl-card').forEach(el => {
        const t = list.find(x => x.id === el.dataset.id);
        const land = isLandscape(t);
        const matchOrient = orientFilter === 'all'
          || (orientFilter === 'land' && land)
          || (orientFilter === 'port' && !land);
        const matchScene = sceneFilter === 'all' || t.sceneCategory === sceneFilter;
        const hay = (t.name + ' ' + t.category + ' ' + (t.tags || []).join(' ')).toLowerCase();
        const matchSearch = !q || hay.includes(q);
        const show = matchOrient && matchScene && matchSearch;
        el.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      view.querySelector('#searchEmpty').style.display = visible ? 'none' : 'block';

      view.querySelectorAll('.scene-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.scene === sceneFilter);
      });
      view.querySelectorAll('.orient-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.orient === orientFilter);
      });
      updateFilterLabels();
      updateFilterHint(visible);
      try {
        localStorage.setItem(FILTER_SCENE_KEY, sceneFilter);
        localStorage.setItem(FILTER_ORIENT_KEY, orientFilter);
      } catch (e) {}
    }

    view.querySelectorAll('.scene-btn').forEach(btn => {
      btn.onclick = () => { sceneFilter = btn.dataset.scene; applyFilters(); };
    });
    view.querySelectorAll('.orient-btn').forEach(btn => {
      btn.onclick = () => { orientFilter = btn.dataset.orient; applyFilters(); };
    });
    view.querySelector('#gallerySearch').oninput = (e) => {
      searchQuery = e.target.value;
      applyFilters();
    };

    applyFilters();

    window.HC_GalleryPreview && window.HC_GalleryPreview.observeCards(view.querySelector('#tplGrid'));

    view.querySelectorAll('.tpl-card').forEach(el => {
      el.onclick = () => {
        const id = el.dataset.id;
        if (window.HC_Plan && !window.HC_Plan.canUseTemplate(id)) {
          window.HC_Analytics && window.HC_Analytics.track('template_locked_click', { id });
          window.HC_Pricing && window.HC_Pricing.showUpgradeModal();
          return;
        }
        window.HC_Analytics && window.HC_Analytics.track('template_select', { id });
        location.hash = '#/editor?tpl=' + id;
      };
    });

    window.HC_Analytics && window.HC_Analytics.track('gallery_view');
  }

  async function renderProjects(view) {
    await window.HC_Storage.init();
    if (window.HC_Cloud && window.HC_Cloud.canSync()) {
      await window.HC_Cloud.syncAll();
    }
    const list = await window.HC_Storage.all();
    const cloud = window.HC_Cloud && window.HC_Cloud.getStatus();
    if (!list.length) {
      view.innerHTML = `<div class="gallery"><div class="gallery-head"><h1>我的项目</h1>
        ${cloud.msg ? '<p class="filter-hint">' + cloud.msg + '</p>' : ''}</div>
        <p class="empty">还没有保存的项目，去画廊做一张吧！</p>
        <a href="#/templates" class="btn primary">去选模板</a></div>`;
      return;
    }
    const defaultThumb = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='100' viewBox='0 0 80 100'%3E%3Crect fill='%23f4e9d8' width='80' height='100'/%3E%3Ctext x='40' y='55' text-anchor='middle' font-size='28'%3E🏆%3C/text%3E%3C/svg%3E";
    view.innerHTML = `<div class="gallery">
      <div class="gallery-head"><h1>我的项目</h1>
        ${cloud.msg ? '<p class="filter-hint">' + cloud.msg + '</p>' : ''}
        ${window.HC_Cloud && window.HC_Cloud.canSync() ? '<button class="btn ghost" id="projSyncBtn">同步云端</button>' : ''}
      </div>
      <div class="proj-list">${list.map(p => `
        <div class="proj-item">
          <img class="proj-thumb" src="${p.thumb || defaultThumb}" alt="">
          <div class="proj-info">
            <b>${p.name}</b><br><small>${new Date(p.updatedAt).toLocaleString()}</small>
          </div>
          <div class="proj-actions">
            <button class="btn" data-act="open" data-id="${p.id}">继续编辑</button>
            <button class="btn ghost" data-act="del" data-id="${p.id}">删除</button>
          </div>
        </div>`).join('')}</div></div>`;
    view.querySelectorAll('[data-act]').forEach(b => {
      b.onclick = async () => {
        const id = b.dataset.id;
        if (b.dataset.act === 'open') location.hash = '#/editor?proj=' + id;
        else if (await window.HC_UI.confirm('确认删除该项目？')) {
          await window.HC_Storage.remove(id);
          if (window.HC_Cloud) await window.HC_Cloud.removeRemote(id);
          renderProjects(view);
        }
      };
    });
    view.querySelector('#projSyncBtn')?.addEventListener('click', async () => {
      await window.HC_Cloud.syncAll();
      renderProjects(view);
    });
  }

  window.HC_Gallery = { render, renderProjects, renderLegal };
})();
