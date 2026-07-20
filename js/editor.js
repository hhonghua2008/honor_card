(function () {
  const F = window.fabric;
  const SANS = '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif';
  const SERIF = '"Songti SC","STSong","SimSun",serif';
  const EXPORT_SCALE = 2;
  const PROPS = ['hcType', 'hcId', 'mask', 'frame', 'hcSize', 'selectable', 'evented',
    'sealText', 'sealColor', 'sealSize', 'hcUserImage'];
  const FONTS = [
    { l: '宋体', v: '"Songti SC","STSong","SimSun",serif' },
    { l: '黑体', v: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif' },
    { l: '楷体', v: '"STKaiti","KaiTi","Kaiti SC",serif' },
    { l: '圆体', v: '"Yuanti SC","Hiragino Sans GB",sans-serif' }
  ];

  function toHex(c) {
    if (typeof c === 'string' && c[0] === '#') {
      if (c.length === 4) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      return c.slice(0, 7);
    }
    return '#000000';
  }

  // ===== 签章绘制：透明底 + 红色描边圆章（弧形文字+五角星）=====
  // 背景不填充（透明），仅用红色绘制外圈、五角星与弧形文字，呈现真实印章效果
  function drawSealDataUrl(text, size, color) {
    const s = size || 120;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    const cx = s / 2, cy = s / 2, r = (s / 2) - 4;
    const col = color || '#c1272d';
    ctx.clearRect(0, 0, s, s); // 透明背景，不填充
    // 外圈双环（红色描边）
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(3, s * 0.03);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = Math.max(1.4, s * 0.013);
    ctx.beginPath(); ctx.arc(cx, cy, r - s * 0.05, 0, Math.PI * 2); ctx.stroke();
    // 五角星（红色填充）
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = col;
    ctx.beginPath();
    function star() { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (4 * Math.PI / 5); const x = Math.cos(a) * (r * 0.3), y = Math.sin(a) * (r * 0.3); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.closePath(); }
    star(); ctx.fill();
    // 弧形文字（顶部，红色）：字号自适应，保证清晰可读且不溢出
    ctx.rotate(Math.PI);
    const chars = (text || '荣誉专用章').split('');
    const arcR = r * 0.72;
    const maxFont = s * 0.16;
    // 每个字约占弧长 = π*arcR / N，取 0.95 系数，避免挤在一起
    let fontPx = Math.min(maxFont, (Math.PI * arcR) / Math.max(chars.length, 1) * 0.95);
    fontPx = Math.max(12, fontPx);
    ctx.font = `bold ${fontPx}px "Songti SC","STSong","SimSun",serif`;
    ctx.fillStyle = col;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    chars.forEach((ch, i) => {
      const angle = (Math.PI * (chars.length - 1)) / (chars.length + 1) - (i * Math.PI * (chars.length > 1 ? 1 : 0.5) / Math.max(chars.length - 1, 1));
      const x = Math.cos(angle) * arcR, y = Math.sin(angle) * arcR;
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI / 2); ctx.fillText(ch, 0, 0); ctx.restore();
    });
    ctx.restore();
    return c.toDataURL();
  }

  class Editor {
    constructor(opts) {
      this.template = opts.template;
      this.project = opts.project || null;
      this.view = opts.view;
      this.mode = opts.mode || 'edit';
      this.shareMeta = opts.shareMeta || null;
      this.readonly = this.mode === 'readonly';
      this.history = [];
      this.histIndex = -1;
      this.restoring = false;
      this.pendingPhoto = null;
      this.exporting = false;
      this.render();
    }

    render() {
      const t = this.template;
      const ro = this.readonly;
      const photoBanner = ro && this.shareMeta && this.shareMeta.photosStripped
        ? '<div class="share-banner">📷 分享链接不含照片，另存为我的项目后可重新上传照片</div>' : '';
      this.view.innerHTML = photoBanner + `
        <div class="editor-topbar">
          <button class="btn ghost" id="backBtn">← ${ro ? '返回画廊' : '返回'}</button>
          <div class="etitle">${t.name}${ro ? ' · 预览' : ''}</div>
          <div class="spacer"></div>
          ${ro ? `
            <button class="btn" id="sharePngBtn">PNG</button>
            <button class="btn" id="sharePdfBtn">PDF</button>
            <button class="btn primary" id="saveAsBtn">另存为我的项目</button>
          ` : `
            <button class="btn" id="saveBtn">保存</button>
            <button class="btn" id="shareBtn">分享</button>
            <button class="btn" id="batchBtn" title="CSV/名单批量出图">批量</button>
            <div class="export-group">
              <button class="btn" id="pngBtn">PNG ▾</button>
              <div class="export-menu" id="pngMenu">
                <button data-preset="standard">标准 PNG</button>
                <button data-preset="print">高清 PNG</button>
              </div>
            </div>
            <div class="export-group">
              <button class="btn" id="jpgBtn">JPG ▾</button>
              <div class="export-menu" id="jpgMenu">
                <button data-preset="standard">标准 JPG</button>
                <button data-preset="print">高清 JPG</button>
              </div>
            </div>
            <div class="export-group">
              <button class="btn primary" id="pdfBtn">PDF ▾</button>
              <div class="export-menu" id="pdfMenu">
                <button data-preset="standard">标准 PDF</button>
                <button data-preset="print">高清 PDF</button>
              </div>
            </div>
          `}
        </div>
        ${ro ? '' : `<div class="mobile-bar" id="mobileBar">
          <button type="button" class="mbtn" id="toolsToggle">🛠 工具</button>
          <button type="button" class="mbtn" id="contentToggle">📝 内容</button>
          <button type="button" class="mbtn" id="propsToggle">⚙️ 属性</button>
        </div>
        <div class="mobile-backdrop" id="mobileBackdrop"></div>`}
        <div class="editor-layout${ro ? ' readonly' : ''}">
          ${ro ? '' : `
          <aside class="left-tools" id="leftTools">
            <button class="tool" id="addTextBtn">＋ 文字</button>
            <button class="tool" id="addPhotoBtn">＋ 照片</button>
            <button class="tool" id="addSealBtn">＋ 签章</button>
            <button class="tool" id="addLogoBtn">＋ Logo ${window.HC_Plan && !window.HC_Plan.isPro() ? '<span class="tool-pro">Pro</span>' : ''}</button>
            <button class="tool" id="undoBtn">↶ 撤销</button>
            <button class="tool" id="redoBtn">↷ 重做</button>
            <div class="ctpl-box">
              <div class="theme-title">内容模版</div>
              <select id="ctplSelect" class="ctpl-select">
                <option value="">— 选择场景一键套用 —</option>
              </select>
              <div class="ctpl-form" id="ctplForm">
                <label>标题<input id="fTitle" type="text" placeholder="奖状"></label>
                <label>称呼<input id="fLabel" type="text" placeholder="兹证明"></label>
                <label>姓名<input id="fName" type="text" placeholder="XXX 同学"></label>
                <label>正文<input id="fReason" type="text" placeholder="在…中表现优秀，被评为"></label>
                <label>荣誉名<input id="fHonor" type="text" placeholder="三好学生（独立居中一行）"></label>
                <label>结语<input id="fClosing" type="text" placeholder="特发此状，以资鼓励。"></label>
                <label>日期<input id="fDate" type="text" placeholder="2026年7月13日"></label>
                <label>落款<input id="fIssuer" type="text" placeholder="HonorCard 荣誉颁发"></label>
              </div>
            </div>
            <div class="theme-box" id="themeBox"></div>
          </aside>`}
          <div class="canvas-wrap" id="canvasWrap"></div>
          ${ro ? '' : `<aside class="right-panel" id="propPanel">
            <div class="hint">点击画布上的元素进行编辑</div>
          </aside>`}
          <input type="file" id="photoInput" accept="image/*">
          <input type="file" id="logoInput" accept="image/*">
        </div>`;

      const wrap = this.view.querySelector('#canvasWrap');
      const { scale, dispW, dispH } = this.computeDisplaySize();
      const canvasEl = document.createElement('canvas');
      canvasEl.id = 'c';
      wrap.appendChild(canvasEl);
      this.canvas = new F.Canvas('c', { width: dispW, height: dispH, backgroundColor: '#ffffff', preserveObjectStacking: true });
      window.hcCanvas = this.canvas;
      this.scale = scale; this.dispW = dispW; this.dispH = dispH;
      this.canvas.setZoom(scale);
      window.hcEditorInst = this;
      // 视口变化时重新自适应，避免证书过大/过小或需要滚动
      this._onResize = () => this.fitCanvas();
      window.addEventListener('resize', this._onResize);

      this.buildThemeBox();
      if (!this.readonly) {
        this.buildContentPanel();
        if (window.HC_Onboarding) window.HC_Onboarding.showEditorTips(this.view);
      }
      this.loadScene();
      this.bind();
      if (!this.readonly) this.bindMobile();
    }

    _isMobile() { return window.innerWidth <= 768; }

    bindMobile() {
      const backdrop = this.view.querySelector('#mobileBackdrop');
      const left = this.view.querySelector('#leftTools');
      const panel = this.view.querySelector('#propPanel');
      const closeAll = () => {
        left && left.classList.remove('open');
        panel && panel.classList.remove('open');
        backdrop && backdrop.classList.remove('show');
      };
      const toggle = (el) => {
        if (!el || !this._isMobile()) return;
        const wasOpen = el.classList.contains('open');
        closeAll();
        if (!wasOpen) {
          el.classList.add('open');
          backdrop && backdrop.classList.add('show');
        }
      };
      this.view.querySelector('#toolsToggle')?.addEventListener('click', () => toggle(left));
      this.view.querySelector('#contentToggle')?.addEventListener('click', () => {
        toggle(left);
        left && left.querySelector('#ctplForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      this.view.querySelector('#propsToggle')?.addEventListener('click', () => toggle(panel));
      backdrop?.addEventListener('click', closeAll);
      this._closeMobilePanels = closeAll;
    }

    _openMobileProps() {
      if (!this._isMobile()) return;
      const panel = this.view.querySelector('#propPanel');
      const backdrop = this.view.querySelector('#mobileBackdrop');
      if (panel) {
        panel.classList.add('open');
        backdrop && backdrop.classList.add('show');
      }
    }

    // 根据可用区域（宽+视口高）计算证书显示尺寸，保证完整可见、无需滚动
    computeDisplaySize() {
      const t = this.template;
      const wrap = this.view.querySelector('#canvasWrap');
      const mobile = this._isMobile ? this._isMobile() : window.innerWidth <= 768;
      const padX = mobile ? 12 : 32, padY = mobile ? 8 : 20;
      const chromeH = mobile ? (this.readonly ? 100 : 130) : 150;
      const availW = Math.max(280, (wrap.clientWidth || window.innerWidth) - padX * 2);
      const availH = Math.max(200, (window.innerHeight - chromeH) - padY * 2);
      const scale = Math.min(availW / t.canvas.w, availH / t.canvas.h);
      return { scale, dispW: Math.round(t.canvas.w * scale), dispH: Math.round(t.canvas.h * scale) };
    }

    fitCanvas() {
      const { scale, dispW, dispH } = this.computeDisplaySize();
      this.scale = scale; this.dispW = dispW; this.dispH = dispH;
      this.canvas.setDimensions({ width: dispW, height: dispH });
      this.canvas.setZoom(scale);
      this.canvas.renderAll();
    }

    buildThemeBox() {
      const box = this.view.querySelector('#themeBox');
      if (!box) return;
      const accent = this.getAccentColor();
      box.innerHTML = `
        <div class="theme-title">配色</div>
        <label class="accent-picker">强调色（标题+荣誉名）
          <input type="color" id="accentColor" value="${toHex(accent)}">
        </label>
        <div class="theme-presets">` +
        this.template.themePresets.map((p, i) => {
          const preset = this.normalizePreset(p);
          return `<button class="theme-btn" data-i="${i}" style="background:${preset.accent};color:${preset.body}">${preset.name}</button>`;
        }).join('') +
        `</div>`;
      box.querySelector('#accentColor').oninput = (e) => this.applyAccentColor(e.target.value);
      box.querySelector('#accentColor').onchange = () => this.pushHistory();
      box.querySelectorAll('.theme-btn').forEach(b => {
        b.onclick = () => this.applyTheme(+b.dataset.i);
      });
    }

    normalizePreset(p) {
      if (window.HC_THEME && window.HC_THEME.normalizeThemes) {
        return window.HC_THEME.normalizeThemes([p])[0];
      }
      return { accent: p.accent || p.title, body: p.body || p.text, muted: p.muted || p.body || p.text, name: p.name };
    }

    getAccentColor() {
      const title = this.canvas && this.canvas.getObjects().find(o => o.hcType === 'text' && o.hcId === 'title');
      if (title) return toHex(title.fill);
      const p = this.normalizePreset(this.template.themePresets[0]);
      return toHex(p.accent);
    }

    applyAccentColor(color) {
      this.canvas.getObjects().forEach(o => {
        if (o.hcType === 'text' && (o.hcId === 'title' || o.hcId === 'honor')) o.set('fill', color);
      });
      this.canvas.renderAll();
    }

    applyTheme(i) {
      const p = this.normalizePreset(this.template.themePresets[i]);
      const accentIds = (window.HC_THEME && window.HC_THEME.ACCENT_IDS) || ['title', 'honor'];
      const mutedIds = (window.HC_THEME && window.HC_THEME.MUTED_IDS) || ['issuer', 'date'];
      this.canvas.getObjects().forEach(o => {
        if (o.hcType !== 'text') return;
        if (accentIds.includes(o.hcId)) o.set('fill', p.accent);
        else if (mutedIds.includes(o.hcId)) o.set('fill', p.muted);
        else o.set('fill', p.body);
      });
      const accentInp = this.view.querySelector('#accentColor');
      if (accentInp) accentInp.value = toHex(p.accent);
      this.canvas.renderAll();
      this.pushHistory();
    }

    // ===== 内容模版面板 =====
    buildContentPanel() {
      const sel = this.view.querySelector('#ctplSelect');
      const groups = {};
      (window.HC_CONTENT_PRESETS || []).forEach((p, i) => {
        (groups[p.group] = groups[p.group] || []).push({ p, i });
      });
      sel.innerHTML = '<option value="">— 选择场景一键套用 —</option>' +
        Object.keys(groups).map(g =>
          `<optgroup label="${g}">` + groups[g].map(({ p, i }) =>
            `<option value="${i}">${p.label}</option>`).join('') + '</optgroup>'
        ).join('');
      sel.onchange = () => {
        const i = +sel.value;
        if (isNaN(i)) return;
        this.applyContentPreset(window.HC_CONTENT_PRESETS[i]);
        sel.value = '';
      };

      const map = [
        ['fTitle', 'title'], ['fLabel', 'recipient_label'], ['fName', 'recipient'],
        ['fReason', 'reason'], ['fHonor', 'honor'], ['fClosing', 'closing'],
        ['fDate', 'date'], ['fIssuer', 'issuer']
      ];
      map.forEach(([fid, lid]) => {
        const inp = this.view.querySelector('#' + fid);
        if (!inp) return;
        inp.oninput = () => { this.setTextLayer(lid, inp.value); };
        inp.onchange = () => { this.setTextLayer(lid, inp.value); this.pushHistory(); };
      });
      setTimeout(() => this.refreshForm(), 50);
    }

    applyContentPreset(p) {
      this.setTextLayer('title', p.title);
      if (p.label2 !== undefined && p.label2 !== '') this.setTextLayer('recipient_label', p.label2);
      this.setTextLayer('recipient', 'XXX ' + p.suffix + '：');
      this.setTextLayer('reason', p.reason);
      if (p.honor) this.ensureHonorLayer();
      this.setTextLayer('honor', p.honor || '');
      this.setTextLayer('closing', p.closing || '');
      this.setTextLayer('issuer', p.issuer);
      this.canvas.renderAll();
      this.refreshForm();
      this.pushHistory();
    }

    setTextLayer(id, text) {
      const o = this.canvas.getObjects().find(o => o.hcType === 'text' && o.hcId === id);
      if (o) { o.set('text', text); this.canvas.renderAll(); }
    }
    // 荣誉名（如"三好学生"）需要独立居中一行。模板若无该图层，套用内容模版时动态创建
    ensureHonorLayer() {
      let o = this.canvas.getObjects().find(x => x.hcType === 'text' && x.hcId === 'honor');
      if (o) return o;
      const t = this.template, land = this.isLandscape(), cx = t.canvas.w / 2;
      const hasPhoto = this.canvas.getObjects().some(x => x.hcType === 'photo');
      // 与 build()/buildLand() 中的位置保持一致（照片在左侧，荣誉名居中于右侧文字区）
      let left, top, fs;
      if (land) {
        if (hasPhoto) { left = 680; top = 430; fs = 44; }
        else { left = cx; top = 480; fs = 46; }
      } else {
        if (hasPhoto) { left = 617; top = 671; fs = 60; }
        else { left = cx; top = 756; fs = 64; }
      }
      o = new F.IText('', {
        left, top, originX: 'center', originY: 'center', textAlign: 'center',
        fontSize: fs, fontWeight: 'bold', fontFamily: SERIF,
        fill: this.normalizePreset(t.themePresets[0]).accent, hcType: 'text', hcId: 'honor'
      });
      this.canvas.add(o);
      return o;
    }
    getTextLayer(id) {
      const o = this.canvas.getObjects().find(o => o.hcType === 'text' && o.hcId === id);
      return o ? o.text : '';
    }
    refreshForm() {
      const map = [['fTitle','title'],['fLabel','recipient_label'],['fName','recipient'],['fReason','reason'],['fHonor','honor'],['fClosing','closing'],['fDate','date'],['fIssuer','issuer']];
      map.forEach(([fid,lid]) => {
        const inp = this.view.querySelector('#' + fid);
        if (inp && document.activeElement !== inp) inp.value = this.getTextLayer(lid);
      });
    }

    loadScene() {
      const t = this.template;
      if (this.project && this.project.scene) {
        this.restoring = true;
        this.canvas.loadFromJSON(this.project.scene, () => {
          this.canvas.renderAll();
          this._restoreStrippedPhotos();
          this.restoring = false;
          this.pushHistory();
          this._applyReadonly();
          this.onSelect();
        });
        return;
      }
      this._loadBgImage(t.bg, t.bgFallback || t.bg, (imgEl) => {
        const bg = new F.Image(imgEl);
        const sc = Math.max(t.canvas.w / bg.width, t.canvas.h / bg.height);
        bg.set({ originX:'center',originY:'center',left:t.canvas.w/2,top:t.canvas.h/2,scaleX:sc,scaleY:sc,
          selectable:false,evented:false,hcType:'bg' });
        this.canvas.add(bg); this.canvas.sendToBack(bg);
        t.layers.forEach(l => this.addLayer(l));
        this.canvas.renderAll();
        this.pushHistory();
        this._applyReadonly();
      });
    }

    _loadBgImage(url, fallback, cb) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => cb(img);
      img.onerror = () => {
        if (fallback && url !== fallback) {
          const img2 = new Image();
          img2.crossOrigin = 'anonymous';
          img2.onload = () => cb(img2);
          img2.onerror = () => window.HC_UI && window.HC_UI.toast('模板背景加载失败', 'error');
          img2.src = fallback;
        }
      };
      img.src = url;
    }

    _restoreStrippedPhotos() {
      this.canvas.getObjects().forEach(o => {
        if (o.hcType === 'photo' && (o.hcPhotoStripped || (!o.hcUserImage && this.readonly)) && !o.hcUserImage) {
          const size = o.hcSize || 300;
          const mask = o.mask || 'square';
          o.setElement(this.placeholderEl(size, mask));
          if (!o.clipPath) o.clipPath = this.makeClip(mask, size);
          o.dirty = true;
        }
      });
      this.canvas.renderAll();
    }

    _applyReadonly() {
      if (!this.readonly) return;
      this.canvas.selection = false;
      this.canvas.skipTargetFind = true;
      this.canvas.getObjects().forEach(o => {
        o.selectable = false;
        o.evented = false;
      });
      this.canvas.renderAll();
    }

    addLayer(l) {
      if (l.type === 'text') {
        const common = {
          left:l.left,top:l.top,originX:l.originX||'center',originY:l.originY||'center',
          textAlign:l.textAlign||'center',fill:l.fill,fontFamily:l.fontFamily,
          fontWeight:l.fontWeight||'normal',fontSize:l.fontSize,hcType:'text',hcId:l.id,
          charSpacing: l.charSpacing || 0
        };
        let obj;
        if (l.width) obj = new F.Textbox(l.text,Object.assign({width:l.width,lineHeight:l.lineHeight||1.4,splitByGrapheme:true},common));
        else obj = new F.IText(l.text,common);
        this.canvas.add(obj);
      } else if (l.type === 'photo') {
        this.addPhoto(l);
      } else if (l.type === 'seal') {
        this.addSealLayer(l);
      }
    }

    // ===== 遮罩系统：circle / rounded / square 三种形状 =====
    // 使用相对定位（非 absolutePositioned），遮罩自动居中于照片对象中心
    // 配合 cover 缩放（scaleX/Y > 1）使图片填满遮罩区域，多余部分被裁切
    makeClip(mask, size) {
      switch(mask) {
        case 'circle':
          return new F.Circle({ radius:size/2, originX:'center',originY:'center',left:0,top:0 });
        case 'square':
          return new F.Rect({ width:size,height:size,rx:0,ry:0,originX:'center',originY:'center',left:0,top:0 });
        default: // rounded
          return new F.Rect({ width:size,height:size,rx:24,ry:24,originX:'center',originY:'center',left:0,top:0 });
      }
    }

    makeFrame(mask, size, left, top, id) {
      const base = { originX:'center',originY:'center',left,top,fill:'transparent',
        stroke:'#d4af37',strokeWidth:8,selectable:false,evented:false,hcType:'photoFrame',
        hcId: id || 'frame' };
      if (mask==='circle') return new F.Circle(Object.assign({radius:size/2},base));
      if (mask==='square') return new F.Rect(Object.assign({width:size,height:size},base));
      return new F.Rect(Object.assign({width:size,height:size,rx:24,ry:24},base));
    }

    // ===== 占位图绘制：同步生成 Canvas（非异步 Image）=====
    // 直接返回 HTMLCanvasElement，Fabric.js 可立即渲染，解决占位图初始不显示的问题
    _drawPlaceholderCanvas(size, mask) {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      // 半透明底，便于在浅色证书上也能看见
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      const path = () => {
        if (mask === 'circle') { ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2); }
        else if (mask === 'square') { ctx.beginPath(); ctx.rect(2, 2, size - 4, size - 4); }
        else { const r = 26; ctx.beginPath(); ctx.moveTo(r, 2); ctx.arcTo(size - 2, 2, size - 2, size - 2, r); ctx.arcTo(size - 2, size - 2, 2, size - 2, r); ctx.arcTo(2, size - 2, 2, 2, r); ctx.arcTo(2, 2, size - 2, 2, r); ctx.closePath(); }
      };
      path(); ctx.fill();
      // 虚线金边：明确标识这是一个可点击的照片槽位
      ctx.setLineDash([10, 8]); ctx.lineWidth = 4; ctx.strokeStyle = '#c9a227';
      path(); ctx.stroke(); ctx.setLineDash([]);
      // 文案：提示用户点击上传
      ctx.fillStyle = '#8a6d1f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = Math.round(size * 0.18) + 'px sans-serif'; ctx.fillText('📷', size / 2, size / 2 - size * 0.13);
      ctx.font = 'bold ' + Math.round(size * 0.11) + 'px sans-serif'; ctx.fillText('点击添加照片', size / 2, size / 2 + size * 0.14);
      return c;
    }
    // 返回 dataURL（用于导出/预览等需要 URL 的场景）
    placeholderDataURL(size, mask) { return this._drawPlaceholderCanvas(size, mask).toDataURL(); }
    // 返回同步 Canvas 元素（用于 Fabric.Image 构造，立即渲染）
    placeholderEl(size, mask) { return this._drawPlaceholderCanvas(size, mask); }

    addPhoto(l){
      const size=l.width, el=this.placeholderEl(size,l.mask);
      const img=new F.Image(el,{
        left:l.left,top:l.top,originX:'center',originY:'center',
        hcType:'photo',hcId:l.id,mask:l.mask,frame:!!l.frame,hcSize:size
      });
      img.clipPath=this.makeClip(l.mask,size);
      this.canvas.add(img);
      if(l.frame)this.canvas.add(this.makeFrame(l.mask,size,l.left,l.top,l.id));
    }

    syncFrame(target){
      if(!target||target.hcType!=='photo')return;
      const fr=this.canvas.getObjects().find(o=>o.hcType==='photoFrame'&&o.hcId===target.hcId);
      if(fr){fr.set({left:target.left,top:target.top});fr.setCoords();}
    }

    // 将图片以 cover 方式绘制到 size×size 的画布中：
    // 图片精确填满 clipPath 区域，多余部分被裁掉，scaleX/Y 保持 1，避免缩放与 clip 不匹配导致留白
    _coverCanvas(srcImg, size) {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      const iw = srcImg.width || size, ih = srcImg.height || size;
      const sc = Math.max(size / iw, size / ih); // cover
      const dw = iw * sc, dh = ih * sc;
      ctx.drawImage(srcImg, (size - dw) / 2, (size - dh) / 2, dw, dh);
      return c;
    }

    replacePhoto(obj,url){
      const img=new Image();
      img.onload=()=>{
        const size=obj.hcSize||(obj.clipPath&&obj.clipPath.radius?obj.clipPath.radius*2:300);
        // 先按 cover 把图片绘入 size×size 画布，保证填满遮罩且无空白
        const coverCanvas=this._coverCanvas(img,size);
        const left=obj.left,top=obj.top,mask=obj.mask,hasFrame=!!obj.frame;
        const fr=this.canvas.getObjects().find(o=>o.hcType==='photoFrame'&&o.hcId===obj.hcId);
        this.canvas.remove(obj);if(fr)this.canvas.remove(fr);
        const newImg=new F.Image(coverCanvas,{
          left,top,originX:'center',originY:'center',
          scaleX:1,scaleY:1,
          hcType:'photo',hcId:obj.hcId,mask:mask,frame:hasFrame,hcSize:size,hcUserImage:true
        });
        newImg.clipPath=this.makeClip(mask,size);
        this.canvas.add(newImg);
        if(hasFrame)this.canvas.add(this.makeFrame(mask,size,left,top,obj.hcId));
        this.canvas.renderAll();this.pushHistory();
      };
      img.src=url;
    }

    addTextTool(){
      const t=this.template;
      const obj=new F.IText('双击编辑文字',{
        left:t.canvas.w/2,top:t.canvas.h/2,originX:'center',originY:'center',
        fontSize:48,fontFamily:SANS,fill:'#3a2a12',textAlign:'center',
        hcType:'text',hcId:'text_'+Date.now()
      });
      this.canvas.add(obj);this.canvas.setActiveObject(obj);this.canvas.renderAll();
      this.pushHistory();this.onSelect();
    }

    addPhotoTool(){
      const t=this.template,size=300,el=this.placeholderEl(size,'square'),id='photo_'+Date.now();
      const img=new F.Image(el,{left:t.canvas.w/2,top:t.canvas.h/2,originX:'center',originY:'center',
        hcType:'photo',hcId:id,mask:'square',frame:false,hcSize:size});
      img.clipPath=this.makeClip('square',size);
      this.canvas.add(img);this.canvas.setActiveObject(img);this.canvas.renderAll();
      this.pushHistory();this.onSelect();
    }

    addLogoTool() {
      if (window.HC_Plan && !window.HC_Plan.isPro()) {
        window.HC_Pricing && window.HC_Pricing.showUpgradeModal();
        return;
      }
      this.pendingLogoTarget = null;
      const inp = this.view.querySelector('#logoInput');
      if (inp) inp.click();
    }

    addLogoFromUrl(url, replaceObj) {
      const t = this.template;
      const img = new Image();
      img.onload = () => {
        const maxW = t.canvas.w * 0.22;
        const sc = Math.min(1, maxW / img.width);
        const left = replaceObj ? replaceObj.left : t.canvas.w - 120;
        const top = replaceObj ? replaceObj.top : 100;
        if (replaceObj) this.canvas.remove(replaceObj);
        const obj = new F.Image(img, {
          left, top, originX: 'center', originY: 'center',
          scaleX: sc, scaleY: sc,
          hcType: 'logo', hcId: replaceObj ? replaceObj.hcId : ('logo_' + Date.now())
        });
        this.canvas.add(obj);
        this.canvas.setActiveObject(obj);
        this.canvas.renderAll();
        this.pushHistory();
        this.onSelect();
      };
      img.src = url;
    }

    addSealTool(){
      const t=this.template,id='seal_'+Date.now();
      // 默认放在右下区域、往中间挪（与标准落款对齐），字号更大以便看清
      const pos = this.isLandscape()
        ? { left: t.canvas.w - 256, top: 510, size: 120 }
        : { left: 720, top: 1230, size: 150 };
      this.addSealLayer({
        id, text:'荣誉专用章', left: pos.left, top: pos.top,
        size: pos.size, color:'#c1272d'
      });
      this.canvas.renderAll();this.pushHistory();
      this.onSelect();
    }

    isLandscape(){const c=this.template.canvas;return c.w>c.h;}

    addSealLayer(l){
      const url=drawSealDataUrl(l.text,l.size,l.color);
      const img=new Image();img.src=url;
      img.onload=()=>{
        const seal=new F.Image(img,{left:l.left,top:l.top,originX:'center',originY:'center',
          hcType:'seal',hcId:l.id,sealText:l.text||'荣誉专用章',sealColor:l.color||'#c1272d',sealSize:l.size||120});
        this.canvas.add(seal);
        this.canvas.renderAll();
      };
    }

    updateSeal(obj,newText,newColor,newSize){
      const url=drawSealDataUrl(newText,newSize,newColor);
      const img=new Image();img.src=url;
      img.onload=()=>{
        obj.setElement(img);
        obj.set({ scaleX: 1, scaleY: 1 });
        obj.sealText=newText;obj.sealColor=newColor;obj.sealSize=newSize;
        this.canvas.renderAll();this.pushHistory();
      };
    }

    // ===== 事件绑定 =====
    bind(){
      const c=this.canvas;
      if (!this.readonly) {
        c.on('selection:created',()=>this.onSelect());
        c.on('selection:updated',()=>this.onSelect());
        c.on('selection:cleared',()=>this.onSelect());
        c.on('object:modified',()=>{if(!this.restoring)this.pushHistory();});
        c.on('text:changed',()=>{if(!this.restoring){this.refreshForm();this.pushHistory();}});
        c.on('object:removed',()=>{if(!this.restoring)this.pushHistory();});
        c.on('object:moving',e=>this.syncFrame(e.target));
        c.on('mouse:down', (e) => {
          const t = e.target;
          if (t && t.hcType === 'photo' && !t.hcUserImage) {
            this.pendingPhoto = t;
            this.photoInput.click();
          }
        });
      }

      this.view.querySelector('#backBtn').onclick=()=>{location.hash='#/templates';};

      if (this.readonly) {
        this.view.querySelector('#sharePngBtn').onclick=()=>this.downloadPNG('standard');
        this.view.querySelector('#sharePdfBtn').onclick=()=>this.downloadPDF('standard');
      } else {
        this.view.querySelector('#saveBtn').onclick=()=>this.doSave();
        this.view.querySelector('#shareBtn').onclick=()=>this.doShare();
        this.view.querySelector('#batchBtn').onclick=()=>window.HC_Batch && window.HC_Batch.run(this);
        this._bindExportMenu('#pngBtn', '#pngMenu', 'png');
        this._bindExportMenu('#jpgBtn', '#jpgMenu', 'jpg');
        this._bindExportMenu('#pdfBtn', '#pdfMenu', 'pdf');
        this.view.querySelector('#addTextBtn').onclick=()=>this.addTextTool();
        this.view.querySelector('#addPhotoBtn').onclick=()=>this.addPhotoTool();
        this.view.querySelector('#addSealBtn').onclick=()=>this.addSealTool();
        this.view.querySelector('#addLogoBtn').onclick=()=>this.addLogoTool();
        this.view.querySelector('#undoBtn').onclick=()=>this.undo();
        this.view.querySelector('#redoBtn').onclick=()=>this.redo();
        this.photoInput=this.view.querySelector('#photoInput');
        this.photoInput.onchange=(e)=>{
          const f=e.target.files[0];
          if(!f||!this.pendingPhoto)return;
          const r=new FileReader();
          r.onload=ev=>{
            this.showCropModal(ev.target.result, this.pendingPhoto);
          };
          r.readAsDataURL(f);
          this.photoInput.value='';
        };
        const logoInput = this.view.querySelector('#logoInput');
        if (logoInput) {
          logoInput.onchange = (e) => {
            const f = e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = ev => this.addLogoFromUrl(ev.target.result, this.pendingLogoTarget);
            r.readAsDataURL(f);
            logoInput.value = '';
          };
        }
      }
    }

    _bindExportMenu(btnSel, menuSel, type) {
      const btn = this.view.querySelector(btnSel);
      const menu = this.view.querySelector(menuSel);
      btn.onclick = (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
      };
      menu.querySelectorAll('[data-preset]').forEach(b => {
        b.onclick = (e) => {
          e.stopPropagation();
          menu.classList.remove('open');
          const preset = b.dataset.preset;
          if (type === 'png') this.downloadPNG(preset);
          else if (type === 'jpg') this.downloadJPG(preset);
          else this.downloadPDF(preset);
        };
      });
      document.addEventListener('click', () => menu.classList.remove('open'));
    }

    onSelect(){
      if (this.readonly) return;
      const obj=this.canvas.getActiveObject();
      const panel=this.view.querySelector('#propPanel');
      if (!panel) return;
      this.refreshForm();
      if(!obj){panel.innerHTML='<div class="hint">点击画布上的元素进行编辑</div>';return;}
      if(obj.hcType==='text')this.renderTextProps(obj,panel);
      else if(obj.hcType==='photo')this.renderPhotoProps(obj,panel);
      else if(obj.hcType==='seal')this.renderSealProps(obj,panel);
      else if(obj.hcType==='logo')this.renderLogoProps(obj,panel);
      else panel.innerHTML='<div class="hint">该元素不可编辑</div>';
      if (obj && this._isMobile && this._isMobile()) this._openMobileProps();
    }

    renderTextProps(obj,panel){
      panel.innerHTML=`
        <h3>✏️ 文字</h3>
        <label>字体<select id="fFont">${FONTS.map(f=>`<option ${obj.fontFamily===f.v?'selected':''} value='${f.v}'>${f.l}</option>`).join('')}</select></label>
        <label>字号<input id="fSize" type="number" value="${obj.fontSize}" min="12" max="200"></label>
        <label>颜色<input id="fColor" type="color" value="${toHex(obj.fill)}"></label>
        <label class="chk"><input id="fBold" type="checkbox" ${obj.fontWeight==='bold'?'checked':''}> 加粗</label>
        <button class="btn danger" id="delObj">删除元素</button>`;
      panel.querySelector('#fFont').onchange=()=>{obj.set('fontFamily',panel.querySelector('#fFont').value);this.canvas.renderAll();this.pushHistory();};
      panel.querySelector('#fSize').oninput=()=>{obj.set('fontSize',+panel.querySelector('#fSize').value);this.canvas.renderAll();};
      panel.querySelector('#fSize').onchange=()=>this.pushHistory();
      panel.querySelector('#fColor').oninput=()=>{obj.set('fill',panel.querySelector('#fColor').value);this.canvas.renderAll();};
      panel.querySelector('#fColor').onchange=()=>this.pushHistory();
      panel.querySelector('#fBold').onchange=()=>{obj.set('fontWeight',panel.querySelector('#fBold').checked?'bold':'normal');this.canvas.renderAll();this.pushHistory();};
      panel.querySelector('#delObj').onclick=()=>{this.canvas.remove(obj);this.onSelect();};
    }

    renderPhotoProps(obj,panel){
      const empty = !obj.hcUserImage;
      panel.innerHTML=`
        <h3>📷 照片</h3>
        ${empty ? '<div class="photo-empty-hint">👆 点击画布上的照片区域，或下方按钮添加照片</div>' : ''}
        <label>遮罩形状<select id="pMask">
          <option value="circle" ${obj.mask==='circle'?'selected':''}>圆形</option>
          <option value="rounded" ${obj.mask==='rounded'?'selected':''}>圆角方形</option>
          <option value="square" ${obj.mask==='square'?'selected':''}>直角方形</option>
        </select></label>
        <button class="btn${empty?' primary':''}" id="repPhoto">${empty? '＋ 点击添加照片':'替换照片'}</button>
        <button class="btn danger" id="delPhoto">${empty?'删除照片区':'删除照片'}</button>`;
      panel.querySelector('#pMask').onchange=(e)=>{
        const mask=e.target.value;
        obj.mask=mask;
        // 占位图（未上传）需按新形状重绘内容；已上传照片只需更新裁切遮罩
        if(!obj.hcUserImage){
          obj.setElement(this.placeholderEl(obj.hcSize,mask));
        }
        obj.clipPath=this.makeClip(mask,obj.hcSize);
        obj.dirty=true;
        // 边框：移除旧框，按新形状重建
        const fr=this.canvas.getObjects().find(o=>o.hcType==='photoFrame'&&o.hcId===obj.hcId);
        if(fr){this.canvas.remove(fr);}
        if(obj.frame)this.canvas.add(this.makeFrame(mask,obj.hcSize,obj.left,obj.top,obj.hcId));
        this.canvas.renderAll();this.pushHistory();
      };
      panel.querySelector('#repPhoto').onclick=()=>{this.pendingPhoto=obj;this.photoInput.click();};
      panel.querySelector('#delPhoto').onclick=()=>{
        const fr=this.canvas.getObjects().find(o=>o.hcType==='photoFrame'&&o.hcId===obj.hcId);
        if(fr)this.canvas.remove(fr);
        this.canvas.remove(obj);this.onSelect();
      };
    }

    renderSealProps(obj,panel){
      panel.innerHTML=`
        <h3>🔴 签章</h3>
        <label>签章内容<input id="sText" type="text" value="${obj.sealText||''}" placeholder="输入机构名称"></label>
        <label>签章颜色<input id="sColor" type="color" value="${toHex(obj.sealColor)}"></label>
        <label>尺寸<input id="sSize" type="number" value="${obj.sealSize||120}" min="60" max="300"></label>
        <button class="btn danger" id="delObj">删除签章</button>`;
      panel.querySelector('#sText').onchange=()=>{
        this.updateSeal(obj,panel.querySelector('#sText').value,obj.sealColor,+panel.querySelector('#sSize').value);
      };
      panel.querySelector('#sColor').onchange=()=>{
        this.updateSeal(obj,panel.querySelector('#sText').value,panel.querySelector('#sColor').value,+panel.querySelector('#sSize').value);
      };
      panel.querySelector('#sSize').onchange=()=>{
        this.updateSeal(obj,panel.querySelector('#sText').value,obj.sealColor,+panel.querySelector('#sSize').value);
      };
      panel.querySelector('#delObj').onclick=()=>{this.canvas.remove(obj);this.onSelect();};
    }

    renderLogoProps(obj, panel) {
      panel.innerHTML = `
        <h3>🏷️ Logo / 校徽</h3>
        <label>缩放<input id="logoScale" type="range" min="20" max="200" value="${Math.round((obj.scaleX||1)*100)}"></label>
        <button class="btn" id="repLogo">替换图片</button>
        <button class="btn danger" id="delObj">删除 Logo</button>`;
      panel.querySelector('#logoScale').oninput = (e) => {
        const s = +e.target.value / 100;
        obj.set({ scaleX: s, scaleY: s });
        this.canvas.renderAll();
      };
      panel.querySelector('#logoScale').onchange = () => this.pushHistory();
      panel.querySelector('#repLogo').onclick = () => {
        this.pendingLogoTarget = obj;
        this.view.querySelector('#logoInput').click();
      };
      panel.querySelector('#delObj').onclick = () => { this.canvas.remove(obj); this.onSelect(); };
    }

    getPNG(mult){
      const c=this.canvas,t=this.template;
      const zw=c.getZoom(),w=c.getWidth(),h=c.getHeight();
      c.setZoom(1);c.setDimensions({width:t.canvas.w,height:t.canvas.h});c.renderAll();
      const url=c.toDataURL({format:'png',multiplier:mult||EXPORT_SCALE});
      c.setDimensions({width:w,height:h});c.setZoom(zw);c.renderAll();
      return url;
    }

    _exportScale(preset) {
      const p = (window.HC_EXPORT_PRESETS || {})[preset || 'standard'];
      return p ? p.scale : EXPORT_SCALE;
    }

    _gateHQ(preset) {
      if (preset === 'print' && window.HC_Plan && !window.HC_Plan.canExportHQ()) {
        window.HC_Pricing && window.HC_Pricing.showUpgradeModal();
        window.HC_Analytics && window.HC_Analytics.track('hq_export_blocked');
        return false;
      }
      return true;
    }

    async getExportDataUrl(mult) {
      let url = this.getPNG(mult);
      if (window.HC_Plan && window.HC_Plan.needsWatermark() && window.HC_Watermark) {
        url = await window.HC_Watermark.apply(url);
      }
      return url;
    }

    async _withExportLock(fn) {
      if (this.exporting) return;
      this.exporting = true;
      const btns = this.view.querySelectorAll('#pngBtn,#jpgBtn,#pdfBtn,#sharePngBtn,#sharePdfBtn,#batchBtn');
      btns.forEach(b => { if (b) b.disabled = true; });
      try { await fn(); } finally {
        this.exporting = false;
        btns.forEach(b => { if (b) b.disabled = false; });
      }
    }

    downloadPNG(preset) {
      if (!this._gateHQ(preset)) return;
      this._withExportLock(async () => {
        const scale = this._exportScale(preset);
        const url = await this.getExportDataUrl(scale);
        window.HC_Export.png(url, this.template.name);
        window.HC_Analytics && window.HC_Analytics.track('export_png', { preset, pro: window.HC_Plan && window.HC_Plan.isPro() });
        const wm = window.HC_Plan && window.HC_Plan.needsWatermark();
        window.HC_UI.toast(wm ? 'PNG 已下载（含水印，升级 Pro 可去除）' : 'PNG 已开始下载', 'success');
      });
    }

    downloadJPG(preset) {
      if (!this._gateHQ(preset)) return;
      this._withExportLock(async () => {
        const scale = this._exportScale(preset);
        const url = await this.getExportDataUrl(scale);
        window.HC_Export.jpg(url, this.template.name, 0.92);
        window.HC_Analytics && window.HC_Analytics.track('export_jpg', { preset });
        window.HC_UI.toast('JPG 已开始下载', 'success');
      });
    }

    downloadPDF(preset) {
      if (!this._gateHQ(preset)) return;
      this._withExportLock(async () => {
        const scale = this._exportScale(preset);
        const url = await this.getExportDataUrl(scale);
        window.HC_Export.pdf(url, this.template.name, { landscape: this.isLandscape() });
        window.HC_Analytics && window.HC_Analytics.track('export_pdf', { preset });
        window.HC_UI.toast('PDF 已开始下载', 'success');
      });
    }

    generateThumb() {
      try { return this.getPNG(0.25); } catch (e) { return null; }
    }

    async doSave(){
      const defaultName = this.template.name + ' ' + new Date().toLocaleDateString();
      const name = await window.HC_UI.prompt('保存为', defaultName);
      if (name === null || name === '') return;
      const scene = this.canvas.toJSON(PROPS);
      const thumb = this.generateThumb();
      const proj = {
        id: (this.project && this.project.id && this.project.id !== 'shared') ? this.project.id : ('p_' + Date.now()),
        name, templateId: this.template.id, scene, thumb, updatedAt: Date.now()
      };
      try {
        await window.HC_Storage.save(proj);
        this.project = proj;
        location.hash = '#/editor?proj=' + proj.id;
        window.HC_UI.toast('已保存到「我的项目」', 'success');
        if (window.HC_Cloud) await window.HC_Cloud.pushProject(proj);
      } catch (e) {
        if (e.message === 'QUOTA') {
          window.HC_UI.toast('作品过大（约 ' + Math.round(e.size / 1024 / 1024) + 'MB），请删除部分照片后重试', 'error');
        } else {
          window.HC_UI.toast('保存失败：' + (e.message || e), 'error');
        }
      }
    }

    async doShare(){
      const scene = this.canvas.toJSON(PROPS);
      const hasPhoto = scene.objects && scene.objects.some(o => o.hcType === 'photo' && o.hcUserImage);
      if (hasPhoto) {
        const ok = await window.HC_UI.confirm(
          '分享链接不含照片内容，接收方需自行上传。是否继续生成链接？',
          { title: '分享说明', okLabel: '继续分享' }
        );
        if (!ok) return;
      }
      const payload = window.HC_Share.buildSharePayload(this.template.id, scene);
      const enc = window.HC_Share.encode(payload);
      if (enc.length > 60000) {
        window.HC_UI.toast('作品内容仍过大，已改为直接下载 PNG', 'error');
        this.downloadPNG('standard');
        return;
      }
      const url = location.origin + location.pathname + '#p=' + enc;
      const copied = await window.HC_UI.copyText(url);
      if (copied) {
        window.HC_UI.toast('分享链接已复制到剪贴板', 'success');
      } else {
        await window.HC_UI.modal({
          title: '复制分享链接',
          body: `<input class="hc-modal-input" readonly value="${url.replace(/"/g, '&quot;')}" onclick="this.select()">`,
          buttons: [{ label: '关闭', primary: true }]
        });
      }
    }

    pushHistory(){
      if(this.restoring)return;
      const json=JSON.stringify(this.canvas.toJSON(PROPS));
      this.history=this.history.slice(0,this.histIndex+1);
      this.history.push(json);
      if(this.history.length>40)this.history.shift();
      this.histIndex=this.history.length-1;
    }
    undo(){if(this.histIndex>0){this.histIndex--;this.restore(this.history[this.histIndex]);}}
    redo(){if(this.histIndex<this.history.length-1){this.histIndex++;this.restore(this.history[this.histIndex]);}}
    restore(json){
      this.restoring=true;
      this.canvas.loadFromJSON(json,()=>{this.canvas.renderAll();this.restoring=false;this.onSelect();});
    }

    // ===== 照片裁剪系统 =====
    showCropModal(dataUrl, targetObj) {
      const mask = targetObj.mask || 'circle';
      const size = targetObj.hcSize || 300;
      // 创建弹窗
      const modal = document.createElement('div');
      modal.className = 'crop-modal';
      modal.innerHTML = `
        <div class="crop-inner">
          <div class="crop-title">📐 裁剪照片 — 拖动调整位置，拖角调整大小</div>
          <div class="crop-area" id="cropArea">
            <img id="cropImg" src="${dataUrl}" crossorigin="anonymous">
            <div class="crop-overlay" id="cropOverlay"></div>
          </div>
          <div class="crop-actions">
            <button class="crop-cancel" id="cropCancel">取消</button>
            <button class="crop-confirm" id="cropConfirm">确认裁剪</button>
          </div>
          <div class="crop-tip">提示：按住四角可缩放，拖动中间可移动</div>
        </div>`;
      document.body.appendChild(modal);

      const area = modal.querySelector('#cropArea');
      const imgEl = modal.querySelector('#cropImg');
      const overlay = modal.querySelector('#cropOverlay');

      // 等图片加载后初始化裁剪框
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        this._initCropBox(area, overlay, imgEl, size);
      } else {
        imgEl.onload = () => this._initCropBox(area, overlay, imgEl, size);
      }

      modal.querySelector('#cropCancel').onclick = () => { document.body.removeChild(modal); };
      modal.querySelector('#cropConfirm').onclick = () => {
        const cropped = this._extractCrop(imgEl, area);
        document.body.removeChild(modal);
        if (cropped) this.replacePhoto(targetObj, cropped);
      };
    }

    _initCropBox(area, overlay, imgEl, size) {
      // 计算图片在容器中的实际显示尺寸和偏移
      const areaRect = area.getBoundingClientRect();
      const imgRect = imgEl.getBoundingClientRect();
      const imgW = imgRect.width, imgH = imgRect.height;
      // 裁剪框初始大小：取 min(显示尺寸, 目标size*0.8)，但不超过图片范围
      let boxSize = Math.min(size * 0.8, Math.min(imgW, imgH));
      boxSize = Math.max(boxSize, 60); // 最小 60px
      // 居中
      const boxLeft = (imgW - boxSize) / 2 + (imgRect.left - areaRect.left);
      const boxTop = (imgH - boxSize) / 2 + (imgRect.top - areaRect.top);

      // 创建裁剪框（1:1 正方形）
      const box = document.createElement('div');
      box.className = 'crop-box';
      box.style.cssText = `left:${boxLeft}px;top:${boxTop}px;width:${boxSize}px;height:${boxSize}px;`;
      // 四角手柄
      ['tl','tr','bl','br'].forEach(pos => {
        const h = document.createElement('div');
        h.className = 'crop-handle crop-h-' + pos; box.appendChild(h);
      });
      overlay.appendChild(box);
      this._bindCropDrag(area, box, imgEl, imgRect, areaRect);
    }

    _bindCropDrag(area, box, imgEl, imgRect, areaRect) {
      let dragging = false, resizing = false, resizeHandle = '';
      let startX = 0, startY = 0, startLeft = 0, startTop = 0, startW = 0, startH = 0;

      const onDown = (e) => {
        e.preventDefault();
        const t = e.target;
        if (t.classList.contains('crop-handle')) {
          resizing = true; resizeHandle = t.className.split(' ')[1].replace('crop-h-','');
        } else if (t === box || t.classList.contains('crop-box')) {
          dragging = true;
        } else return;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startY = e.clientY || (e.touches && e.touches[0].clientY);
        startLeft = box.offsetLeft; startTop = box.offsetTop;
        startW = box.offsetWidth; startH = box.offsetHeight;
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, {passive:false}); document.addEventListener('touchend', onUp);
      };

      const onMove = (e) => {
        e.preventDefault();
        const cx = e.clientX || (e.touches && e.touches[0].clientX);
        const cy = e.clientY || (e.touches && e.touches[0].clientY);
        const dx = cx - startX, dy = cy - startY;
        if (dragging) {
          // 移动：限制在图片范围内
          const maxL = area.offsetWidth - box.offsetWidth;
          const maxT = area.offsetHeight - box.offsetHeight;
          box.style.left = Math.max(0, Math.min(maxL, startLeft + dx)) + 'px';
          box.style.top = Math.max(0, Math.min(maxT, startTop + dy)) + 'px';
        }
        if (resizing) {
          // 缩放：保持正方形比例，最小 40px
          let delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
          let nw = startW, nh = startH, nl = startLeft, nt = startTop;
          if (resizeHandle === 'br' || resizeHandle === 'tr' || resizeHandle === 'br') {
            nw = Math.max(40, startW + delta); nh = nw;
          } else if (resizeHandle === 'tl') {
            nw = Math.max(40, startW - delta); nh = nw;
            nl = startLeft + (startW - nw); nt = startTop + (startH - nh);
          } else if (resizeHandle === 'tr') {
            nw = Math.max(40, startW + delta); nh = nw;
            nt = startTop + (startH - nh);
          } else if (resizeHandle === 'bl') {
            nw = Math.max(40, startW + delta); nh = nw;
            nl = startLeft + (startW - nw);
          }
          box.style.width = nw + 'px'; box.style.height = nh + 'px';
          box.style.left = nl + 'px'; box.style.top = nt + 'px';
        }
      };

      const onUp = () => {
        dragging = false; resizing = false;
        document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp);
      };

      box.addEventListener('mousedown', onDown);
      box.addEventListener('touchstart', onDown, {passive:false});
    }

    _extractCrop(imgEl, area) {
      const box = area.querySelector('.crop-box');
      if (!box) return null;
      const bx = box.offsetLeft, by = box.offsetTop, bw = box.offsetWidth, bh = box.offsetHeight;
      // 图片的显示位置和尺寸
      const imgRect = imgEl.getBoundingClientRect();
      const areaRect = area.getBoundingClientRect();
      // 图片在容器内的左上角偏移
      const imgOffX = imgRect.left - areaRect.left;
      const imgOffY = imgRect.top - areaRect.top;
      const imgDispW = imgRect.width, imgDispH = imgRect.height;
      // 裁剪框相对于图片的比例
      const sx = (bx - imgOffX) / imgDispW;
      const sy = (by - imgOffY) / imgDispH;
      const sw = bw / imgDispW;
      const sh = bh / imgDispH;
      // 在原始像素上的坐标
      const px = Math.round(sx * imgEl.naturalWidth);
      const py = Math.round(sy * imgEl.naturalHeight);
      const pw = Math.round(sw * imgEl.naturalWidth);
      const ph = Math.round(sh * imgEl.naturalHeight);
      // 用 canvas 提取
      const c = document.createElement('canvas');
      c.width = pw; c.height = ph;
      const ctx = c.getContext('2d');
      ctx.drawImage(imgEl, px, py, pw, ph, 0, 0, pw, ph);
      return c.toDataURL('image/png');
    }
  }

  window.HC_Editor=Editor;
})();
