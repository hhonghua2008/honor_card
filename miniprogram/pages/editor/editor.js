const catalog = require('../../utils/catalog');
const { renderCertificate } = require('../../utils/draw');
const projects = require('../../utils/projects');

Page({
  data: {
    tplId: '',
    tplName: '',
    hasPhoto: false,
    hasLabel: false,
    fields: {
      title: '',
      label: '',
      name: '',
      suffix: '',
      reason: '',
      honor: '',
      closing: '',
      issuer: '',
      date: '',
      sealText: ''
    },
    photoPath: '',
    canvasStyle: '',
    rendering: false,
    ready: false,
    tip: ''
  },

  _tpl: null,
  _canvas: null,
  _ctx: null,
  _bgPath: '',
  _projId: '',
  _timer: null,

  onLoad(query) {
    const tplId = query.tpl || 'tpl-01';
    const projId = query.proj || '';
    const tpl = catalog.getById(tplId);
    if (!tpl) {
      wx.showToast({ title: '模板不存在', icon: 'none' });
      return;
    }
    this._tpl = tpl;
    this._projId = projId || ('p_' + Date.now());

    let fields = Object.assign({}, tpl.defaults);
    let photoPath = '';
    if (projId) {
      const p = projects.get(projId);
      if (p && p.fields) {
        fields = Object.assign(fields, p.fields);
        photoPath = p.photoPath || '';
        this._projId = p.id;
      }
    }

    const sys = wx.getSystemInfoSync();
    const maxW = sys.windowWidth - 32;
    const scale = maxW / tpl.canvas.w;
    const dispW = Math.floor(tpl.canvas.w * scale);
    const dispH = Math.floor(tpl.canvas.h * scale);

    if (!fields.sealText) fields.sealText = fields.issuer || tpl.defaults.sealText || '荣誉专用章';
    if (fields.label == null) fields.label = tpl.defaults.label || '';

    this.setData({
      tplId: tpl.id,
      tplName: tpl.name,
      hasPhoto: !!tpl.hasPhoto,
      hasLabel: !!(fields.label || tpl.defaults.label),
      fields,
      photoPath,
      canvasStyle: 'width:' + dispW + 'px;height:' + dispH + 'px;',
      tip: '改字即预览 · 可批量名单出图 · 导出保存到相册'
    });
    wx.setNavigationBarTitle({ title: tpl.name });
  },

  onReady() {
    this.initCanvas().then(() => {
      this.setData({ ready: true });
      this.scheduleRender(0);
    }).catch(err => {
      console.error(err);
      this.setData({ tip: '画布初始化失败，请检查网络与域名配置' });
      wx.showToast({ title: '画布失败', icon: 'none' });
    });
  },

  onUnload() {
    if (this._timer) clearTimeout(this._timer);
  },

  initCanvas() {
    const tpl = this._tpl;
    return new Promise((resolve, reject) => {
      const q = wx.createSelectorQuery();
      q.select('#certCanvas')
        .fields({ node: true, size: true })
        .exec(res => {
          if (!res || !res[0] || !res[0].node) {
            reject(new Error('canvas node missing'));
            return;
          }
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio || 2;
          canvas.width = tpl.canvas.w * dpr;
          canvas.height = tpl.canvas.h * dpr;
          ctx.scale(dpr, dpr);
          this._canvas = canvas;
          this._ctx = ctx;
          resolve();
        });
    });
  },

  ensureBg() {
    if (this._bgPath) return Promise.resolve(this._bgPath);
    const url = this._tpl.bgUrl;
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url,
        success: r => {
          if (r.statusCode === 200) {
            this._bgPath = r.tempFilePath;
            resolve(this._bgPath);
          } else reject(new Error('bg download ' + r.statusCode));
        },
        fail: reject
      });
    });
  },

  scheduleRender(delay) {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this.doRender(), delay == null ? 280 : delay);
  },

  async doRender() {
    if (!this._canvas || !this._ctx || !this._tpl) return;
    if (this.data.rendering) {
      this.scheduleRender(200);
      return;
    }
    this.setData({ rendering: true });
    try {
      const bgPath = await this.ensureBg();
      await renderCertificate({
        canvas: this._canvas,
        ctx: this._ctx,
        tpl: this._tpl,
        fields: this.data.fields,
        bgPath,
        photoPath: this.data.photoPath || ''
      });
    } catch (e) {
      console.error('render fail', e);
      wx.showToast({ title: '预览失败，检查域名', icon: 'none' });
    } finally {
      this.setData({ rendering: false });
    }
  },

  onField(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    this.setData({ ['fields.' + key]: value });
    this.scheduleRender();
  },

  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const path = res.tempFiles[0].tempFilePath;
        this.setData({ photoPath: path });
        this.scheduleRender(50);
      }
    });
  },

  clearPhoto() {
    this.setData({ photoPath: '' });
    this.scheduleRender(50);
  },

  persistPhoto(path) {
    if (!path) return Promise.resolve('');
    try {
      const fs = wx.getFileSystemManager();
      const dest = `${wx.env.USER_DATA_PATH}/photo_${this._projId}.jpg`;
      fs.copyFileSync(path, dest);
      return Promise.resolve(dest);
    } catch (e) {
      return Promise.resolve(path);
    }
  },

  async saveProject() {
    const photoPath = await this.persistPhoto(this.data.photoPath);
    if (photoPath && photoPath !== this.data.photoPath) {
      this.setData({ photoPath });
    }
    const proj = projects.upsert({
      id: this._projId,
      tplId: this.data.tplId,
      name: (this.data.fields.name || '未命名') + ' · ' + this.data.tplName,
      fields: this.data.fields,
      photoPath,
      thumb: this._tpl.thumbUrl
    });
    if (cloud.enabled()) {
      const r = await cloud.pushOne(proj);
      wx.showToast({ title: r.ok ? '已保存并同步云端' : '已保存（云同步失败）', icon: 'none' });
    } else {
      wx.showToast({ title: '已保存到「我的」', icon: 'success' });
    }
  },

  goBatch() {
    const fields = encodeURIComponent(JSON.stringify(this.data.fields));
    let url = '/pages/batch/batch?tpl=' + encodeURIComponent(this.data.tplId) + '&fields=' + fields;
    if (this.data.photoPath) {
      url += '&photo=' + encodeURIComponent(this.data.photoPath);
    }
    wx.navigateTo({ url });
  },

  async exportImage() {
    if (!this._canvas) return;
    await this.doRender();
    wx.canvasToTempFilePath({
      canvas: this._canvas,
      destWidth: this._tpl.canvas.w,
      destHeight: this._tpl.canvas.h,
      fileType: 'png',
      success: res => {
        wx.showActionSheet({
          itemList: ['保存到相册', '预览并转发'],
          success: a => {
            if (a.tapIndex === 0) this.saveAlbum(res.tempFilePath);
            if (a.tapIndex === 1) this.shareImage(res.tempFilePath);
          }
        });
      },
      fail: err => {
        console.error(err);
        wx.showToast({ title: '导出失败', icon: 'none' });
      }
    });
  },

  saveAlbum(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: err => {
        if (err.errMsg && err.errMsg.indexOf('auth') >= 0) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存到相册',
            success: m => { if (m.confirm) wx.openSetting(); }
          });
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      }
    });
  },

  shareImage(filePath) {
    // 展示图片，用户可长按转发；同时提供预览
    wx.previewImage({ urls: [filePath], current: filePath });
    wx.showToast({ title: '长按图片可转发', icon: 'none' });
  },

  onShareAppMessage() {
    return {
      title: (this.data.fields.name || '') + '的奖状 · ' + this.data.tplName,
      path: '/pages/editor/editor?tpl=' + encodeURIComponent(this.data.tplId)
    };
  }
});
