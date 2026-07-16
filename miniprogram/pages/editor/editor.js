const { h5EditorUrl } = require('../../utils/config');

Page({
  data: { url: '' },

  onLoad(query) {
    const tpl = query.tpl || 'tpl-01';
    const url = h5EditorUrl(tpl);
    this.setData({ url });
  },

  onShareAppMessage() {
    return {
      title: 'HonorCard 在线奖状制作',
      path: '/pages/index/index'
    };
  }
});
