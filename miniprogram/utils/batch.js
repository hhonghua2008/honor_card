/**
 * P2 批量：解析名单 + 出图存相册
 */
const { renderCertificate } = require('./draw');

function parseNames(text) {
  return String(text || '')
    .split(/[\n,，;；\t]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 100);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function renderOne(opts) {
  const { tpl, baseFields, name, bgPath, photoPath, canvas } = opts;
  if (!canvas) throw new Error('no canvas');
  const ctx = canvas.getContext('2d');
  const fields = Object.assign({}, baseFields, { name });
  await renderCertificate({
    canvas,
    ctx,
    tpl,
    fields,
    bgPath,
    photoPath: photoPath || ''
  });

  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      destWidth: tpl.canvas.w,
      destHeight: tpl.canvas.h,
      fileType: 'png',
      success: r => resolve(r.tempFilePath),
      fail: reject
    });
  });
}

async function saveAlbum(path) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath: path,
      success: () => resolve(true),
      fail: reject
    });
  });
}

async function runBatch(opts) {
  const { names, tpl, baseFields, bgPath, photoPath, canvas, onProgress } = opts;
  const results = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (onProgress) onProgress(i + 1, names.length, name);
    try {
      const file = await renderOne({
        tpl, baseFields, name, bgPath, photoPath, canvas
      });
      await saveAlbum(file);
      results.push({ name, ok: true, file });
    } catch (e) {
      results.push({ name, ok: false, err: (e && e.errMsg) || String(e) });
      if (e && e.errMsg && e.errMsg.indexOf('auth') >= 0) break;
    }
    await sleep(350);
  }
  return results;
}

module.exports = { parseNames, runBatch, renderOne };
