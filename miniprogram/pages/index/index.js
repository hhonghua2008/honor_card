const { h5Base, apiBase } = require('../../utils/config');

const BUILTIN = [
  { id: 'tpl-01', name: '红金荣耀', category: '照片奖状', scene: 'campus' },
  { id: 'tpl-02', name: '粉彩童趣', category: '照片奖状', scene: 'photo' },
  { id: 'tpl-03', name: '蓝金典藏', category: '荣誉证书', scene: 'corporate' },
  { id: 'tpl-06', name: '橙光暖意', category: '照片奖状', scene: 'activity' },
  { id: 'tpl-13', name: '红金横版荣耀', category: '横版', scene: 'campus' },
  { id: 'tpl-23', name: '小熊抱星', category: '可爱横版', scene: 'photo' }
];

Page({
  data: { list: BUILTIN, loading: false },

  onLoad() {
    this.fetchCatalog();
  },

  fetchCatalog() {
    if (!apiBase) return;
    this.setData({ loading: true });
    wx.request({
      url: apiBase + '/api/v1/catalog',
      success: res => {
        if (res.data && res.data.ok && res.data.catalog) {
          const disabled = new Set(res.data.catalog.disabled || []);
          let list = BUILTIN.filter(t => !disabled.has(t.id));
          (res.data.catalog.custom || []).forEach(c => {
            if (!disabled.has(c.id)) list.push({ id: c.id, name: c.name, category: c.category || '自定义' });
          });
          this.setData({ list });
        }
      },
      complete: () => this.setData({ loading: false })
    });
  },

  openTpl(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/editor/editor?tpl=' + id });
  },

  goPricing() {
    wx.navigateTo({ url: '/pages/pricing/pricing' });
  }
});
