const { h5PageUrl } = require('../../utils/config');

Page({
  data: { url: '' },
  onLoad() {
    this.setData({ url: h5PageUrl('pricing') });
  },
  copyLink() {
    wx.setClipboardData({
      data: this.data.url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
    });
  }
});
