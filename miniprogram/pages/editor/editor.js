const catalog = require('../../utils/catalog');
const { renderCertificate } = require('../../utils/draw');
const projects = require('../../utils/projects');
const assetCache = require('../../utils/asset-cache');
const presets = require('../../utils/presets');

Page({
  data: {
    tplId: '',
    tplName: '',
    hasPhoto: false,
    hasLabel: false,
    titleInBg: false,
    editTab: 'content',
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
    thumbUrl: '',
    showThumb: true,
    rendering: false,
    loadHint: '正在加载模板…',
    tip: ''
  },

  _tpl: null,
  _canvas: null,
  _ctx: null,
  _bgPath: '',
  _bgPromise: null,
  _projId: '',
  _timer: null,
  _dispW: 300,
  _dispH: 450,
  _previewScale: 1,
  _exportMode: false,

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
    this._dispW = Math.floor(tpl.canvas.w * scale);
    this._dispH = Math.floor(tpl.canvas.h * scale);
    this._previewScale = scale;

    if (!fields.sealText) fields.sealText = fields.issuer || tpl.defaults.sealText || '荣誉专用章';
    if (fields.label == null) fields.label = tpl.defaults.label || '';

    // 立刻展示缩略图占位；同时开始下背景（与画布初始化并行）
    this._bgPromise = assetCache.getCachedFile(tpl.bgUrl, 'bg_' + tpl.id);

    const titleInBg = !(tpl.layers || []).some(l => l.type === 'text' && l.id === 'title');
    this.setData({
      tplId: tpl.id,
      tplName: tpl.name,
      hasPhoto: !!tpl.hasPhoto,
      hasLabel: !!(fields.label || tpl.defaults.label),
      titleInBg,
      editTab: 'content',
      fields,
      photoPath,
      thumbUrl: tpl.thumbUrl,
      showThumb: true,
      loadHint: '正在加载高清预览…',
      canvasStyle: 'width:' + this._dispW + 'px;height:' + this._dispH + 'px;'
    });
    wx.setNavigationBarTitle({ title: tpl.name });
  },

  switchTab(e) {
    this.setData({ editTab: e.currentTarget.dataset.tab });
  },

  async pickPreset(e) {
    const kind = e.currentTarget.dataset.preset;
    const map = {
      suffix: presets.SUFFIX_PRESETS,
      honor: presets.HONOR_PRESETS,
      reason: presets.REASON_PRESETS,
      closing: presets.CLOSING_PRESETS,
      issuer: presets.ISSUER_PRESETS
    };
    const list = map[kind];
    if (!list) return;
    const val = await presets.pick('选择', list);
    if (!val) return;
    let next = val;
    if (kind === 'suffix') next = String(val).replace(/：$/, '');
    this.setData({ ['fields.' + kind]: next });
    this.scheduleRender(50);
  },

  onReady() {
    Promise.all([this.initCanvas(false), this._bgPromise])
      .then(([, bgPath]) => {
        this._bgPath = bgPath;
        return this.doRender(true);
      })
      .then(() => {
        this.setData({ showThumb: false, loadHint: '' });
      })
      .catch(err => {
        console.error(err);
        this.setData({
          loadHint: '高清预览加载失败，可检查网络后重试',
          showThumb: true
        });
        wx.showToast({ title: '预览加载慢/失败', icon: 'none' });
      });
  },

  onUnload() {
    if (this._timer) clearTimeout(this._timer);
  },

  /**
   * @param {boolean} full 是否全分辨率（导出用）
   */
  initCanvas(full) {
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
          const dpr = Math.min(wx.getSystemInfoSync().pixelRatio || 2, 2);
          if (full) {
            canvas.width = tpl.canvas.w * dpr;
            canvas.height = tpl.canvas.h * dpr;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            this._exportMode = true;
          } else {
            // 预览只按屏幕宽度绘制，大幅降低首屏耗时
            canvas.width = this._dispW * dpr;
            canvas.height = this._dispH * dpr;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr * this._previewScale, dpr * this._previewScale);
            this._exportMode = false;
          }
          this._canvas = canvas;
          this._ctx = ctx;
          resolve();
        });
    });
  },

  ensureBg() {
    if (this._bgPath) return Promise.resolve(this._bgPath);
    if (!this._bgPromise) {
      this._bgPromise = assetCache.getCachedFile(this._tpl.bgUrl, 'bg_' + this._tpl.id);
    }
    return this._bgPromise.then(p => {
      this._bgPath = p;
      return p;
    });
  },

  scheduleRender(delay) {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this.doRender(false), delay == null ? 180 : delay);
  },

  async doRender(isFirst) {
    if (!this._canvas || !this._ctx || !this._tpl) return;
    if (this.data.rendering && !isFirst) {
      this.scheduleRender(120);
      return;
    }
    this.setData({ rendering: true });
    try {
      const bgPath = await this.ensureBg();
      // 若上次导出切到了全分辨率，预览前切回低分辨率
      if (this._exportMode && !isFirst) {
        await this.initCanvas(false);
      }
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
      if (!this.data.showThumb) {
        wx.showToast({ title: '预览失败', icon: 'none' });
      }
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
    projects.upsert({
      id: this._projId,
      tplId: this.data.tplId,
      name: (this.data.fields.name || '未命名') + ' · ' + this.data.tplName,
      fields: this.data.fields,
      photoPath,
      thumb: this._tpl.thumbUrl
    });
    wx.showToast({ title: '已保存到「我的」', icon: 'success' });
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
    wx.showLoading({ title: '导出中', mask: true });
    try {
      await this.initCanvas(true);
      const bgPath = await this.ensureBg();
      await renderCertificate({
        canvas: this._canvas,
        ctx: this._ctx,
        tpl: this._tpl,
        fields: this.data.fields,
        bgPath,
        photoPath: this.data.photoPath || ''
      });
      await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: this._canvas,
          destWidth: this._tpl.canvas.w,
          destHeight: this._tpl.canvas.h,
          fileType: 'png',
          success: res => {
            wx.hideLoading();
            wx.showActionSheet({
              itemList: ['保存到相册', '预览并转发'],
              success: a => {
                if (a.tapIndex === 0) this.saveAlbum(res.tempFilePath);
                if (a.tapIndex === 1) this.shareImage(res.tempFilePath);
              },
              complete: () => {
                // 恢复预览分辨率
                this.initCanvas(false).then(() => this.doRender(false));
              }
            });
            resolve();
          },
          fail: reject
        });
      });
    } catch (e) {
      wx.hideLoading();
      console.error(e);
      wx.showToast({ title: '导出失败', icon: 'none' });
      this.initCanvas(false).then(() => this.doRender(false));
    }
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
