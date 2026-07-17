const {
  SCENE_FILTERS,
  ORIENT_FILTERS
} = require('../../utils/config');
const catalog = require('../../utils/catalog');
const assetCache = require('../../utils/asset-cache');

Page({
  data: {
    allList: [],
    list: [],
    scene: 'all',
    orient: 'all',
    keyword: '',
    sceneFilters: SCENE_FILTERS,
    orientFilters: ORIENT_FILTERS,
    sceneCounts: {},
    orientCounts: {},
    loading: true,
    total: 28
  },

  onLoad() {
    this.bootstrap();
  },

  onPullDownRefresh() {
    this.bootstrap().finally(() => wx.stopPullDownRefresh());
  },

  async bootstrap() {
    this.setData({ loading: true });
    let allList = await catalog.fetchRemoteCatalog();
    if (!allList) allList = catalog.loadBuiltin();
    // 经典模板置顶，方便发现
    allList = allList.slice().sort((a, b) => {
      const ac = /经典/.test(a.name + a.category) ? 0 : 1;
      const bc = /经典/.test(b.name + b.category) ? 0 : 1;
      return ac - bc;
    });
    this._allList = allList;
    this.applyFilters();
    this.setData({ loading: false, total: allList.length, allList });
  },

  applyFilters() {
    const allList = this._allList || [];
    const { scene, orient, keyword } = this.data;
    const list = catalog.filterList(allList, scene, orient, keyword);
    const sceneCounts = catalog.countByScene(
      catalog.filterList(allList, 'all', orient, keyword)
    );
    const orientCounts = catalog.countByOrient(
      catalog.filterList(allList, scene, 'all', keyword)
    );
    this.setData({ list, sceneCounts, orientCounts });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value || '' });
    this.applyFilters();
  },

  onSceneTap(e) {
    this.setData({ scene: e.currentTarget.dataset.key });
    this.applyFilters();
  },

  onOrientTap(e) {
    this.setData({ orient: e.currentTarget.dataset.key });
    this.applyFilters();
  },

  openTpl(e) {
    const id = e.currentTarget.dataset.id;
    const tpl = catalog.getById(id);
    // 跳转前预取背景，编辑页可秒开缓存
    if (tpl && tpl.bgUrl) assetCache.prefetch(tpl.bgUrl, 'bg_' + tpl.id);
    wx.navigateTo({ url: '/pages/editor/editor?tpl=' + encodeURIComponent(id) });
  },

  onShareAppMessage() {
    return {
      title: '奖状模版大全 · 选模板改字就能导出',
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return { title: '奖状模版大全 · 选模板改字就能导出' };
  }
});
