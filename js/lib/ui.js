(function () {
  let toastRoot = null;

  function ensureToastRoot() {
    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.className = 'hc-toast-root';
      document.body.appendChild(toastRoot);
    }
    return toastRoot;
  }

  function toast(msg, type) {
    const root = ensureToastRoot();
    const el = document.createElement('div');
    el.className = 'hc-toast hc-toast-' + (type || 'info');
    el.textContent = msg;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  function modal(opts) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'hc-modal-overlay';
      const btns = (opts.buttons || [{ label: '确定', primary: true }])
        .map((b, i) => `<button class="btn${b.primary ? ' primary' : ''}${b.danger ? ' danger' : ''}" data-i="${i}">${b.label}</button>`)
        .join('');
      overlay.innerHTML = `
        <div class="hc-modal">
          ${opts.title ? `<h3 class="hc-modal-title">${opts.title}</h3>` : ''}
          <div class="hc-modal-body">${opts.body || ''}</div>
          <div class="hc-modal-actions">${btns}</div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelectorAll('[data-i]').forEach(btn => {
        btn.onclick = () => {
          const i = +btn.dataset.i;
          overlay.remove();
          resolve((opts.buttons || [])[i]);
        };
      });
      if (opts.input !== undefined) {
        const inp = overlay.querySelector('input');
        if (inp) setTimeout(() => inp.focus(), 50);
      }
    });
  }

  function confirm(msg, opts) {
    opts = opts || {};
    return modal({
      title: opts.title || '确认',
      body: `<p>${msg}</p>`,
      buttons: [
        { label: opts.cancelLabel || '取消' },
        { label: opts.okLabel || '确定', primary: true }
      ]
    }).then(b => b && b.primary);
  }

  function prompt(title, defaultValue) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'hc-modal-overlay';
      overlay.innerHTML = `
        <div class="hc-modal">
          <h3 class="hc-modal-title">${title}</h3>
          <div class="hc-modal-body">
            <input type="text" class="hc-modal-input" value="${(defaultValue || '').replace(/"/g, '&quot;')}">
          </div>
          <div class="hc-modal-actions">
            <button class="btn" data-act="cancel">取消</button>
            <button class="btn primary" data-act="ok">确定</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const inp = overlay.querySelector('.hc-modal-input');
      setTimeout(() => inp && inp.focus(), 50);
      overlay.querySelector('[data-act=cancel]').onclick = () => { overlay.remove(); resolve(null); };
      overlay.querySelector('[data-act=ok]').onclick = () => {
        const val = inp ? inp.value.trim() : '';
        overlay.remove();
        resolve(val);
      };
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') overlay.querySelector('[data-act=ok]').click();
      };
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch (e) {
      ta.remove();
      return false;
    }
  }

  window.HC_UI = { toast, modal, confirm, prompt, copyText };
})();
