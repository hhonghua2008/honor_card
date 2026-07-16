(function () {
  window.HC_VERSION = '1.5.0';

  function parseQuery(hash) {
    const i = hash.indexOf('?');
    if (i < 0) return {};
    const q = {};
    hash.slice(i + 1).split('&').forEach(kv => {
      const idx = kv.indexOf('=');
      const k = kv.slice(0, idx), v = kv.slice(idx + 1);
      q[k] = decodeURIComponent(v);
    });
    return q;
  }

  function updateHeader() {
    window.HC_Plan && window.HC_Plan.renderProBadge(document.getElementById('proBadgeSlot'));
    window.HC_Auth && window.HC_Auth.renderAuthSlot(document.getElementById('authSlot'));
  }

  function parseGuide(hash) {
    const m = hash.match(/^#\/guide\/([^/?]+)/);
    return m ? m[1] : null;
  }

  const App = {
    async init() {
      try {
        await window.HC_Storage.init();
      } catch (e) {
        window.HC_UI && window.HC_UI.toast('本地存储不可用，保存功能可能受限', 'error');
      }
      window.addEventListener('hashchange', () => this.route());
      window.addEventListener('hc-plan-change', () => updateHeader());
      window.addEventListener('hc-auth-change', () => updateHeader());
      updateHeader();
      if (window.HC_Catalog) await window.HC_Catalog.fetchAndApply();
      if (window.HC_Auth && window.HC_Auth.isLoggedIn() && window.HC_Cloud && window.HC_Cloud.canSync()) {
        window.HC_Cloud.syncAll();
      }
      this.route();
    },
    route() {
      const view = document.getElementById('view');
      const h = location.hash || '#/';
      updateHeader();
      if (window.HC_SEO && window.HC_SEO.resetMeta && h.indexOf('#/guide') !== 0) {
        window.HC_SEO.resetMeta();
      }
      if (h.indexOf('#p=') === 0) return this.openShare(h.slice(3), view);
      if (h.indexOf('#/editor') === 0) return this.openEditor(h, view);
      const guideSlug = parseGuide(h);
      if (guideSlug) return window.HC_SEO.render(view, guideSlug);
      if (h === '#/guides') return window.HC_SEO.renderIndex(view);
      if (h === '#/templates') return window.HC_Gallery.render(view);
      if (h === '#/projects') return window.HC_Gallery.renderProjects(view);
      if (h === '#/pricing') return window.HC_Pricing.render(view);
      if (h === '#/account') return window.HC_Account.render(view);
      if (h === '#/team') return window.HC_Team.render(view);
      if (h === '#/admin') return window.HC_Admin.render(view);
      if (h === '#/ops') return window.HC_Ops.render(view);
      if (h === '#/privacy') return window.HC_Gallery.renderLegal(view, 'privacy');
      if (h === '#/terms') return window.HC_Gallery.renderLegal(view, 'terms');
      return window.HC_Landing.render(view);
    },
    async openEditor(hash, view) {
      const q = parseQuery(hash);
      const templates = window.HC_TEMPLATES;
      if (q.proj) {
        const proj = await window.HC_Storage.get(q.proj);
        if (!proj) { view.innerHTML = '<p class="empty">项目不存在或已被删除</p>'; return; }
        const t = templates.find(x => x.id === proj.templateId) || templates[0];
        new window.HC_Editor({ view, template: t, project: proj });
      } else if (q.tpl) {
        const t = templates.find(x => x.id === q.tpl);
        if (!t) { view.innerHTML = '<p class="empty">模板不存在</p>'; return; }
        if (window.HC_Plan && !window.HC_Plan.canUseTemplate(t.id)) {
          view.innerHTML = '<div class="gallery"><p class="empty">该模板需要 Pro 会员</p><a href="#/pricing" class="btn primary">升级 Pro</a></div>';
          return;
        }
        new window.HC_Editor({ view, template: t });
      } else { view.innerHTML = '<p class="empty">缺少参数</p>'; }
      window.HC_Analytics && window.HC_Analytics.track('editor_open', { tpl: q.tpl, proj: q.proj });
    },
    openShare(enc, view) {
      try {
        const data = window.HC_Share.decode(enc);
        window.HC_ShareView.render(view, data);
      } catch (e) {
        view.innerHTML = '<div class="gallery"><p class="empty">分享链接已失效或格式错误</p><a href="#/templates" class="btn primary">返回模板</a></div>';
      }
    }
  };

  window.HC_App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
