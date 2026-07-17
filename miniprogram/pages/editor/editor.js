const { h5EditorUrl, h5Base } = require('../../utils/config');
const catalog = require('../../utils/catalog');

Page({
  data: {
    tpl: 'tpl-01',
    name: '',
    category: '',
    thumbUrl: '',
    url: '',
    tip: '个人小程序无法内嵌网页编辑器，请复制链接后用手机浏览器打开制作。'
  },

  onLoad(query) {
    const tpl = query.tpl || 'tpl-01';
    const all = catalog.loadBuiltin();
    const item = all.find(t => t.id === tpl) || { id: tpl, name: tpl, category: '', thumbUrl: '' };
    const url = h5EditorUrl(tpl);
    this.setData({
      tpl,
      name: item.name,
      category: item.category,
      thumbUrl: item.thumbUrl,
      url
    });
    wx.setNavigationBarTitle({ title: item.name || '制作奖状' });
  },

  copyLink() {
    wx.setClipboardData({
      data: this.data.url,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      }
    });
  },

  openSite() {
    wx.setClipboardData({
      data: h5Base + '/#/templates',
      success: () => {
        wx.showModal({
          title: '请用浏览器打开',
          content: '模板首页链接已复制。请到微信外浏览器粘贴打开，或直接访问：' + h5Base,
          showCancel: false
        });
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '用「奖状模版大全」做一张奖状：' + (this.data.name || ''),
      path: '/pages/editor/editor?tpl=' + encodeURIComponent(this.data.tpl)
    };
  }
});
