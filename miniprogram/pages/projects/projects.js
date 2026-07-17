const { h5PageUrl } = require('../../utils/config');

Page({
  data: {
    url: '',
    tip: '个人小程序无法内嵌网页。「我的项目」保存在浏览器本地，请用手机浏览器打开下方链接查看。'
  },

  onLoad() {
    this.setData({ url: h5PageUrl('projects') });
  },

  copyLink() {
    wx.setClipboardData({
      data: this.data.url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
    });
  }
});
