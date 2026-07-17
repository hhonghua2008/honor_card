/**
 * 原生 Canvas 奖状绘制（MVP）
 * 坐标系与 H5 模板一致（canvas.w × canvas.h）
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

function wrapText(ctx, text, maxWidth) {
  const chars = String(text || '').split('');
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

function drawTextLayer(ctx, layer) {
  const fontWeight = layer.fontWeight === 'bold' ? 'bold' : 'normal';
  const fontSize = layer.fontSize || 32;
  ctx.fillStyle = layer.fill || '#333';
  ctx.font = fontWeight + ' ' + fontSize + 'px sans-serif';
  ctx.textBaseline = 'middle';

  const align = layer.textAlign || 'center';
  ctx.textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';

  let x = layer.left;
  // originX center: left is center; left: left is left edge
  if (layer.originX === 'left') {
    // keep x
  } else if (layer.originX === 'right') {
    // left is right edge for our data model - H5 uses originX right with left as right position
    ctx.textAlign = 'right';
  }

  const maxW = layer.width > 0 ? layer.width : 0;
  const lineH = (layer.lineHeight || 1.5) * fontSize;

  if (maxW > 0) {
    const lines = wrapText(ctx, layer.text, maxW);
    const totalH = lines.length * lineH;
    let startY = layer.top;
    if (layer.originY === 'center' || !layer.originY) {
      startY = layer.top - totalH / 2 + lineH / 2;
    }
    lines.forEach((ln, i) => {
      ctx.fillText(ln, x, startY + i * lineH);
    });
  } else {
    ctx.fillText(String(layer.text || ''), x, layer.top);
  }
}

function drawSeal(ctx, seal) {
  const r = (seal.size || 120) / 2;
  const x = seal.left;
  const y = seal.top;
  ctx.save();
  ctx.strokeStyle = seal.color || '#c1272d';
  ctx.fillStyle = seal.color || '#c1272d';
  ctx.lineWidth = Math.max(4, r * 0.08);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = 'bold ' + Math.floor(r * 0.28) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = String(seal.text || '荣誉章');
  // 简字环排近似：两行居中
  if (text.length > 4) {
    const mid = Math.ceil(text.length / 2);
    ctx.fillText(text.slice(0, mid), x, y - r * 0.12);
    ctx.fillText(text.slice(mid), x, y + r * 0.22);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
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
    const r = Math.min(w, h) * 0.12;
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
  }
  // cover crop
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
    ctx.strokeStyle = 'rgba(243,210,122,0.9)';
    ctx.lineWidth = 8;
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

function applyFieldsToLayers(layers, fields) {
  const recipient = (fields.name || '') + ' ' + (fields.suffix || '') + '：';
  return layers.map(l => {
    if (l.type !== 'text') return l;
    const next = Object.assign({}, l);
    if (l.id === 'title' && fields.title != null) next.text = fields.title;
    if (l.id === 'recipient') next.text = recipient;
    if (l.id === 'reason' && fields.reason != null) next.text = fields.reason;
    if (l.id === 'honor' && fields.honor != null) next.text = fields.honor;
    if (l.id === 'closing' && fields.closing != null) next.text = fields.closing;
    if (l.id === 'issuer' && fields.issuer != null) next.text = fields.issuer;
    if (l.id === 'date' && fields.date != null) next.text = fields.date;
    return next;
  });
}

/**
 * @param {Object} opts
 * @param {*} opts.canvas canvas 2d node
 * @param {*} opts.ctx
 * @param {Object} opts.tpl catalog template
 * @param {Object} opts.fields form fields
 * @param {string} opts.bgPath local/temp path or https
 * @param {string} [opts.photoPath]
 */
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
  if (photo) {
    await drawPhoto(ctx, canvas, photo, photoPath);
  }

  layers.forEach(l => {
    if (l.id === 'honor' && !(fields.honor || '').trim()) return;
    if (l.type === 'text') drawTextLayer(ctx, l);
    if (l.type === 'seal') {
      const seal = Object.assign({}, l, {
        text: (fields.issuer || l.text || '荣誉章').slice(0, 8)
      });
      drawSeal(ctx, seal);
    }
  });
}

module.exports = { renderCertificate, applyFieldsToLayers, loadImage };
