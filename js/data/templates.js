(function () {
  const SERIF = '"Songti SC","STSong","SimSun",serif';
  const SANS = '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif';

  const TITLE_CS_V = 1200;
  const TITLE_CS_H = 900;
  const SAMPLE_NAME = '张小明';

  function today() {
    const d = new Date();
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  const SCENE_CATEGORIES = {
    all: '全部',
    photo: '照片奖状',
    campus: '校园表扬',
    corporate: '员工表彰',
    activity: '活动荣誉',
    festival: '节日励志'
  };

  /** @typedef {{ name:string, accent:string, body:string, muted:string, title:string, text:string }} ThemePreset */

  function themePreset(name, accent, body, muted) {
    const m = muted != null ? muted : body;
    return { name, accent, body, muted: m, title: accent, text: body };
  }

  function normalizeThemes(themes) {
    return themes.map(p => themePreset(p.name, p.accent || p.title, p.body || p.text, p.muted));
  }

  function tplAssets(bgFile) {
    const base = bgFile.replace(/\.png$/i, '');
    return {
      bg: 'assets/templates/' + base + '-web.png',
      bgFallback: 'assets/templates/' + bgFile,
      thumb: 'assets/templates/thumbs/' + base + '.jpg'
    };
  }

  function inferSceneCategory(opts) {
    if (opts.sceneCategory) return opts.sceneCategory;
    const tags = (opts.tags || []).join(' ');
    if (/可爱|卡通|童趣|动物|恐龙|猫咪|海洋|小熊|小兔|独角兽/.test(tags)) return 'photo';
    if (/企业|商务|正式|奢华|高端/.test(tags)) return 'corporate';
    if (/教师|感恩/.test(tags)) return 'activity';
    if (/志愿|活动|竞赛|运动/.test(tags)) return 'activity';
    if (/节日|国庆|元宵|新春/.test(tags)) return 'festival';
    if (opts.photo) return 'campus';
    return 'campus';
  }

  const SCENE_DEFAULTS = {
    campus: {
      suffix: '同学',
      reason: '在2025-2026学年中德智体美劳全面发展，表现优异，被评为',
      honor: '三好学生',
      closing: '特发此状，以资鼓励。'
    },
    corporate: {
      suffix: '先生/女士',
      reason: '过去一年工作勤恳、业绩突出，',
      honor: '年度优秀员工',
      closing: '特发此证，以资鼓励。'
    },
    activity: {
      suffix: '同志',
      reason: '在志愿服务中热心奉献、温暖他人，',
      honor: '最美志愿者',
      closing: '特发此状，以资鼓励。'
    },
    festival: {
      suffix: '同志',
      reason: '在主题活动中表现突出、积极奉献，',
      honor: '优秀参与者',
      closing: '特发此状，以资鼓励。'
    },
    photo: {
      suffix: '小朋友',
      reason: '在各项活动中表现优异、快乐成长，',
      honor: '进步小明星',
      closing: '特发此表扬状！'
    }
  };

  function resolveContent(opts) {
    const scene = inferSceneCategory(opts);
    const base = SCENE_DEFAULTS[scene] || SCENE_DEFAULTS.campus;
    return {
      suffix: opts.suffix != null ? opts.suffix : base.suffix,
      reason: opts.reason != null ? opts.reason : base.reason,
      honor: opts.honor != null ? opts.honor : base.honor,
      closing: opts.closing != null ? opts.closing : base.closing,
      label: opts.label != null ? opts.label : '',
      sampleName: opts.sampleName || SAMPLE_NAME
    };
  }

  function packTemplate(opts, extra) {
    const assets = tplAssets(opts.bg);
    const layout = opts.layout || (opts.photo ? 'photo-left' : 'classic');
    return Object.assign({
      id: opts.id, name: opts.name,
      category: extra.category,
      tags: extra.tags,
      bg: assets.bg,
      bgFallback: assets.bgFallback,
      thumb: assets.thumb,
      sceneCategory: inferSceneCategory(opts),
      layoutArchetype: layout,
      canvas: extra.canvas,
      themePresets: extra.themePresets,
      layers: extra.layers
    });
  }

  function txt(id, text, left, top, o) {
    return Object.assign({
      type: 'text', id, text, left, top,
      originX: 'center', originY: 'center', textAlign: 'center'
    }, o);
  }

  function box(id, text, left, top, width, o) {
    return Object.assign({
      type: 'text', id, text, left, top, width,
      originX: 'center', originY: 'center', textAlign: 'center'
    }, o);
  }

  function photo(id, mask, left, top, size, frame) {
    return { type: 'photo', id, mask, frame: !!frame, left, top, width: size, height: size, originX: 'center', originY: 'center' };
  }

  function seal(id, text, left, top, size, color) {
    return { type: 'seal', id, text: text || '荣誉专用章', left, top, size: size || 120, color: color || '#c1272d' };
  }

  function themeOf(opts) {
    return normalizeThemes(opts.theme);
  }

  function accentFill(t) { return t[0].accent; }
  function bodyFill(t) { return t[0].body; }
  function mutedFill(t) { return t[0].muted; }

  // ===== 竖版 · 经典左对齐（照片左 / 纯文字）=====
  function build(opts) {
    const W = 1024, H = 1536, cx = W / 2;
    const M = 230;
    const t = themeOf(opts);
    const c = resolveContent(opts);
    const recipient = c.sampleName + ' ' + c.suffix + '：';
    const honor = c.honor;
    const hasH = !!honor;
    const sealText = opts.issuer || opts.sealText || '荣誉颁发';
    const layers = [
      txt('title', (opts.title || '奖状').replace(/\s+/g, ''), cx, 200, {
        fontSize: 88, fontWeight: 'bold', fontFamily: SERIF, fill: accentFill(t), charSpacing: TITLE_CS_V
      })
    ];
    if (opts.photo) {
      layers.push(photo('photo', opts.photo ? 'square' : (opts.mask || 'circle'), 250, 540, opts.size || 260, opts.frame));
      layers.push(txt('recipient', recipient, 440, 368, {
        fontSize: 34, fontWeight: 'bold', fontFamily: SERIF, fill: bodyFill(t), originX: 'left', textAlign: 'left'
      }));
      layers.push(box('reason', c.reason, 440, 513, 430, {
        fontSize: 34, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.55, originX: 'left', textAlign: 'left'
      }));
      if (hasH) layers.push(txt('honor', honor, 617, 671, { fontSize: 60, fontWeight: 'bold', fontFamily: SERIF, fill: accentFill(t) }));
      layers.push(box('closing', c.closing, 440, 738, 350, {
        fontSize: 33, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.6, originX: 'left', textAlign: 'left'
      }));
    } else {
      if (c.label) layers.push(txt('recipient_label', c.label, M, 360, { fontSize: 32, fontFamily: SANS, fill: bodyFill(t), originX: 'left', textAlign: 'left' }));
      layers.push(txt('recipient', recipient, M, 489, { fontSize: 40, fontWeight: 'bold', fontFamily: SERIF, fill: bodyFill(t), originX: 'left', textAlign: 'left' }));
      layers.push(box('reason', c.reason, M, 616, W - 2 * M, { fontSize: 40, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.6, originX: 'left', textAlign: 'left' }));
      if (hasH) layers.push(txt('honor', honor, cx, 756, { fontSize: 64, fontWeight: 'bold', fontFamily: SERIF, fill: accentFill(t) }));
      layers.push(box('closing', c.closing, M, 832, W - 2 * M, { fontSize: 40, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.6, originX: 'left', textAlign: 'left' }));
    }
    layers.push(txt('issuer', opts.issuer || 'HonorCard 荣誉颁发', 720, 1300, { fontSize: 30, fontFamily: SANS, fill: mutedFill(t), originX: 'right', textAlign: 'right' }));
    layers.push(txt('date', today(), 720, 1360, { fontSize: 32, fontFamily: SANS, fill: mutedFill(t), originX: 'right', textAlign: 'right' }));
    layers.push(seal('seal', sealText, 720, 1230, 150, '#c1272d'));
    return packTemplate(Object.assign({}, opts, { layout: opts.layout || (opts.photo ? 'photo-left' : 'classic') }), {
      category: opts.photo ? '照片奖状' : '荣誉证书',
      tags: opts.tags || [],
      canvas: { w: W, h: H }, themePresets: t, layers
    });
  }

  // ===== 竖版 · 居中对称（企业/正式证书）=====
  function buildCenter(opts) {
    const W = 1024, H = 1536, cx = W / 2;
    const t = themeOf(opts);
    const c = resolveContent(opts);
    const recipient = c.sampleName + ' ' + c.suffix + '：';
    const honor = c.honor;
    const hasH = !!honor;
    const sealText = opts.issuer || opts.sealText || '荣誉颁发';
    const layers = [
      txt('title', (opts.title || '荣 誉 证 书').replace(/\s+/g, ''), cx, 200, {
        fontSize: 88, fontWeight: 'bold', fontFamily: SERIF, fill: accentFill(t), charSpacing: TITLE_CS_V
      })
    ];
    if (c.label) layers.push(txt('recipient_label', c.label, cx, 340, { fontSize: 30, fontFamily: SANS, fill: bodyFill(t) }));
    layers.push(txt('recipient', recipient, cx, c.label ? 410 : 380, { fontSize: 42, fontWeight: 'bold', fontFamily: SERIF, fill: bodyFill(t) }));
    layers.push(box('reason', c.reason, cx, 520, 720, { fontSize: 38, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.65 }));
    if (hasH) layers.push(txt('honor', honor, cx, 680, { fontSize: 62, fontWeight: 'bold', fontFamily: SERIF, fill: accentFill(t) }));
    layers.push(box('closing', c.closing, cx, hasH ? 780 : 720, 680, { fontSize: 36, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.6 }));
    layers.push(txt('issuer', opts.issuer || 'HonorCard 荣誉颁发', 720, 1300, { fontSize: 30, fontFamily: SANS, fill: mutedFill(t), originX: 'right', textAlign: 'right' }));
    layers.push(txt('date', today(), 720, 1360, { fontSize: 32, fontFamily: SANS, fill: mutedFill(t), originX: 'right', textAlign: 'right' }));
    layers.push(seal('seal', sealText, 720, 1230, 150, '#c1272d'));
    return packTemplate(Object.assign({}, opts, { layout: 'center' }), {
      category: '荣誉证书',
      tags: opts.tags || [],
      canvas: { w: W, h: H }, themePresets: t, layers
    });
  }

  // ===== 横版构建器 =====
  function buildLand(opts) {
    const W = 1216, H = 712, cx = W / 2;
    const M = 240;
    const t = themeOf(opts);
    const c = resolveContent(opts);
    const recipient = c.sampleName + ' ' + c.suffix + '：';
    const honor = c.honor;
    const hasH = !!honor;
    const sealText = opts.issuer || opts.sealText || '荣誉颁发';
    const layers = [
      txt('title', (opts.title || '荣 誉 证 书').replace(/\s+/g, ''), cx, 90, {
        fontSize: 58, fontWeight: 'bold', fontFamily: SERIF, fill: accentFill(t), charSpacing: TITLE_CS_H
      })
    ];
    if (opts.photo) {
      layers.push(photo('photo', opts.photo ? 'square' : (opts.mask || 'circle'), 240, 360, opts.size || 190, opts.frame));
      layers.push(txt('recipient', recipient, 400, 200, { fontSize: 40, fontWeight: 'bold', fontFamily: SERIF, fill: bodyFill(t), originX: 'left', textAlign: 'left' }));
      layers.push(box('reason', c.reason, 400, 290, 560, { fontSize: 30, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.5, originX: 'left', textAlign: 'left' }));
      if (hasH) layers.push(txt('honor', honor, 680, 430, { fontSize: 44, fontWeight: 'bold', fontFamily: SERIF, fill: accentFill(t), originX: 'center', textAlign: 'center' }));
      layers.push(box('closing', c.closing, 400, 572, 560, { fontSize: 28, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.5, originX: 'left', textAlign: 'left' }));
    } else {
      if (c.label) layers.push(txt('recipient_label', c.label, M, 190, { fontSize: 22, fontFamily: SANS, fill: bodyFill(t), originX: 'left', textAlign: 'left' }));
      layers.push(txt('recipient', recipient, M, c.label ? 270 : 230, { fontSize: 48, fontWeight: 'bold', fontFamily: SERIF, fill: bodyFill(t), originX: 'left', textAlign: 'left' }));
      layers.push(box('reason', c.reason, M, 370, W - 2 * M, { fontSize: 34, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.5, originX: 'left', textAlign: 'left' }));
      if (hasH) layers.push(txt('honor', honor, cx, 480, { fontSize: 46, fontWeight: 'bold', fontFamily: SERIF, fill: accentFill(t) }));
      layers.push(box('closing', c.closing, M, 602, W - 2 * M, { fontSize: 32, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.5, originX: 'left', textAlign: 'left' }));
    }
    layers.push(txt('issuer', opts.issuer || 'HonorCard 荣誉颁发', W - 240, hasH ? 610 : 630, { fontSize: 22, fontFamily: SANS, fill: mutedFill(t), originX: 'right', textAlign: 'right' }));
    layers.push(txt('date', today(), W - 240, hasH ? 652 : 668, { fontSize: 24, fontFamily: SANS, fill: mutedFill(t), originX: 'right', textAlign: 'right' }));
    layers.push(seal('seal', sealText, W - 256, hasH ? 510 : 530, 120, '#c1272d'));
    return packTemplate(Object.assign({}, opts, { layout: opts.layout || 'landscape' }), {
      category: opts.photo ? '照片奖状（横版）' : '荣誉证书（横版）',
      tags: (opts.tags || []).concat(['横版']),
      canvas: { w: W, h: H }, themePresets: t, layers
    });
  }

  // ===== 横版 · 居中对称（企业/正式）=====
  function buildLandCenter(opts) {
    const W = 1216, H = 712, cx = W / 2;
    const t = themeOf(opts);
    const c = resolveContent(opts);
    const recipient = c.sampleName + ' ' + c.suffix + '：';
    const honor = c.honor;
    const hasH = !!honor;
    const sealText = opts.issuer || opts.sealText || '荣誉颁发';
    const layers = [
      txt('title', (opts.title || '荣 誉 证 书').replace(/\s+/g, ''), cx, 90, {
        fontSize: 58, fontWeight: 'bold', fontFamily: SERIF, fill: accentFill(t), charSpacing: TITLE_CS_H
      })
    ];
    if (c.label) layers.push(txt('recipient_label', c.label, cx, 170, { fontSize: 22, fontFamily: SANS, fill: bodyFill(t) }));
    layers.push(txt('recipient', recipient, cx, c.label ? 220 : 200, { fontSize: 44, fontWeight: 'bold', fontFamily: SERIF, fill: bodyFill(t) }));
    layers.push(box('reason', c.reason, cx, 310, 760, { fontSize: 32, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.55 }));
    if (hasH) layers.push(txt('honor', honor, cx, 430, { fontSize: 46, fontWeight: 'bold', fontFamily: SERIF, fill: accentFill(t) }));
    layers.push(box('closing', c.closing, cx, hasH ? 510 : 470, 720, { fontSize: 30, fontFamily: SANS, fill: bodyFill(t), lineHeight: 1.5 }));
    layers.push(txt('issuer', opts.issuer || 'HonorCard 荣誉颁发', W - 240, 610, { fontSize: 22, fontFamily: SANS, fill: mutedFill(t), originX: 'right', textAlign: 'right' }));
    layers.push(txt('date', today(), W - 240, 652, { fontSize: 24, fontFamily: SANS, fill: mutedFill(t), originX: 'right', textAlign: 'right' }));
    layers.push(seal('seal', sealText, W - 256, 510, 120, '#c1272d'));
    return packTemplate(Object.assign({}, opts, { layout: 'landscape-center' }), {
      category: '荣誉证书（横版）',
      tags: (opts.tags || []).concat(['横版']),
      canvas: { w: W, h: H }, themePresets: t, layers
    });
  }

  const CONTENT_PRESETS = [
    { group: '校园', label: '三好学生', title: '奖状', label2: '', suffix: '同学',
      reason: '在2025-2026学年中德智体美劳全面发展，表现优异，被评为', honor: '三好学生', closing: '特发此状，以资鼓励。', issuer: '学校教务处' },
    { group: '校园', label: '优秀少先队员', title: '荣誉证书', label2: '兹证明', suffix: '同学',
      reason: '在少先队活动中积极向上、乐于奉献，', honor: '优秀少先队员', closing: '特发此状，以资鼓励。', issuer: '少先队大队部' },
    { group: '校园', label: '进步之星', title: '奖状', label2: '亲爱的', suffix: '同学',
      reason: '本学期学习态度端正、进步显著，', honor: '进步之星', closing: '特发此状，以资鼓励。', issuer: '班主任' },
    { group: '校园', label: '运动健将', title: '荣誉证书', label2: '兹证明', suffix: '同学',
      reason: '在校运会上顽强拼搏、勇创佳绩，', honor: '运动健将', closing: '特发此状，以资鼓励。', issuer: '体育组' },

    { group: '企业', label: '优秀员工', title: '荣誉证书', label2: '兹证明', suffix: '先生/女士',
      reason: '过去一年工作勤恳、业绩突出，', honor: '年度优秀员工', closing: '特发此证，以资鼓励。', issuer: '人力资源部' },
    { group: '企业', label: '最佳新人', title: '荣誉证书', label2: '兹证明', suffix: '先生/女士',
      reason: '入职以来快速成长、表现亮眼，', honor: '最佳新人奖', closing: '特发此证，以资鼓励。', issuer: '公司管理层' },
    { group: '企业', label: '销售冠军', title: '荣誉证书', label2: '兹证明', suffix: '先生/女士',
      reason: '本季度销售工作勇攀高峰、业绩领先，', honor: '销售冠军', closing: '特发此证，以资鼓励。', issuer: '销售中心' },
    { group: '企业', label: '全勤奖', title: '荣誉证书', label2: '兹证明', suffix: '先生/女士',
      reason: '本年度出勤全勤、恪守岗位，', honor: '全勤奖', closing: '特发此证，以资鼓励。', issuer: '人力资源部' },

    { group: '活动', label: '最美志愿者', title: '志愿者证书', label2: '兹证明', suffix: '同志',
      reason: '在志愿服务中热心奉献、温暖他人，', honor: '最美志愿者', closing: '特发此状，以资鼓励。', issuer: '志愿者协会' },
    { group: '活动', label: '摄影大赛一等奖', title: '获奖证书', label2: '兹证明', suffix: '先生/女士',
      reason: '摄影大赛中作品构思精巧、技艺出众，', honor: '一等奖', closing: '特发此证，以资鼓励。', issuer: '大赛组委会' },
    { group: '活动', label: '征文比赛优秀奖', title: '获奖证书', label2: '兹证明', suffix: '同学',
      reason: '征文比赛中文采斐然、立意新颖，', honor: '优秀奖', closing: '特发此证，以资鼓励。', issuer: '大赛组委会' },

    { group: '节日', label: '国庆优秀参与者', title: '荣誉证书', label2: '兹证明', suffix: '同志',
      reason: '在国庆主题活动中表现突出、积极奉献，', honor: '优秀参与者', closing: '特发此状，以资鼓励。', issuer: '活动组委会' },
    { group: '节日', label: '元宵巧手之星', title: '奖状', label2: '亲爱的', suffix: '小朋友',
      reason: '在元宵游园中心灵手巧、表现优异，', honor: '巧手之星', closing: '特发此状，以资鼓励。', issuer: '社区居委会' },
    { group: '节日', label: '新春团圆奖', title: '荣誉证书', label2: '敬祝', suffix: '女士/先生',
      reason: '过去一年里阖家美满、幸福安康，', honor: '', closing: '特颁此证，以贺新春。', issuer: 'HonorCard 组委会' }
  ];

  const TEMPLATES = [
    build({ id: 'tpl-01', name: '红金荣耀', bg: 'tpl-01-red.png', photo: true, mask: 'circle', frame: true, size: 280,
      title: '荣 誉 证 书', suffix: '先生/女士', reason: '在2026年度表现优异、贡献突出，', honor: '年度杰出贡献', closing: '特发此证，以资鼓励。',
      tags: ['喜庆', '照片', '红金'],
      theme: [
        themePreset('经典金', '#f3d27a', '#fff0c8', '#ffe9c2'),
        themePreset('中国红', '#c1272d', '#fff0c8', '#ffe9c2')
      ] }),

    build({ id: 'tpl-02', name: '粉彩童趣', bg: 'tpl-02-pink.png', photo: true, mask: 'rounded', frame: true, size: 270,
      title: '奖状', label: '亲爱的', reason: '在亲子活动中表现出色、活泼可爱，', honor: '进步小明星', closing: '特发此表扬状！继续加油哦～',
      tags: ['童趣', '照片', '粉'],
      theme: [themePreset('玫瑰粉', '#d6336c', '#7a3b5d'), themePreset('暖白', '#ffffff', '#a14b6e')] }),

    buildCenter({ id: 'tpl-03', name: '蓝金典藏', bg: 'tpl-03-blue.png',
      title: '荣 誉 证 书', label: '兹证明', reason: '在工作中展现专业素养与卓越能力，', closing: '特颁此证，以资表彰。',
      tags: ['正式', '企业', '蓝金'],
      theme: [themePreset('金辉', '#f3d27a', '#eaf2ff', '#c8d8f0'), themePreset('云白', '#ffffff', '#dbe7ff', '#b8cce8')] }),

    build({ id: 'tpl-04', name: '翠绿荣光', bg: 'tpl-04-green.png', photo: true, mask: 'circle', frame: true, size: 280,
      title: '奖状', reason: '在体育竞技中顽强拼搏、超越自我，', honor: '运动健将', closing: '特发此证，以资鼓励！',
      tags: ['运动', '照片', '绿金'],
      theme: [themePreset('金绿', '#f3d27a', '#eafff0'), themePreset('奶白', '#ffffff', '#d6ffe6')] }),

    buildCenter({ id: 'tpl-05', name: '紫韵华章', bg: 'tpl-05-purple.png',
      title: '荣 誉 证 书', label: '兹证明', reason: '在艺术创作中才华横溢、作品精彩绝伦，', closing: '特颁此证，以资表彰。',
      tags: ['艺术', '正式', '紫金'],
      theme: [themePreset('紫金', '#f3d27a', '#f3e9ff', '#dcc8ff'), themePreset('淡紫白', '#ffffff', '#ecd9ff', '#d4b8ff')] }),

    build({ id: 'tpl-06', name: '橙光暖意', bg: 'tpl-06-orange.png', photo: true, mask: 'rounded', frame: true, size: 270,
      title: '志 愿 者 证 书', suffix: '同志', reason: '在公益服务中无私奉献、传递温暖，', honor: '最美志愿者', closing: '特发此证，致以诚挚感谢！',
      tags: ['志愿', '照片', '橙'],
      theme: [themePreset('橙金', '#c2410c', '#6b3b10'), themePreset('暖白', '#ffffff', '#8a4a1a')] }),

    build({ id: 'tpl-07', name: '宇宙蓝紫', bg: 'tpl-07-cosmic.png', photo: true, mask: 'circle', frame: true, size: 280,
      title: '奖状', reason: '在科技节中探索求真、表现突出，', honor: '科技小达人', closing: '特发此证，以资鼓励。',
      tags: ['梦幻', '照片', '星空'],
      theme: [themePreset('星金', '#f3d27a', '#e9e6ff', '#d4ceff'), themePreset('月光白', '#ffffff', '#d9d4ff', '#c0b8ff')] }),

    build({ id: 'tpl-08', name: '红金节日', bg: 'tpl-08-festival.png',
      title: '荣 誉 证 书', reason: '在春节联欢中登台献艺、广受好评，', honor: '优秀表演者', closing: '特颁此证，以资表彰。',
      tags: ['节日', '喜庆', '红金'],
      theme: [
        themePreset('经典金', '#f3d27a', '#ffe7c2', '#ffd9a8'),
        themePreset('中国红', '#c1272d', '#ffe7c2', '#ffd9a8')
      ] }),

    build({ id: 'tpl-09', name: '森林绿野', bg: 'tpl-09-forest.png', photo: true, mask: 'circle', frame: true, size: 280,
      title: '奖状', reason: '在自然探索营中观察细致、热爱生命，', honor: '探索小能手', closing: '特发此证，以资鼓励。',
      tags: ['自然', '照片', '绿'],
      theme: [themePreset('森金', '#f3d27a', '#eafff0'), themePreset('嫩白', '#ffffff', '#d6ffe6')] }),

    buildCenter({ id: 'tpl-10', name: '香槟奢华', bg: 'tpl-10-champagne.png',
      title: '荣 誉 证 书', label: '兹证明', reason: '在年度盛典中卓越贡献、风范出众，', closing: '特颁此证，以资表彰。',
      tags: ['奢华', '正式', '香槟'],
      theme: [themePreset('香槟金', '#e8c98a', '#3a2e1c', '#5a4a30'), themePreset('奶白', '#ffffff', '#5a4a30', '#4a3a20')] }),

    build({ id: 'tpl-11', name: '卡通童趣', bg: 'tpl-11-cartoon.png', photo: true, mask: 'rounded', frame: true, size: 270,
      title: '奖状', label: '亲爱的', reason: '在趣味挑战中勇敢闯关、笑到最后，', honor: '闯关小勇士', closing: '特发此表扬状！',
      tags: ['卡通', '照片', '童趣'],
      theme: [themePreset('彩虹', '#ff6b9d', '#5a3a8a'), themePreset('云白', '#ffffff', '#7a5aa8')] }),

    buildCenter({ id: 'tpl-12', name: '梦幻紫粉', bg: 'tpl-12-dream.png',
      title: '荣 誉 证 书', reason: '在才艺展演中温柔闪耀、惊艳四座，', honor: '才艺之星', closing: '特发此证，以资鼓励。',
      tags: ['梦幻', '浪漫', '紫粉'],
      theme: [themePreset('梦紫', '#f3d27a', '#ffe9f4', '#ffd0e8'), themePreset('柔白', '#ffffff', '#ffd9ec', '#ffc0dc')] }),

    buildCenter({ id: 'tpl-19', name: '典雅文凭', bg: 'tpl-19-diploma.png',
      title: '荣 誉 证 书', reason: '经严格考核与综合评定，成绩优异，符合授予条件，', honor: '优秀学员', closing: '特发此证，以资表彰。',
      tags: ['经典', '正式', '米金'],
      theme: [themePreset('烫金', '#b8860b', '#4a3728', '#6b5040'), themePreset('羊皮纸', '#8b6914', '#3a2a18', '#5a4030')],
      issuer: '评审委员会', sealText: '评审委员会' }),

    build({ id: 'tpl-20', name: '金色之星', bg: 'tpl-20-star.png', photo: true, mask: 'square', frame: true, size: 260,
      title: '奖 状', reason: '在本年度各项活动中积极进取、全面发展，荣获', honor: '金色之星', closing: '特发此证，以资鼓励！',
      tags: ['儿童', '照片', '星空蓝'],
      theme: [themePreset('星光金', '#ffd700', '#1a3a6e', '#2a5aa0'), themePreset('天蓝', '#ffffff', '#2a5aa0', '#1a4a80')],
      issuer: '幼儿园教务处', sealText: '幼儿园' }),

    build({ id: 'tpl-21', name: '牡丹师恩', bg: 'tpl-21-peony.png', photo: true, mask: 'rounded', frame: true, size: 280,
      title: '荣 誉 证 书', suffix: '老师', reason: '春风化雨、润物无声，', honor: '优秀教师', closing: '感谢您的辛勤付出与无私奉献。',
      tags: ['教师', '感恩', '红金牡丹'],
      theme: [
        themePreset('经典金', '#f3d27a', '#fff0e0', '#ffe0c0'),
        themePreset('中国红', '#c1272d', '#fff0e0', '#ffe0c0')
      ],
      issuer: '家长委员会', sealText: '家委会' }),

    build({ id: 'tpl-22', name: '暗夜精英', bg: 'tpl-22-noir.png', photo: true, mask: 'square', frame: true, size: 260,
      title: '荣 誉 证 书', reason: '在激烈竞争中脱颖而出、展现非凡实力，', honor: '精英奖', closing: '特颁此证，以资嘉奖。',
      tags: ['高端', '商务', '黑金'],
      theme: [themePreset('香槟金', '#d4af37', '#e8e0d8', '#c8c0b8'), themePreset('银白', '#e8e0d8', '#d8d0c8', '#b8b0a8')],
      issuer: '董事会办公室', sealText: '董事会' }),

    buildLand({ id: 'tpl-13', name: '红金横版荣耀', bg: 'tpl-13-land-red.png', photo: true, mask: 'circle', frame: true, size: 200,
      title: '荣 誉 证 书', suffix: '先生/女士', reason: '在2026年度表现优异、贡献突出，', honor: '年度杰出贡献', closing: '特发此证，以资鼓励。',
      tags: ['喜庆', '照片', '红金', '横版'],
      theme: [
        themePreset('经典金', '#f3d27a', '#fff0c8', '#ffe9c2'),
        themePreset('中国红', '#c1272d', '#fff0c8', '#ffe9c2')
      ] }),

    buildLandCenter({ id: 'tpl-14', name: '蓝金横版商务', bg: 'tpl-14-land-blue.png',
      title: '荣 誉 证 书', label: '兹证明', reason: '在工作中展现专业素养与卓越能力，', closing: '特颁此证，以资表彰。',
      tags: ['正式', '企业', '蓝金', '横版'],
      theme: [themePreset('金辉', '#f3d27a', '#eaf2ff', '#c8d8f0'), themePreset('云白', '#ffffff', '#dbe7ff', '#b8cce8')] }),

    buildLand({ id: 'tpl-15', name: '翠绿横版运动', bg: 'tpl-15-land-green.png', photo: true, mask: 'rounded', frame: true, size: 190,
      title: '奖 状', reason: '在体育竞技中顽强拼搏、超越自我，', honor: '运动健将', closing: '特发此证，以资鼓励！',
      tags: ['运动', '照片', '绿金', '横版'],
      theme: [themePreset('金绿', '#f3d27a', '#eafff0'), themePreset('奶白', '#ffffff', '#d6ffe6')] }),

    buildLandCenter({ id: 'tpl-16', name: '紫韵横版艺术', bg: 'tpl-16-land-purple.png',
      title: '荣 誉 证 书', label: '兹证明', reason: '在艺术创作中才华横溢、作品精彩绝伦，', closing: '特颁此证，以资表彰。',
      tags: ['艺术', '正式', '紫金', '横版'],
      theme: [themePreset('紫金', '#f3d27a', '#f3e9ff', '#dcc8ff'), themePreset('淡紫白', '#ffffff', '#ecd9ff', '#d4b8ff')] }),

    buildLand({ id: 'tpl-17', name: '橙光横版志愿', bg: 'tpl-17-land-orange.png', photo: true, mask: 'circle', frame: true, size: 180,
      title: '志 愿 者 证 书', suffix: '同志', reason: '在公益服务中无私奉献、传递温暖，', honor: '最美志愿者', closing: '特发此证，致以诚挚感谢！',
      tags: ['志愿', '照片', '橙暖', '横版'],
      theme: [themePreset('橙金', '#c2410c', '#6b3b10'), themePreset('暖白', '#ffffff', '#8a4a1a')] }),

    buildLand({ id: 'tpl-18', name: '粉彩横版童趣', bg: 'tpl-18-land-pink.png', photo: true, mask: 'rounded', frame: true, size: 190,
      title: '奖 状', label: '亲爱的', reason: '在欢乐活动中表现出色、笑容满满，', honor: '进步小明星', closing: '特发此表扬状！',
      tags: ['卡通', '照片', '童趣', '横版'],
      theme: [themePreset('彩虹', '#ff6b9d', '#5a3a8a'), themePreset('云白', '#ffffff', '#7a5aa8')] }),

    buildLand({ id: 'tpl-23', name: '小熊抱星', bg: 'tpl-23-land-bear.png', photo: true, mask: 'circle', frame: true, size: 200, layout: 'landscape-cute',
      title: '奖 状', label: '亲爱的', reason: '在成长路上勇敢前行、闪闪发光，', honor: '闪亮小明星', closing: '特发此表扬状！',
      tags: ['可爱', '动物', '照片', '横版'],
      theme: [themePreset('星空蓝', '#4a90d9', '#2c4a6e'), themePreset('奶油白', '#ffffff', '#3a5a80')],
      issuer: '幼儿园园长室' }),

    buildLand({ id: 'tpl-24', name: '小兔彩虹', bg: 'tpl-24-land-bunny.png', photo: true, mask: 'rounded', frame: true, size: 190, layout: 'landscape-cute',
      title: '奖 状', label: '亲爱的', reason: '像小兔子一样活泼可爱、快乐成长，', honor: '快乐小天使', closing: '特发此表扬状！',
      tags: ['可爱', '动物', '照片', '横版'],
      theme: [themePreset('玫瑰粉', '#ff7eb3', '#6b3a5a'), themePreset('薄荷白', '#ffffff', '#8a5a70')],
      issuer: '幼儿园教务处' }),

    buildLand({ id: 'tpl-25', name: '恐龙乐园', bg: 'tpl-25-land-dino.png', photo: true, mask: 'square', frame: true, size: 195, layout: 'landscape-cute',
      title: '奖 状', label: '亲爱的', reason: '充满好奇心与探索精神，像小恐龙一样勇往直前！', honor: '探索小勇士', closing: '特发此表扬状。',
      tags: ['可爱', '恐龙', '照片', '横版'],
      theme: [themePreset('活力绿', '#52b788', '#2d5016'), themePreset('柠檬白', '#ffffff', '#3a6020')],
      issuer: '幼儿园园长室' }),

    buildLand({ id: 'tpl-26', name: '独角兽星空', bg: 'tpl-26-land-unicorn.png', layout: 'landscape-cute',
      title: '荣 誉 证 书', reason: '在梦幻世界中展现独特才华与无限想象力，', honor: '创意小达人', closing: '特颁此证，以资鼓励。',
      tags: ['可爱', '幻想', '独角兽', '横版'],
      theme: [themePreset('星光金', '#f0c040', '#5a3a7a', '#7a5a9a'), themePreset('薰衣草白', '#ffffff', '#7a5a9a', '#9a7ab8')],
      issuer: '魔法学院院长' }),

    buildLand({ id: 'tpl-27', name: '小猫气球', bg: 'tpl-27-land-cat.png', photo: true, mask: 'circle', frame: true, size: 200, layout: 'landscape-cute',
      title: '奖 状', label: '亲爱的', reason: '像小猫咪一样聪明伶俐、温暖贴心，', honor: '贴心小棉袄', closing: '特发此表扬状！',
      tags: ['可爱', '猫咪', '照片', '横版'],
      theme: [themePreset('暖橙金', '#e07b39', '#5a3518'), themePreset('蜜桃白', '#ffffff', '#8a5530')],
      issuer: '幼儿园园长室' }),

    buildLand({ id: 'tpl-28', name: '海洋之星', bg: 'tpl-28-land-ocean.png', photo: true, mask: 'rounded', frame: true, size: 190, layout: 'landscape-cute',
      title: '奖 状', label: '亲爱的', reason: '像大海一样宽广包容、勇敢探索未知世界！', honor: '海洋小探险家', closing: '特发此表扬状。',
      tags: ['可爱', '海洋', '照片', '横版'],
      theme: [themePreset('珊瑚红', '#e85d75', '#1a4a5a', '#2a6070'), themePreset('海蓝白', '#ffffff', '#2a6070', '#1a5060')],
      issuer: '海洋探险队' })
  ];

  window.HC_TEMPLATES = TEMPLATES;
  window.HC_CONTENT_PRESETS = CONTENT_PRESETS;
  window.HC_SCENE_CATEGORIES = SCENE_CATEGORIES;
  window.HC_THEME = { normalizeThemes, themePreset, ACCENT_IDS: ['title', 'honor'], MUTED_IDS: ['issuer', 'date'] };
})();
