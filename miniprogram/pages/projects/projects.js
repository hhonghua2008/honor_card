const { h5PageUrl } = require('../../utils/config');

Page({
  data: { url: '' },

  onLoad() {
    this.setData({ url: h5PageUrl('projects') });
  },

  onShareAppMessage() {
    return {
      title: 'HonorCard · 我的奖状项目',
      path: '/pages/projects/projects'
    };
  }
});
