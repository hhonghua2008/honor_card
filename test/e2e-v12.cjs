// E2E v1.12 — 验证三项修复：标题字距放大、正文/结语统一左对齐、称呼下移
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

  async function loadAndGrab(tpl, shot) {
    await page.goto(`${BASE}/#/editor?tpl=${tpl}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.hcCanvas && window.hcCanvas.getObjects().length > 0, { timeout: 15000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOT}/${shot}` });
  }
  // 读取图层信息（含对齐方式、位置、题目字距）
  async function layerInfo() {
    return await page.evaluate(() => {
      const c = window.hcCanvas;
      const objs = c.getObjects();
      const get = id => objs.find(o => o.hcType === 'text' && o.hcId === id);
      const info = o => o ? { text: o.text, left: Math.round(o.left), top: Math.round(o.top),
        oTextAlign: o.textAlign, oOriginX: o.originX, charSpacing: o.charSpacing,
        width: o.width || 0, lines: o._textLines ? o._textLines.length : 1 } : null;
      return {
        title: info(get('title')), recipient: info(get('recipient')),
        reason: info(get('reason')), honor: info(get('honor')), closing: info(get('closing'))
      };
    });
  }

  // ===== 竖版照片奖状 tpl-01 =====
  console.log('\n[竖版照片 tpl-01]');
  await loadAndGrab('tpl-01', 'v12-portrait-photo.png');
  let i = await layerInfo();
  // 1. 标题字距放大
  if (i.title && i.title.charSpacing >= 800) pass('P-title-spacing', `title charSpacing=${i.title.charSpacing}（≥800）`);
  else fail('P-title-spacing', `title charSpacing=${i.title && i.title.charSpacing}`);
  // 2. 正文/结语左对齐
  if (i.reason && i.reason.oTextAlign === 'left' && i.reason.oOriginX === 'left') pass('P-reason-left', '正文左对齐');
  else fail('P-reason-left', `reason align=${i.reason && i.reason.oTextAlign}/${i.reason && i.reason.oOriginX}`);
  if (i.closing && i.closing.oTextAlign === 'left' && i.closing.oOriginX === 'left') pass('P-closing-left', '结语左对齐');
  else fail('P-closing-left', `closing align=${i.closing && i.closing.oTextAlign}/${i.closing && i.closing.oOriginX}`);
  // 3. 称呼下移（与 title 间距 ≥ 1.5 行，约 130px 以上）
  if (i.title && i.recipient) {
    const gap = i.recipient.top - i.title.top;
    if (gap >= 130) pass('P-recipient-gap', `称呼下移，与标题间距 ${gap}px（≥130）`);
    else fail('P-recipient-gap', `间距仅 ${gap}px，应≥130`);
  } else fail('P-recipient-gap', '缺少 title/recipient 图层');
  // 4. 无垂直重叠：recipient < reason < honor < closing 自上而下
  const ys = [i.recipient, i.reason, i.honor, i.closing].filter(Boolean).map(o => o.top);
  if (ys.length === 4) {
    let ordered = true;
    for (let k = 1; k < ys.length; k++) if (ys[k] <= ys[k-1]) ordered = false;
    if (ordered) pass('P-vertical-order', `垂直顺序正确 recipient(${ys[0]})<reason(${ys[1]})<honor(${ys[2]})<closing(${ys[3]})`);
    else fail('P-vertical-order', `垂直顺序异常: ${ys.join(',')}`);
  } else fail('P-vertical-order', `图层数=${ys.length}`);

  // ===== 竖版非照片 tpl-03 =====
  console.log('\n[竖版非照片 tpl-03]');
  await loadAndGrab('tpl-03', 'v12-portrait-nonphoto.png');
  i = await layerInfo();
  if (i.reason && i.reason.oTextAlign === 'center') pass('NP-reason-left', '正文居中对齐（center archetype）');
  else fail('NP-reason-left', `reason align=${i.reason && i.reason.oTextAlign}`);
  if (i.closing && i.closing.oTextAlign === 'center') pass('NP-closing-left', '结语居中对齐（center archetype）');
  else fail('NP-closing-left', `closing align=${i.closing && i.closing.oTextAlign}`);
  if (i.honor && i.honor.oTextAlign === 'center') pass('NP-honor-center', '荣誉名仍居中');
  else fail('NP-honor-center', `honor align=${i.honor && i.honor.oTextAlign}`);
  if (i.title && i.recipient) {
    const gap = i.recipient.top - i.title.top;
    if (gap >= 100) pass('NP-recipient-gap', `称呼下移，间距 ${gap}px`);
    else fail('NP-recipient-gap', `间距仅 ${gap}px`);
  }

  // ===== 横版照片 tpl-13 =====
  console.log('\n[横版照片 tpl-13]');
  await loadAndGrab('tpl-13', 'v12-land-photo.png');
  i = await layerInfo();
  if (i.title && i.title.charSpacing >= 600) pass('L-title-spacing', `title charSpacing=${i.title.charSpacing}`);
  else fail('L-title-spacing', `title charSpacing=${i.title && i.title.charSpacing}`);
  if (i.reason && i.reason.oTextAlign === 'left') pass('L-reason-left', '正文左对齐');
  else fail('L-reason-left', `reason align=${i.reason && i.reason.oTextAlign}`);
  if (i.closing && i.closing.oTextAlign === 'left') pass('L-closing-left', '结语左对齐');
  else fail('L-closing-left', `closing align=${i.closing && i.closing.oTextAlign}`);
  if (i.title && i.recipient) {
    const gap = i.recipient.top - i.title.top;
    if (gap >= 60) pass('L-recipient-gap', `称呼下移，间距 ${gap}px（横版≥60）`);
    else fail('L-recipient-gap', `间距仅 ${gap}px`);
  }

  // ===== 横版非照片 tpl-14 =====
  console.log('\n[横版非照片 tpl-14]');
  await loadAndGrab('tpl-14', 'v12-land-nonphoto.png');
  i = await layerInfo();
  if (i.reason && i.reason.oTextAlign === 'left') pass('LN-reason-left', '正文左对齐');
  else fail('LN-reason-left', `reason align=${i.reason && i.reason.oTextAlign}`);
  if (i.closing && i.closing.oTextAlign === 'left') pass('LN-closing-left', '结语左对齐');
  else fail('LN-closing-left', `closing align=${i.closing && i.closing.oTextAlign}`);
  if (i.honor && i.honor.oTextAlign === 'center') pass('LN-honor-center', '荣誉名仍居中');
  else fail('LN-honor-center', `honor align=${i.honor && i.honor.oTextAlign}`);

  // ===== JS 错误检查 =====
  if (errors.length === 0) pass('no-js-error', '无 JS 运行时错误');
  else fail('no-js-error', `捕获 ${errors.length} 个错误: ` + errors.slice(0,3).join(' | '));

  await browser.close();
  console.log(`\n==== v1.12 E2E: ${passN} 通过 / ${failN} 失败 ====`);
  process.exit(failN === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
