/** 小程序配置 */
const h5Base = 'https://hhonghua2008.github.io/honor_card';
const apiBase = ''; // 可选 Node API

/**
 * 微信云开发环境 ID（开通后填写，如 honorcard-1g2xxx）
 * 留空：仅本地草稿 + 导入/导出备份
 */
const cloudEnv = '';

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

module.exports = {
  h5Base,
  apiBase,
  cloudEnv,
  SCENE_FILTERS,
  ORIENT_FILTERS
};
