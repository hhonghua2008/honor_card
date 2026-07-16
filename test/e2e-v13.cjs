// E2E v1.13 — 验证：①照片遮罩形状切换（圆形→圆角方形）真正生效；②称呼回归正文色（仅 title + honor 红色）
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:8787';
const SHOT = 'test/shots';
fs.mkdirSync(SHOT, { recursive: true });

let passN = 0, failN = 0;
const pass = (n, d) => { passN++; console.log(`  ✅ ${n}: ${d}`); };
const fail = (n, d) => { failN++; console.log(`  ❌ ${n}: ${d}`); };

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  async function load(tpl) {
    await page.goto(`${BASE}/#/editor?tpl=${tpl}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.hcCanvas && window.hcCanvas.getObjects().length > 0, { timeout: 15000 });
    await page.waitForTimeout(300);
  }

  // 选中照片并在右侧面板切换遮罩形状
  async function selectPhotoAndChangeMask(mask) {
    await page.evaluate(() => {
      const c = window.hcCanvas;
      const photo = c.getObjects().find(o => o.hcType === 'photo');
      c.setActiveObject(photo);
      window.hcEditorInst.onSelect();
    });
    await page.waitForSelector('#pMask', { timeout: 5000 });
    await page.evaluate((m) => {
      const sel = document.querySelector('#pMask');
      sel.value = m;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }, mask);
    await page.waitForTimeout(200);
  }

  // 读取照片遮罩/边框形状，以及关键文字颜色
  async function inspect() {
    return await page.evaluate(() => {
      const c = window.hcCanvas;
      const objs = c.getObjects();
      const photo = objs.find(o => o.hcType === 'photo');
      const frame = objs.find(o => o.hcType === 'photoFrame' && o.hcId === (photo && photo.hcId));
      const txt = id => { const o = objs.find(o => o.hcType === 'text' && o.hcId === id); return o ? o.fill : null; };
      const shapeOf = o => !o ? null :
        (o.type === 'circle' ? 'circle' : (o.type === 'rect' ? (o.rx > 0 ? 'rounded' : 'square') : o.type));
      return {
        clip: shapeOf(photo && photo.clipPath),
        frame: shapeOf(frame),
        photoMask: photo && photo.mask,
        title: txt('title'), recipient: txt('recipient'),
        reason: txt('reason'), honor: txt('honor'), issuer: txt('issuer')
      };
    });
  }

  // ===== 1. 遮罩形状切换（空占位图）=====
  console.log('\n[遮罩切换 tpl-01 空占位]');
  await load('tpl-01');
  let before = await inspect();
  if (before.clip === 'square' && before.frame === 'square') pass('M-before-square', '默认方形（clip+frame）');
  else fail('M-before-square', `初始 clip=${before.clip} frame=${before.frame}`);
  await selectPhotoAndChangeMask('rounded');
  let after = await inspect();
  if (after.clip === 'rounded' && after.frame === 'rounded') pass('M-to-rounded', '切换圆角方形后 clip+frame 均变圆角方形');
  else fail('M-to-rounded', `切换后 clip=${after.clip} frame=${after.frame}`);
  await selectPhotoAndChangeMask('circle');
  after = await inspect();
  if (after.clip === 'circle' && after.frame === 'circle') pass('M-to-circle', '切圆形后 clip+frame 均变圆形');
  else fail('M-to-circle', `切换后 clip=${after.clip} frame=${after.frame}`);
  await selectPhotoAndChangeMask('square');
  after = await inspect();
  if (after.clip === 'square' && after.frame === 'square') pass('M-back-square', '切回直角方形后 clip+frame 均变方形');
  else fail('M-back-square', `切换后 clip=${after.clip} frame=${after.frame}`);
  await page.screenshot({ path: `${SHOT}/v13-mask-square.png` });

  // ===== 2. 已上传照片的遮罩切换（cover 图不重绘，仅改 clipPath）=====
  console.log('\n[遮罩切换 tpl-02 模拟已上传]');
  await load('tpl-02'); // 默认方形，模拟已上传后切圆形验证 clip+frame 同步
  await page.evaluate(() => {
    const c = window.hcCanvas;
    const photo = c.getObjects().find(o => o.hcType === 'photo');
    // 模拟已上传：用一张纯色 cover 图替换元素
    const cv = document.createElement('canvas'); cv.width = photo.hcSize; cv.height = photo.hcSize;
    const cx = cv.getContext('2d'); cx.fillStyle = '#3399ff'; cx.fillRect(0, 0, cv.width, cv.height);
    photo.hcUserImage = true; photo.setElement(cv);
    c.setActiveObject(photo); window.hcEditorInst.onSelect();
  });
  await page.waitForSelector('#pMask', { timeout: 5000 });
  await page.evaluate(() => { const s = document.querySelector('#pMask'); s.value = 'circle'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(200);
  let up = await inspect();
  if (up.clip === 'circle' && up.frame === 'circle') pass('M-uploaded-circle', '已上传照片切圆形：clip+frame 变圆形');
  else fail('M-uploaded-circle', `clip=${up.clip} frame=${up.frame}`);
  await page.screenshot({ path: `${SHOT}/v13-uploaded-circle.png` });

  // ===== 3. 称呼颜色：仅 title + honor 为红色(title色)，其余正文色 =====
  console.log('\n[称呼颜色一致性]');
  for (const tpl of ['tpl-03', 'tpl-13', 'tpl-14']) {
    await load(tpl);
    const c = await inspect();
    const titleRed = c.title && c.title !== '#000000'; // title 色（金/红）
    const recipientIsBody = c.recipient === c.reason; // 称呼=正文色
    const recipientNotTitle = c.recipient !== c.title; // 称呼≠title色
    const honorIsTitle = c.honor === c.title; // 荣誉名=title色
    if (recipientIsBody && recipientNotTitle) pass(`R-${tpl}-recipient-body`, `称呼(${c.recipient}) = 正文色，≠ 标题红(${c.title})`);
    else fail(`R-${tpl}-recipient-body`, `称呼=${c.recipient} 正文=${c.reason} 标题=${c.title}`);
    if (honorIsTitle) pass(`R-${tpl}-honor-red`, `荣誉名(${c.honor}) = 标题红`);
    else fail(`R-${tpl}-honor-red`, `荣誉名=${c.honor} 标题=${c.title}`);
  }

  if (errors.length === 0) pass('no-js-error', '无 JS 运行时错误');
  else fail('no-js-error', `捕获 ${errors.length} 个错误: ` + errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\n==== v1.13 E2E: ${passN} 通过 / ${failN} 失败 ====`);
  process.exit(failN === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
