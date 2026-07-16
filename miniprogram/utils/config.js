/** 小程序配置 — 部署前修改 h5Base / apiBase */
const h5Base = 'http://127.0.0.1:8787'; // 正式: https://honorcard.app
const apiBase = 'http://127.0.0.1:8788'; // 正式: https://api.honorcard.app  留空则不走 catalog

function h5EditorUrl(tpl) {
  return h5Base + '/#/editor?tpl=' + encodeURIComponent(tpl || 'tpl-01');
}

module.exports = { h5Base, apiBase, h5EditorUrl };
