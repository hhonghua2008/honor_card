const projects = require('../../utils/projects');
const catalog = require('../../utils/catalog');
const cloud = require('../../utils/cloud');

Page({
  data: {
    list: [],
    empty: true,
    cloudOn: false,
    cloudTip: ''
  },

  onShow() {
    this.setData({
      cloudOn: cloud.enabled(),
      cloudTip: cloud.enabled()
        ? '已配置云开发，可上传/拉取草稿（跨设备同步文案）'
        : '未开通云同步：可用「导出/导入备份」。开通：云开发创建环境后填写 config.cloudEnv'
    });
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
  },

  async syncUp() {
    wx.showLoading({ title: '上传中' });
    const r = await cloud.pushAll();
    wx.hideLoading();
    wx.showToast({ title: r.msg || (r.ok ? '完成' : '失败'), icon: 'none' });
  },

  async syncDown() {
    wx.showLoading({ title: '拉取中' });
    const r = await cloud.pullAll();
    wx.hideLoading();
    this.reload();
    wx.showToast({ title: r.msg || (r.ok ? '完成' : '失败'), icon: 'none' });
  },

  exportBackup() {
    const payload = {
      v: 1,
      exportedAt: Date.now(),
      projects: projects.list().map(p => ({
        id: p.id,
        tplId: p.tplId,
        name: p.name,
        fields: p.fields,
        thumb: p.thumb,
        updatedAt: p.updatedAt
      }))
    };
    wx.setClipboardData({
      data: JSON.stringify(payload),
      success: () => wx.showToast({ title: '备份已复制', icon: 'success' })
    });
  },

  importBackup() {
    wx.getClipboardData({
      success: res => {
        try {
          const data = JSON.parse(res.data || '{}');
          if (!data.projects || !Array.isArray(data.projects)) {
            wx.showToast({ title: '剪贴板不是备份数据', icon: 'none' });
            return;
          }
          wx.showModal({
            title: '导入备份？',
            content: '将合并 ' + data.projects.length + ' 条草稿到本地',
            success: m => {
              if (!m.confirm) return;
              data.projects.forEach(p => {
                if (!p.id || !p.tplId) return;
                projects.upsert({
                  id: p.id,
                  tplId: p.tplId,
                  name: p.name || '导入草稿',
                  fields: p.fields || {},
                  photoPath: '',
                  thumb: p.thumb || '',
                  updatedAt: p.updatedAt
                });
              });
              this.reload();
              wx.showToast({ title: '导入完成', icon: 'success' });
            }
          });
        } catch (e) {
          wx.showToast({ title: '解析失败', icon: 'none' });
        }
      }
    });
  }
});

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = n => (n < 10 ? '0' + n : '' + n);
  return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
