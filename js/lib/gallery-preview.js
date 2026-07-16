(function () {
  const SERIF = '"Songti SC","STSong","SimSun",serif';
  const SANS = '"PingFang SC","Microsoft YaHei",sans-serif';

  function loadImage(url, fallback) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (fallback && url !== fallback) {
          loadImage(fallback, null).then(resolve);
        } else resolve(null);
      };
      img.src = url;
    });
  }

  function layerFont(l, scale) {
    const weight = l.fontWeight === 'bold' ? 'bold ' : '';
    const family = (l.fontFamily || SERIF).split(',')[0].replace(/"/g, '');
    return weight + Math.max(8, Math.round((l.fontSize || 32) * scale)) + 'px ' + family + ',sans-serif';
  }

  function drawTextLayer(ctx, l, scale, w) {
    if (!l.text) return;
    const x = (l.left || 0) * scale;
    const y = (l.top || 0) * scale;
    const align = l.textAlign || 'center';
    ctx.font = layerFont(l, scale);
    ctx.fillStyle = l.fill || '#333';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    const text = String(l.text);
    if (l.width && l.type === 'text') {
      const maxW = l.width * scale;
      const line = text.length > 28 ? text.slice(0, 28) + '…' : text;
      ctx.fillText(line, x, y, maxW);
    } else {
      ctx.fillText(text.replace(/\s+/g, ''), x, y);
    }
  }

  async function renderPreview(container, tpl) {
    if (container.dataset.previewDone === '1') return;
    const thumbW = container.clientWidth || 400;
    const scale = thumbW / tpl.canvas.w;
    const thumbH = Math.round(tpl.canvas.h * scale);
    const canvas = document.createElement('canvas');
    canvas.className = 'tpl-preview-canvas';
    canvas.width = thumbW;
    canvas.height = thumbH;
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d');
    const bg = await loadImage(tpl.bg, tpl.bgFallback);
    if (bg) {
      const sc = Math.max(thumbW / bg.width, thumbH / bg.height);
      const dw = bg.width * sc;
      const dh = bg.height * sc;
      ctx.drawImage(bg, (thumbW - dw) / 2, (thumbH - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = '#f4e9d8';
      ctx.fillRect(0, 0, thumbW, thumbH);
    }
    (tpl.layers || []).forEach(l => {
      if (l.type === 'text') drawTextLayer(ctx, l, scale, thumbW);
    });
    container.querySelector('.thumb-bg')?.classList.add('hidden');
    container.appendChild(canvas);
    container.dataset.previewDone = '1';
  }

  function observeCards(root) {
    if (!root || !('IntersectionObserver' in window)) {
      root && root.querySelectorAll('.thumb[data-tpl-id]').forEach(el => {
        const tpl = (window.HC_TEMPLATES || []).find(t => t.id === el.dataset.tplId);
        if (tpl) renderPreview(el, tpl);
      });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const tpl = (window.HC_TEMPLATES || []).find(t => t.id === el.dataset.tplId);
        if (tpl) renderPreview(el, tpl);
        io.unobserve(el);
      });
    }, { rootMargin: '120px' });
    root.querySelectorAll('.thumb[data-tpl-id]').forEach(el => io.observe(el));
  }

  window.HC_GalleryPreview = { renderPreview, observeCards };
})();
