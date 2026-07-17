/** 小程序配置 — 上线前确认 h5Base；apiBase 个人版留空即可 */
const h5Base = 'https://hhonghua2008.github.io/honor_card';
const apiBase = ''; // 可选：Node API 地址，用于运营后台同步 catalog

const SCENE_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'photo', label: '照片奖状' },
  { key: 'campus', label: '校园表扬' },
  { key: 'corporate', label: '员工表彰' },
  { key: 'activity', label: '活动荣誉' },
  { key: 'festival', label: '节日励志' }
];

const ORIENT_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'portrait', label: '竖版' },
  { key: 'landscape', label: '横版' }
];

function h5EditorUrl(tpl) {
  return h5Base + '/#/editor?tpl=' + encodeURIComponent(tpl || 'tpl-01');
}

function h5PageUrl(hashPath) {
  const p = (hashPath || '').replace(/^#\/?/, '');
  return h5Base + '/#/' + p;
}

module.exports = {
  h5Base,
  apiBase,
  SCENE_FILTERS,
  ORIENT_FILTERS,
  h5EditorUrl,
  h5PageUrl
};
