(function () {
  function render(view) {
    const pro = window.HC_Plan && window.HC_Plan.isPro();
    const freeN = window.HC_Plan ? window.HC_Plan.FREE_COUNT : 10;
    const totalN = (window.HC_TEMPLATES || []).length;

    view.innerHTML = `
      <div class="pricing-page">
        <div class="pricing-head">
          <h1>选择适合您的方案</h1>
          <p>Free 永久可用 · Pro 按年订阅 · 支持激活码（内测 / 团购）</p>
          ${pro ? '<div class="pricing-active">✅ 您已是 Pro 会员 · ' + window.HC_Plan.planLabel() + '</div>' : ''}
        </div>

        <div class="pricing-cards">
          <div class="price-card">
            <div class="price-tier">Free</div>
            <div class="price-amount">¥0</div>
            <div class="price-period">永久免费</div>
            <ul>
              <li>${freeN} 套基础模板</li>
              <li>标准 PNG / JPG / PDF 导出</li>
              <li>导出含 HonorCard 水印</li>
              <li>批量最多 ${window.HC_Plan ? window.HC_Plan.FREE_BATCH : 10} 人/次</li>
              <li>本地保存项目</li>
              <li>分享链接（不含照片）</li>
            </ul>
            <a href="#/templates" class="btn">免费开始</a>
          </div>

          <div class="price-card featured">
            <div class="price-tag">推荐</div>
            <div class="price-tier">Pro</div>
            <div class="price-amount">¥99</div>
            <div class="price-period">/ 年 · 约 ¥8.3/月</div>
            <ul>
              <li><b>全部 ${totalN} 套</b>模板（含精品）</li>
              <li><b>无水印</b>高清导出（300dpi）</li>
              <li>批量最多 ${window.HC_Plan ? window.HC_Plan.PRO_BATCH : 500} 人/次</li>
              <li>Excel 导入 + 批量 PDF</li>
              <li>上传 Logo / 校徽 / 司徽</li>
              <li>优先新模板 & 节日专题</li>
            </ul>
            ${pro
              ? '<button class="btn primary" disabled>已开通 Pro</button>'
              : '<button class="btn primary" id="buyProBtn">立即升级</button>'}
          </div>

          <div class="price-card">
            <div class="price-tier">Team</div>
            <div class="price-amount">¥299</div>
            <div class="price-period">/ 年起 · 5 人</div>
            <ul>
              <li>Pro 全部权益</li>
              <li>统一品牌模板</li>
              <li>专属激活码批量发放</li>
              <li>发票 & 合同支持</li>
              <li>私有化部署（可选）</li>
            </ul>
            <button class="btn" id="buyTeamBtn">购买 Team</button>
            <button class="btn ghost" id="contactTeamBtn">联系商务</button>
          </div>
        </div>

        <div class="pricing-faq">
          <h2>常见问题</h2>
          <details><summary>Free 和 Pro 最大区别是什么？</summary><p>Pro 解锁全部模板、去除导出水印、支持高清 300dpi 导出，以及更大批量与 Logo 上传。</p></details>
          <details><summary>数据会上传吗？</summary><p>不会。HonorCard 是纯前端工具，作品默认保存在您浏览器本地。Pro 订阅状态也仅存本地（正式支付上线后将与账号绑定）。</p></details>
          <details><summary>如何激活 Pro？</summary><p>购买后将获得激活码，在下方输入即可开通。内测用户可使用演示码体验。</p></details>
        </div>

        <div class="pricing-activate" id="activateBox">
          <h3>已有激活码？</h3>
          <div class="activate-row">
            <input type="text" id="activateCode" class="hc-modal-input" placeholder="输入激活码，如 HONORPRO2026">
            <button class="btn primary" id="activateBtn">激活</button>
          </div>
          <p class="activate-hint">内测演示码：<code>HONORPRO2026</code>（365天）· <code>BETA30</code>（30天）</p>
        </div>
      </div>`;

    view.querySelector('#buyProBtn')?.addEventListener('click', () => showUpgradeModal());
    view.querySelector('#buyTeamBtn')?.addEventListener('click', () => startPayment('team'));
    view.querySelector('#contactTeamBtn')?.addEventListener('click', () => {
      window.HC_Analytics && window.HC_Analytics.track('team_contact_click');
      window.location.href = 'mailto:hello@honorcard.app?subject=HonorCard%20Team%20咨询';
    });
    view.querySelector('#activateBtn')?.addEventListener('click', async () => {
      const code = view.querySelector('#activateCode').value;
      const r = window.HC_Plan.activateCodeRemote
        ? await window.HC_Plan.activateCodeRemote(code)
        : window.HC_Plan.activateCode(code);
      if (r.ok) {
        window.HC_UI.toast(r.msg, 'success');
        window.HC_Analytics && window.HC_Analytics.track('pro_activated', { code: code.slice(0, 4) + '***' });
        window.HC_Plan.renderProBadge(document.getElementById('proBadgeSlot'));
        render(view);
      } else {
        window.HC_UI.toast(r.msg, 'error');
      }
    });

    window.HC_Analytics && window.HC_Analytics.track('pricing_view');
  }

  function showUpgradeModal() {
    window.HC_Analytics && window.HC_Analytics.track('upgrade_click');
    if (window.HC_API && window.HC_API.enabled() && window.HC_Auth && window.HC_Auth.isLoggedIn()) {
      startPayment('pro');
      return;
    }
    window.HC_UI.modal({
      title: '升级 HonorCard Pro',
      body: `
        <p>正式支付（微信 / 支付宝）需登录并配置 API。当前也可通过<strong>激活码</strong>开通。</p>
        <ol style="margin:12px 0;padding-left:20px;font-size:13px;line-height:1.8">
          <li>前往定价页下方输入激活码</li>
          <li>或联系 <a href="mailto:hello@honorcard.app">hello@honorcard.app</a> 获取团购码</li>
        </ol>
        <p style="font-size:12px;color:#999">内测演示码：HONORPRO2026</p>`,
      buttons: [
        { label: '关闭' },
        { label: '去激活', primary: true }
      ]
    }).then(b => {
      if (b && b.primary) location.hash = '#/pricing';
    });
  }

  async function pickChannel() {
    if (!window.HC_API || !window.HC_API.enabled()) return 'wechat';
    const cfg = await window.HC_API.get('/payment/config');
    if (!cfg.ok || !cfg.channels) return 'wechat';
    return new Promise(resolve => {
      const btns = cfg.channels.map(ch =>
        `<button type="button" class="btn pay-ch" data-ch="${ch.id}" style="width:100%;margin:8px 0">
          ${ch.name} ${ch.mode === 'demo' ? '（演示）' : ''}
        </button>`).join('');
      window.HC_UI.modal({
        title: '选择支付方式',
        body: '<div class="pay-channels">' + btns + '</div>',
        buttons: [{ label: '取消' }]
      }).then(() => resolve(null));
      setTimeout(() => {
        document.querySelectorAll('.pay-ch').forEach(b => {
          b.onclick = () => {
            document.querySelector('.hc-modal-backdrop')?.click();
            resolve(b.dataset.ch);
          };
        });
      }, 50);
    });
  }

  async function pollOrderPaid(orderId, onPaid) {
    let n = 0;
    const max = 60;
    const t = setInterval(async () => {
      n++;
      const r = await window.HC_API.get('/payment/orders/' + encodeURIComponent(orderId));
      if (r.ok && r.order && r.order.status === 'paid') {
        clearInterval(t);
        onPaid(r.user);
      } else if (n >= max) clearInterval(t);
    }, 2000);
    return () => clearInterval(t);
  }

  async function startPayment(plan) {
    if (!window.HC_Auth || !window.HC_Auth.isLoggedIn()) {
      window.HC_UI.toast('请先登录后再购买', 'error');
      location.hash = '#/account';
      return;
    }
    const channel = await pickChannel();
    if (!channel) return;

    const r = await window.HC_API.post('/payment/orders', { plan: plan || 'pro', channel });
    if (!r.ok) {
      window.HC_UI.toast(r.msg || '创建订单失败', 'error');
      return;
    }
    window.HC_Analytics && window.HC_Analytics.track('payment_order_created', { plan, channel, orderId: r.orderId });

    const isAlipay = channel === 'alipay';
    const hint = r.payMode === 'demo'
      ? '演示模式：等待轮询或点击「模拟支付成功」'
      : (isAlipay ? '请用支付宝扫码，或点击「打开支付宝」' : '请用微信扫一扫完成支付');

    let body = `<p>订单号：<code>${r.orderId}</code></p>
      <p style="font-size:13px;color:#666">${hint}</p>`;
    if (r.qrUrl) body += `<img src="${r.qrUrl}" alt="支付码" style="display:block;margin:12px auto;max-width:220px;border:1px solid #eee;border-radius:8px">`;
    if (isAlipay && r.payUrl) body += `<p style="text-align:center"><a href="${r.payUrl}" target="_blank" rel="noopener" class="btn">打开支付宝</a></p>`;

    const buttons = [{ label: '关闭' }];
    if (r.payMode === 'demo') buttons.push({ label: '模拟支付成功', primary: true });

    let stopPoll = pollOrderPaid(r.orderId, user => {
      window.HC_Plan.applyServerEntitlements(user);
      window.HC_UI.toast('支付成功，权益已开通', 'success');
      window.HC_Analytics && window.HC_Analytics.track('payment_success', { plan, channel });
      window.HC_Plan.renderProBadge(document.getElementById('proBadgeSlot'));
    });

    window.HC_UI.modal({
      title: (plan === 'team' ? 'Team' : 'Pro') + ' · ' + (isAlipay ? '支付宝' : '微信支付'),
      body,
      buttons
    }).then(async b => {
      stopPoll();
      if (b && b.primary && r.payMode === 'demo') {
        const c = await window.HC_API.post('/payment/orders/' + encodeURIComponent(r.orderId) + '/confirm', {});
        if (c.ok) {
          window.HC_Plan.applyServerEntitlements(c.user);
          window.HC_UI.toast('支付成功，权益已开通', 'success');
          window.HC_Analytics && window.HC_Analytics.track('payment_success', { plan, channel });
          window.HC_Plan.renderProBadge(document.getElementById('proBadgeSlot'));
        } else window.HC_UI.toast(c.msg || '确认失败', 'error');
      }
    });
  }

  window.HC_Pricing = { render, showUpgradeModal, startPayment };
})();
