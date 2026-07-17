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

  openGuides() {
    wx.navigateTo({ url: '/pages/web/web?title=' + encodeURIComponent('制作指南') + '&path=' + encodeURIComponent('guides') });
  },

  openPricing() {
    wx.navigateTo({ url: '/pages/web/web?title=' + encodeURIComponent('Pro 说明') + '&path=' + encodeURIComponent('pricing') });
  },

  onShareAppMessage() {
    return {
      title: 'HonorCard · 免费在线奖状制作',
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return { title: 'HonorCard · 免费在线奖状制作' };
  }
});
