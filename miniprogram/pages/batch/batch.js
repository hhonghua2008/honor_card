const catalog = require('../../utils/catalog');
const { parseNames, runBatch } = require('../../utils/batch');

Page({
  data: {
    tplId: '',
    tplName: '',
    namesText: '',
    nameCount: 0,
    running: false,
    progress: '',
    tip: '每行一个姓名（也可用逗号分隔）。将按当前模板文案批量出图并保存到相册，单次最多 100 人。'
  },

  _tpl: null,
  _fields: null,
  _photoPath: '',
  _bgPath: '',
  _canvas: null,

  onLoad(query) {
    const tplId = query.tpl || 'tpl-01';
    const tpl = catalog.getById(tplId);
    if (!tpl) {
      wx.showToast({ title: '模板不存在', icon: 'none' });
      return;
    }
    this._tpl = tpl;
    try {
      this._fields = JSON.parse(decodeURIComponent(query.fields || '{}'));
    } catch (e) {
      this._fields = Object.assign({}, tpl.defaults);
    }
    this._photoPath = query.photo ? decodeURIComponent(query.photo) : '';
    this.setData({ tplId: tpl.id, tplName: tpl.name });
    wx.setNavigationBarTitle({ title: '批量 · ' + tpl.name });
  },

  onReady() {
    // 隐藏画布用于出图（离屏不可用时降级）
    const q = wx.createSelectorQuery();
    q.select('#batchCanvas')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = 1;
        canvas.width = this._tpl.canvas.w * dpr;
        canvas.height = this._tpl.canvas.h * dpr;
        this._canvas = canvas;
        this._ctx = ctx;
      });
    this.ensureBg();
  },

  ensureBg() {
    return new Promise((resolve, reject) => {
      if (this._bgPath) return resolve(this._bgPath);
      wx.downloadFile({
        url: this._tpl.bgUrl,
        success: r => {
          if (r.statusCode === 200) {
            this._bgPath = r.tempFilePath;
            resolve(this._bgPath);
          } else reject(new Error('bg fail'));
        },
        fail: reject
      });
    });
  },

  onNames(e) {
    const namesText = e.detail.value || '';
    this.setData({
      namesText,
      nameCount: parseNames(namesText).length
    });
  },

  async startBatch() {
    const names = parseNames(this.data.namesText);
    if (!names.length) {
      wx.showToast({ title: '请先填写名单', icon: 'none' });
      return;
    }
    if (this.data.running) return;

    try {
      await this.ensureBg();
    } catch (e) {
      wx.showToast({ title: '背景图下载失败', icon: 'none' });
      return;
    }

    this.setData({ running: true, progress: '准备中…' });
    const results = await runBatch({
      names,
      tpl: this._tpl,
      baseFields: this._fields,
      bgPath: this._bgPath,
      photoPath: this._photoPath,
      canvas: this._canvas,
      onProgress: (i, total, name) => {
        this.setData({ progress: i + '/' + total + ' ' + name });
      }
    });

    const ok = results.filter(r => r.ok).length;
    const fail = results.length - ok;
    this.setData({
      running: false,
      progress: '完成：成功 ' + ok + (fail ? '，失败 ' + fail : '')
    });
    wx.showModal({
      title: '批量完成',
      content: '成功保存 ' + ok + ' 张到相册' + (fail ? '，失败 ' + fail + ' 张' : ''),
      showCancel: false
    });
  }
});
