(function () {
  function setMeta(page) {
    document.title = page.title + ' · HonorCard';
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', page.desc);
    let kw = document.querySelector('meta[name="keywords"]');
    if (!kw) {
      kw = document.createElement('meta');
      kw.name = 'keywords';
      document.head.appendChild(kw);
    }
    kw.content = page.keywords || '';
  }

  function resetMeta() {
    document.title = 'HonorCard · 专业奖状证书在线制作';
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', 'HonorCard 专业奖状制作平台：28+精美模板，批量生成，Logo定制，高清无水印导出。教师、HR、活动组织者首选。');
  }

  function related(page) {
    const all = window.HC_SEO_DATA.all();
    return all.filter(p => p.slug !== page.slug && (p.scene === page.scene || p.tpl === page.tpl)).slice(0, 4);
  }

  function render(view, slug) {
    const page = window.HC_SEO_DATA.find(slug);
    if (!page) {
      view.innerHTML = '<div class="gallery"><p class="empty">页面不存在</p><a href="#/guides">← 返回专题</a></div>';
      return;
    }
    setMeta(page);
    const tpl = (window.HC_TEMPLATES || []).find(t => t.id === page.tpl);
    const tplName = tpl ? tpl.name : page.tpl;
    const ctaHref = page.cta === 'batch'
      ? '#/editor?tpl=' + (page.tpl || 'tpl-01')
      : '#/editor?tpl=' + (page.tpl || 'tpl-01');
    const ctaLabel = page.cta === 'batch' ? '打开模板并批量生成' : '使用「' + tplName + '」开始制作';
    const rel = related(page);

    view.innerHTML = `
      <article class="seo-page">
        <nav class="seo-breadcrumb"><a href="#/">首页</a> · <a href="#/guides">制作指南</a> · ${page.title}</nav>
        <header class="seo-head">
          <h1>${page.h1}</h1>
          <p class="seo-desc">${page.desc}</p>
          <div class="seo-cta">
            <a href="${ctaHref}" class="btn primary">${ctaLabel}</a>
            <a href="#/templates${page.filter === 'land' ? '' : page.scene ? '' : ''}" class="btn ghost">浏览全部模板</a>
          </div>
        </header>
        <section class="seo-body">
          <h2>如何使用</h2>
          <ol class="seo-steps">
            <li>点击上方按钮，进入在线编辑器（无需安装）</li>
            <li>在左侧「内容模版」一键套用场景，或手动修改标题、荣誉名、落款</li>
            <li>可上传照片、调整签章，完成后导出 PNG / PDF 或批量生成</li>
          </ol>
          ${page.cta === 'batch' ? `<div class="seo-tip">💡 Pro 用户支持 Excel 导入与批量 PDF，单次最多 500 人。</div>` : ''}
        </section>
        ${rel.length ? `<section class="seo-related"><h2>相关专题</h2><ul>${rel.map(r =>
          `<li><a href="#/guide/${r.slug}">${r.title}</a></li>`).join('')}</ul></section>` : ''}
        <footer class="seo-foot"><a href="#/guides">← 全部制作指南</a></footer>
      </article>`;

    window.HC_Analytics && window.HC_Analytics.track('seo_page_view', { slug: page.slug });
  }

  function renderIndex(view) {
    resetMeta();
    const pages = window.HC_SEO_DATA.all();
    const groups = [
      { title: '校园表彰', match: p => /学生|三好|少先|运动|幼儿园|表扬|黑板/.test(p.title) },
      { title: '企业与 HR', match: p => /员工|企业|HR|黑金|蓝金/.test(p.title) },
      { title: '活动与节日', match: p => /志愿|比赛|教师|春节|节日/.test(p.title) },
      { title: '工具与格式', match: p => /竖版|横版|照片|批量|免费/.test(p.title) }
    ];
    view.innerHTML = `
      <div class="seo-index">
        <h1>奖状制作指南</h1>
        <p>按场景选择模板与教程，覆盖教师、HR、活动组织者常见需求。共 ${pages.length} 个专题页。</p>
        ${groups.map(g => {
          const items = pages.filter(g.match);
          if (!items.length) return '';
          return `<section><h2>${g.title}</h2><ul class="seo-index-list">${items.map(p =>
            `<li><a href="#/guide/${p.slug}"><b>${p.title}</b><span>${p.desc.slice(0, 48)}…</span></a></li>`).join('')}</ul></section>`;
        }).join('')}
      </div>`;
  }

  window.HC_SEO = { render, renderIndex, resetMeta };
})();
