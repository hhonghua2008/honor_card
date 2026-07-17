const projects = require('../../utils/projects');
const catalog = require('../../utils/catalog');

Page({
  data: { list: [], empty: true },

  onShow() {
    this.reload();
  },

  reload() {
    const list = projects.list().map(p => {
      const tpl = catalog.getById(p.tplId);
      return Object.assign({}, p, {
        tplName: tpl ? tpl.name : p.tplId,
        updatedText: formatTime(p.updatedAt)
      });
    });
    this.setData({ list, empty: !list.length });
  },

  open(e) {
    const id = e.currentTarget.dataset.id;
    const p = projects.get(id);
    if (!p) return;
    wx.navigateTo({
      url: '/pages/editor/editor?tpl=' + encodeURIComponent(p.tplId) + '&proj=' + encodeURIComponent(p.id)
    });
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除草稿？',
      success: r => {
        if (r.confirm) {
          projects.remove(id);
          this.reload();
        }
      }
    });
  },

  goTemplates() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = n => (n < 10 ? '0' + n : '' + n);
  return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
