const { h5PageUrl } = require('../../utils/config');

Page({
  data: { url: '', title: 'HonorCard' },

  onLoad(query) {
    const title = decodeURIComponent(query.title || 'HonorCard');
    const path = decodeURIComponent(query.path || 'guides');
    wx.setNavigationBarTitle({ title });
    this.setData({ url: h5PageUrl(path), title });
  },

  copyLink() {
    wx.setClipboardData({
      data: this.data.url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
    });
  }
});
