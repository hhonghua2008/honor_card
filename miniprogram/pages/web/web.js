const { h5PageUrl } = require('../../utils/config');

Page({
  data: { url: '', title: '' },

  onLoad(query) {
    const title = decodeURIComponent(query.title || 'HonorCard');
    const path = decodeURIComponent(query.path || '');
    wx.setNavigationBarTitle({ title });
    this.setData({ url: h5PageUrl(path), title });
  }
});
