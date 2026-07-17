const {
  SCENE_FILTERS,
  ORIENT_FILTERS
} = require('../../utils/config');
const catalog = require('../../utils/catalog');

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
