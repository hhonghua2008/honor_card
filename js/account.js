(function () {
  function render(view) {
    const logged = window.HC_Auth && window.HC_Auth.isLoggedIn();
    const user = logged ? window.HC_Auth.currentUser() : null;
    const cloud = window.HC_Cloud && window.HC_Cloud.getStatus();
    const apiOn = window.HC_API && window.HC_API.enabled();

    if (logged) {
      view.innerHTML = `
        <div class="account-page">
          <h1>我的账号</h1>
          <div class="account-card">
            <p><b>${user.name || '用户'}</b><br><small>${user.email}</small></p>
            <p class="account-meta">会员：${window.HC_Plan ? window.HC_Plan.planLabel() : 'Free'}
              ${window.HC_Plan && window.HC_Plan.isTeam && window.HC_Plan.isTeam() ? ' · Team' : ''}</p>
            <p class="account-meta sync-meta" id="syncMeta">${cloud.msg || (apiOn ? '云端已连接' : '本地账号模式')}</p>
            <div class="account-actions">
              ${apiOn ? '<button class="btn" id="syncBtn">立即同步</button>' : ''}
              <a href="#/projects" class="btn">我的项目</a>
              ${window.HC_Plan && window.HC_Plan.isTeam && window.HC_Plan.isTeam() ? '<a href="#/team" class="btn">Team 管理</a>' : ''}
              <a href="#/pricing" class="btn ghost">订阅管理</a>
              <button class="btn ghost" id="logoutBtn">退出登录</button>
            </div>
          </div>
        </div>`;
      view.querySelector('#logoutBtn').onclick = () => {
        window.HC_Auth.logout();
        window.HC_UI.toast('已退出登录', 'success');
        render(view);
      };
      view.querySelector('#syncBtn')?.addEventListener('click', async () => {
        const r = await window.HC_Cloud.syncAll();
        window.HC_UI.toast(r.ok ? '同步完成' : (r.msg || '同步失败'), r.ok ? 'success' : 'error');
        render(view);
      });
      window.HC_Auth.refreshProfile();
      return;
    }

    view.innerHTML = `
      <div class="account-page">
        <h1>登录 / 注册</h1>
        <p class="account-intro">登录后可云同步项目（需配置 API），换设备不丢稿。未配置服务器时使用<strong>本地账号</strong>，数据仍在浏览器中。</p>
        <div class="account-tabs">
          <button class="tab-btn active" data-tab="login">登录</button>
          <button class="tab-btn" data-tab="register">注册</button>
        </div>
        <form class="account-form" id="loginForm">
          <label>邮箱<input type="email" id="loginEmail" required placeholder="you@school.edu"></label>
          <label>密码<input type="password" id="loginPass" required placeholder="至少 6 位"></label>
          <button type="submit" class="btn primary">登录</button>
        </form>
        <form class="account-form hidden" id="registerForm">
          <label>昵称<input type="text" id="regName" placeholder="张老师"></label>
          <label>邮箱<input type="email" id="regEmail" required placeholder="you@school.edu"></label>
          <label>密码<input type="password" id="regPass" required placeholder="至少 6 位"></label>
          <button type="submit" class="btn primary">注册</button>
        </form>
        ${apiOn ? '' : '<p class="account-hint">💡 部署 <code>server/</code> 并设置 <code>HC_API_URL</code> 后可启用云端同步与在线支付。</p>'}
      </div>`;

    view.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        view.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        view.querySelector('#loginForm').classList.toggle('hidden', tab !== 'login');
        view.querySelector('#registerForm').classList.toggle('hidden', tab !== 'register');
      };
    });

    view.querySelector('#loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const r = await window.HC_Auth.login(
        view.querySelector('#loginEmail').value,
        view.querySelector('#loginPass').value
      );
      if (r.ok) {
        window.HC_UI.toast('登录成功', 'success');
        window.HC_Analytics && window.HC_Analytics.track('login');
        render(view);
        window.HC_Auth.renderAuthSlot(document.getElementById('authSlot'));
      } else window.HC_UI.toast(r.msg, 'error');
    };

    view.querySelector('#registerForm').onsubmit = async (e) => {
      e.preventDefault();
      const r = await window.HC_Auth.register(
        view.querySelector('#regEmail').value,
        view.querySelector('#regPass').value,
        view.querySelector('#regName').value
      );
      if (r.ok) {
        window.HC_UI.toast('注册成功', 'success');
        window.HC_Analytics && window.HC_Analytics.track('register');
        render(view);
        window.HC_Auth.renderAuthSlot(document.getElementById('authSlot'));
      } else window.HC_UI.toast(r.msg, 'error');
    };
  }

  window.HC_Account = { render };
})();
