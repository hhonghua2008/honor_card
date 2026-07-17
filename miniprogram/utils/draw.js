/**
 * 原生 Canvas 奖状绘制 — 对齐 H5 Fabric 排版（P1）
 * Fabric charSpacing 单位：1/1000 em
 */

function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('empty image src'));
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e || new Error('image load fail: ' + src));
    img.src = src;
  });
}

function fontStack(serif, bold, size) {
  const weight = bold ? 'bold ' : '';
  // 小程序可用系统字体近似宋体 / 黑体
  const family = serif
    ? '"Songti SC","STSong","SimSun",serif'
    : '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
  return weight + size + 'px ' + family;
}

/** Fabric charSpacing → 额外字距（px）≈ fontSize * charSpacing / 1000 */
function spacingPx(fontSize, charSpacing) {
  return fontSize * (Number(charSpacing) || 0) / 1000;
}

function wrapText(ctx, text, maxWidth) {
  const chars = Array.from(String(text || ''));
  const lines = [];
  let line = '';
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = chars[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function measureSpaced(ctx, text, extra) {
  const chars = Array.from(String(text || ''));
  if (!chars.length) return 0;
  let w = 0;
  chars.forEach((ch, i) => {
    w += ctx.measureText(ch).width;
    if (i < chars.length - 1) w += extra;
  });
  return w;
}

function fillSpacedText(ctx, text, x, y, align, extra) {
  const chars = Array.from(String(text || ''));
  if (!chars.length) return;
  const total = measureSpaced(ctx, text, extra);
  let start = x;
  if (align === 'center') start = x - total / 2;
  else if (align === 'right') start = x - total;
  let cx = start;
  chars.forEach((ch, i) => {
    ctx.textAlign = 'left';
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + (i < chars.length - 1 ? extra : 0);
  });
}

function drawTextLayer(ctx, layer) {
  const fontSize = layer.fontSize || 32;
  const bold = layer.fontWeight === 'bold';
  const serif = !!layer.serif || layer.id === 'title' || layer.id === 'honor' || layer.id === 'recipient';
  ctx.fillStyle = layer.fill || '#333';
  ctx.font = fontStack(serif, bold, fontSize);
  ctx.textBaseline = 'middle';

  let align = layer.textAlign || 'center';
  if (layer.originX === 'left') align = 'left';
  if (layer.originX === 'right') align = 'right';
  ctx.textAlign = align;

  const x = layer.left;
  const extra = spacingPx(fontSize, layer.charSpacing);
  const maxW = layer.width > 0 ? layer.width : 0;
  const lineH = (layer.lineHeight || 1.5) * fontSize;

  if (maxW > 0) {
    // 换行时用无字距测量，绘制时若有字距则逐字（正文一般 charSpacing=0）
    const lines = wrapText(ctx, layer.text, maxW);
    const totalH = lines.length * lineH;
    let startY = layer.top;
    if (layer.originY === 'center' || !layer.originY) {
      startY = layer.top - totalH / 2 + lineH / 2;
    }
    lines.forEach((ln, i) => {
      const yy = startY + i * lineH;
      if (extra > 0.5) fillSpacedText(ctx, ln, x, yy, align, extra);
      else ctx.fillText(ln, x, yy);
    });
  } else if (extra > 0.5) {
    fillSpacedText(ctx, layer.text, x, layer.top, align, extra);
  } else {
    ctx.fillText(String(layer.text || ''), x, layer.top);
  }
}

function drawStar(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (4 * Math.PI / 5);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** 对齐 H5 drawSealDataUrl：双环 + 五角星 + 弧形文字 */
function drawSeal(ctx, seal) {
  const s = seal.size || 120;
  const cx = seal.left;
  const cy = seal.top;
  const r = s / 2 - 4;
  const col = seal.color || '#c1272d';
  const text = String(seal.text || '荣誉专用章');

  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = Math.max(3, s * 0.03);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.4, s * 0.013);
  ctx.beginPath();
  ctx.arc(cx, cy, r - s * 0.05, 0, Math.PI * 2);
  ctx.stroke();

  ctx.translate(cx, cy);
  drawStar(ctx, r * 0.3);

  ctx.rotate(Math.PI);
  const chars = Array.from(text);
  const arcR = r * 0.72;
  let fontPx = Math.min(s * 0.16, (Math.PI * arcR) / Math.max(chars.length, 1) * 0.95);
  fontPx = Math.max(12, fontPx);
  ctx.font = 'bold ' + fontPx + 'px "Songti SC","STSong","SimSun",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chars.forEach((ch, i) => {
    const n = chars.length;
    const angle = (Math.PI * (n - 1)) / (n + 1) - (i * Math.PI * (n > 1 ? 1 : 0.5) / Math.max(n - 1, 1));
    const x = Math.cos(angle) * arcR;
    const y = Math.sin(angle) * arcR;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

async function drawPhoto(ctx, canvas, photo, photoPath) {
  if (!photo || !photoPath) return;
  const img = await loadImage(canvas, photoPath);
  const w = photo.width;
  const h = photo.height;
  const x = photo.left - w / 2;
  const y = photo.top - h / 2;
  ctx.save();
  if (photo.mask === 'circle') {
    ctx.beginPath();
    ctx.arc(photo.left, photo.top, Math.min(w, h) / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (photo.mask === 'rounded') {
    roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.12);
    ctx.clip();
  }
  const ir = img.width / img.height;
  const br = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ir > br) {
    sw = img.height * br;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / br;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
  if (photo.frame) {
    ctx.save();
    ctx.strokeStyle = 'rgba(243,210,122,0.95)';
    ctx.lineWidth = Math.max(6, Math.min(w, h) * 0.03);
    if (photo.mask === 'circle') {
      ctx.beginPath();
      ctx.arc(photo.left, photo.top, Math.min(w, h) / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      roundRect(ctx, x - 2, y - 2, w + 4, h + 4, photo.mask === 'rounded' ? 16 : 4);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function applyFieldsToLayers(layers, fields) {
  const recipient = (fields.name || '') + ' ' + (fields.suffix || '') + '：';
  return layers.map(l => {
    if (l.type !== 'text') return l;
    const next = Object.assign({}, l);
    if (l.id === 'title' && fields.title != null) next.text = String(fields.title).replace(/\s+/g, '');
    if (l.id === 'recipient_label') next.text = fields.label != null ? fields.label : l.text;
    if (l.id === 'recipient') next.text = recipient;
    if (l.id === 'reason' && fields.reason != null) next.text = fields.reason;
    if (l.id === 'honor' && fields.honor != null) next.text = fields.honor;
    if (l.id === 'closing' && fields.closing != null) next.text = fields.closing;
    if (l.id === 'issuer' && fields.issuer != null) next.text = fields.issuer;
    if (l.id === 'date' && fields.date != null) next.text = fields.date;
    return next;
  });
}

async function renderCertificate(opts) {
  const { canvas, ctx, tpl, fields, bgPath, photoPath } = opts;
  const W = tpl.canvas.w;
  const H = tpl.canvas.h;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f5efe3';
  ctx.fillRect(0, 0, W, H);

  const bg = await loadImage(canvas, bgPath);
  ctx.drawImage(bg, 0, 0, W, H);

  const layers = applyFieldsToLayers(tpl.layers, fields);
  const photo = layers.find(l => l.type === 'photo');
  if (photo && photoPath) {
    await drawPhoto(ctx, canvas, photo, photoPath);
  }

  layers.forEach(l => {
    if (l.id === 'title' && !(l.text || '').trim()) return;
    if (l.id === 'honor' && !(fields.honor || '').trim()) return;
    if (l.id === 'recipient_label' && !(fields.label || l.text || '').trim()) return;
    if (l.type === 'text') drawTextLayer(ctx, l);
    if (l.type === 'seal') {
      drawSeal(ctx, Object.assign({}, l, {
        text: (fields.sealText || fields.issuer || l.text || '荣誉专用章').slice(0, 10)
      }));
    }
  });
}

module.exports = {
  renderCertificate,
  applyFieldsToLayers,
  loadImage
};
