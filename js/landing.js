(function () {
  function render(view) {
    const n = (window.HC_TEMPLATES || []).length;
    view.innerHTML = `
      <section class="landing">
        <div class="landing-hero">
          <div class="landing-badge">🏆 中文奖状场景首选工具</div>
          <h1>好看、简单、能打印的<br><em>奖状与荣誉证书</em></h1>
          <p class="landing-sub">
            比 Word 模板精美，比 Canva 更轻量。选模板 → 改内容 → 一键下载或批量出图。<br>
            教师、HR、活动组织者都在用。
          </p>
          <div class="landing-cta">
            <a href="#/templates" class="btn primary landing-btn">免费开始制作</a>
            <a href="#/pricing" class="btn landing-btn-ghost">查看 Pro 方案</a>
          </div>
          <div class="landing-stats">
            <div><b>${n}+</b><span>精美模板</span></div>
            <div><b>300dpi</b><span>高清导出</span></div>
            <div><b>0</b><span>注册即可用</span></div>
          </div>
        </div>

        <div class="landing-scenes">
          <h2>为谁而做</h2>
          <div class="scene-grid">
            <div class="scene-card"><span>🎓</span><h3>教师 / 班主任</h3><p>期末表彰、运动会、照片奖状、全班批量生成</p></div>
            <div class="scene-card"><span>🏢</span><h3>HR / 行政</h3><p>员工表彰、周年证书、品牌 Logo 与签章</p></div>
            <div class="scene-card"><span>🎉</span><h3>活动组织者</h3><p>比赛获奖、志愿者证书、快速分享链接</p></div>
          </div>
        </div>

        <div class="landing-features">
          <h2>核心能力</h2>
          <div class="feat-grid">
            <div class="feat"><b>28+ 模板</b>竖版 / 横版 / 照片奖状，持续更新</div>
            <div class="feat"><b>批量生成</b>名单 / Excel 导入，ZIP 打包下载</div>
            <div class="feat"><b>照片遮罩</b>方形 / 圆形 / 圆角，一键裁剪</div>
            <div class="feat"><b>自定义签章</b>机构名弧形圆章，真实感盖章</div>
            <div class="feat"><b>多格式导出</b>PNG / JPG / PDF，标准 & 高清</div>
            <div class="feat"><b>隐私优先</b>作品默认存本地，不上传服务器</div>
          </div>
        </div>

        <div class="landing-pricing-teaser">
          <h2>Free 够用，Pro 更专业</h2>
          <p>免费版含 ${window.HC_Plan ? window.HC_Plan.FREE_COUNT : 10} 套模板；Pro 解锁全部模板、去水印、高清导出与大批量生成。</p>
          <a href="#/pricing" class="btn primary">了解 Pro · ¥99/年</a>
        </div>

        <div class="landing-trust">
          <p>🔒 照片与作品仅存于您的浏览器 · 登录可云同步 · 详见 <a href="#/privacy">隐私说明</a> · <a href="#/guides">制作指南</a></p>
        </div>
      </section>`;
    window.HC_Analytics && window.HC_Analytics.track('landing_view');
  }

  window.HC_Landing = { render };
})();
