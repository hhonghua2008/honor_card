(function () {
  const SESSION_KEY = 'hc_session_v1';
  const USERS_KEY = 'hc_users_v1';

  function apiBase() {
    return (window.HC_API_URL || '').replace(/\/$/, '');
  }

  function hasApi() {
    return !!apiBase();
  }

  async function hashPassword(password) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch (e) { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }

  function setSession(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent('hc-auth-change'));
  }

  function isLoggedIn() {
    const s = getSession();
    return !!(s && s.token && s.user);
  }

  function currentUser() {
    const s = getSession();
    return s ? s.user : null;
  }

  function token() {
    const s = getSession();
    return s ? s.token : null;
  }

  async function register(email, password, name) {
    email = (email || '').trim().toLowerCase();
    if (!email || !password) return { ok: false, msg: '请填写邮箱和密码' };
    if (password.length < 6) return { ok: false, msg: '密码至少 6 位' };

    if (hasApi()) {
      const r = await window.HC_API.post('/auth/register', { email, password, name: name || email.split('@')[0] });
      if (!r.ok) return r;
      setSession({ token: r.token, user: r.user, mode: 'cloud' });
      return { ok: true, user: r.user };
    }

    const users = loadUsers();
    if (users[email]) return { ok: false, msg: '该邮箱已注册' };
    const user = {
      id: 'u_' + Date.now(),
      email,
      name: name || email.split('@')[0],
      createdAt: Date.now()
    };
    users[email] = { ...user, passwordHash: await hashPassword(password) };
    saveUsers(users);
    setSession({ token: 'local_' + user.id, user, mode: 'local' });
    return { ok: true, user };
  }

  async function login(email, password) {
    email = (email || '').trim().toLowerCase();
    if (!email || !password) return { ok: false, msg: '请填写邮箱和密码' };

    if (hasApi()) {
      const r = await window.HC_API.post('/auth/login', { email, password });
      if (!r.ok) return r;
      setSession({ token: r.token, user: r.user, mode: 'cloud' });
      await window.HC_Cloud && window.HC_Cloud.syncAll();
      return { ok: true, user: r.user };
    }

    const users = loadUsers();
    const row = users[email];
    if (!row) return { ok: false, msg: '账号不存在' };
    const hash = await hashPassword(password);
    if (row.passwordHash !== hash) return { ok: false, msg: '密码错误' };
    const user = { id: row.id, email: row.email, name: row.name, createdAt: row.createdAt };
    setSession({ token: 'local_' + user.id, user, mode: 'local' });
    return { ok: true, user };
  }

  function logout() {
    setSession(null);
  }

  async function refreshProfile() {
    if (!hasApi() || !isLoggedIn()) return null;
    const r = await window.HC_API.get('/auth/me');
    if (r.ok && r.user) {
      const s = getSession();
      s.user = r.user;
      setSession(s);
      if (r.user.proUntil) window.HC_Plan && window.HC_Plan.applyServerEntitlements(r.user);
      if (r.user.teamUntil) window.HC_Plan && window.HC_Plan.applyServerEntitlements(r.user);
    }
    return r;
  }

  function renderAuthSlot(el) {
    if (!el) return;
    if (isLoggedIn()) {
      const u = currentUser();
      el.innerHTML = `<a href="#/account" class="auth-link">${u.name || u.email}</a>`;
    } else {
      el.innerHTML = '<a href="#/account" class="auth-link">登录</a>';
    }
  }

  window.HC_Auth = {
    register, login, logout, isLoggedIn, currentUser, token,
    refreshProfile, renderAuthSlot, hasApi, getSession
  };
})();
