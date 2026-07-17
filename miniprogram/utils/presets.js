/** 常用文案快选（借鉴主流奖状小程序） */
const SUFFIX_PRESETS = ['同学：', '小朋友：', '同志：', '先生/女士：', '老师：'];

const HONOR_PRESETS = [
  '三好学生', '学习标兵', '优秀少先队员', '进步之星',
  '劳动标兵', '体育健将', '文艺之星', '助人为乐标兵',
  '优秀班干部', '全勤奖'
];

const REASON_PRESETS = [
  '在2024-2025学年第二学期中表现优秀，被评为',
  '在本学期德智体美劳全面发展，被评为',
  '在各项活动中积极进取、表现突出，被评为',
  '学习勤奋、团结同学、尊敬师长，被评为',
  '在班级工作中认真负责、起模范带头作用，被评为'
];

const CLOSING_PRESETS = [
  '特发此状，以资鼓励！',
  '特发此证，以资鼓励。',
  '特发此表扬状！继续加油哦～',
  '特颁此证，以资表彰。'
];

const ISSUER_PRESETS = [
  '光明小学五年级一班',
  'XX小学教导处',
  '幼儿园园长室',
  '少先队大队部',
  '年级组'
];

function pick(title, list) {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList: list.slice(0, 6),
      success: r => resolve(list[r.tapIndex]),
      fail: () => resolve(null)
    });
  });
}

module.exports = {
  SUFFIX_PRESETS,
  HONOR_PRESETS,
  REASON_PRESETS,
  CLOSING_PRESETS,
  ISSUER_PRESETS,
  pick
};
