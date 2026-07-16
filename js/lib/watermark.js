(function () {
  function apply(dataUrl, text) {
    text = text || 'HonorCard · honorcard.app';
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const fs = Math.max(14, Math.round(img.width * 0.018));
        ctx.save();
        ctx.globalAlpha = 0.38;
        ctx.font = `600 ${fs}px "PingFang SC","Microsoft YaHei",sans-serif`;
        ctx.fillStyle = '#8e1c22';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        const pad = Math.round(fs * 0.8);
        ctx.fillText(text, img.width - pad, img.height - pad);
        ctx.restore();
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  window.HC_Watermark = { apply };
})();
