(function () {
  function base() {
    return (window.HC_API_URL || '').replace(/\/$/, '');
  }

  function headers() {
    const h = { 'Content-Type': 'application/json' };
    const t = window.HC_Auth && window.HC_Auth.token();
    if (t) h.Authorization = 'Bearer ' + t;
    return h;
  }

  async function request(method, path, body) {
    const url = base() + '/api/v1' + path;
    try {
      const res = await fetch(url, {
        method,
        headers: headers(),
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, msg: data.error || data.msg || ('HTTP ' + res.status) };
      return Object.assign({ ok: true }, data);
    } catch (e) {
      return { ok: false, msg: '无法连接服务器，请稍后重试' };
    }
  }

  window.HC_API = {
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b),
    put: (p, b) => request('PUT', p, b),
    del: (p) => request('DELETE', p),
    enabled: () => !!base()
  };
})();
