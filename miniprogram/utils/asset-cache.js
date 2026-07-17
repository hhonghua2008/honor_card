/**
 * 远程模板资源本地缓存（显著加快二次打开）
 */
const fs = wx.getFileSystemManager();
const ROOT = `${wx.env.USER_DATA_PATH}/hc_assets`;
const META_KEY = 'hc_asset_cache_v1';

function ensureDir() {
  try {
    fs.accessSync(ROOT);
  } catch (e) {
    try { fs.mkdirSync(ROOT, true); } catch (err) { /* ignore */ }
  }
}

function metaGet() {
  try {
    return wx.getStorageSync(META_KEY) || {};
  } catch (e) {
    return {};
  }
}

function metaSet(m) {
  try { wx.setStorageSync(META_KEY, m); } catch (e) { /* ignore */ }
}

function localPath(key) {
  return `${ROOT}/${key.replace(/[^\w.-]/g, '_')}`;
}

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 下载并缓存；命中缓存则秒回
 * @param {string} url
 * @param {string} key 如 bg_tpl-01
 */
function getCachedFile(url, key) {
  ensureDir();
  const dest = localPath(key);
  const meta = metaGet();
  if (meta[key] === url && fileExists(dest)) {
    return Promise.resolve(dest);
  }
  // 内存/进行中去重
  if (!getCachedFile._inflight) getCachedFile._inflight = {};
  if (getCachedFile._inflight[key]) return getCachedFile._inflight[key];

  getCachedFile._inflight[key] = new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: r => {
        if (r.statusCode !== 200) {
          reject(new Error('download ' + r.statusCode));
          return;
        }
        try {
          try { if (fileExists(dest)) fs.unlinkSync(dest); } catch (e) { /* */ }
          fs.copyFileSync(r.tempFilePath, dest);
          meta[key] = url;
          metaSet(meta);
          resolve(dest);
        } catch (e) {
          // 落盘失败则用临时路径（本次仍可用）
          resolve(r.tempFilePath);
        }
      },
      fail: reject,
      complete: () => { delete getCachedFile._inflight[key]; }
    });
  });
  return getCachedFile._inflight[key];
}

/** 列表页预取背景，不阻塞跳转 */
function prefetch(url, key) {
  if (!url || !key) return;
  getCachedFile(url, key).catch(() => {});
}

module.exports = { getCachedFile, prefetch };
