// HonorCard v1.8 E2E：验证 ①照片铺满 ②荣誉名在结语之上(无重叠) ③标题间距下移
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8787';
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

let passN = 0, failN = 0;
function pass(s, m) { passN++; console.log(`  ✅ ${s}: ${m}`); }
function fail(s, m) { failN++; console.log(`  ❌ ${s}: ${m}`); }

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  // ===== 测试照片模板：竖版 tpl-01 =====
  await page.goto(BASE + '/#/editor?tpl=tpl-01', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // Step1: 照片区域默认可见
  let photoVisible = await page.evaluate(() => {
    const c = window.hcCanvas;
    const p = c.getObjects().find(o => o.hcType === 'photo');
    return !!(p && !p.hcUserImage);
  });
  photoVisible ? pass('Step1-photo-visible', '照片占位区域默认可见') : fail('Step1-photo-visible', '照片占位区域未显示');

  // Step2: 上传照片后应铺满整个区域（image 元素尺寸 == clip 尺寸，scale=1）
  await page.evaluate(() => {
    const ed = window.hcEditorInst;
    const c = window.hcCanvas;
    const p = c.getObjects().find(o => o.hcType === 'photo');
    // 生成一张 800x600 的测试图（左红右蓝，便于肉眼判断是否铺满）
    const cv = document.createElement('canvas'); cv.width = 800; cv.height = 600;
    const x = cv.getContext('2d');
    x.fillStyle = '#c1272d'; x.fillRect(0, 0, 400, 600);
    x.fillStyle = '#2b6cb0'; x.fillRect(400, 0, 400, 600);
    ed.replacePhoto(p, cv.toDataURL('image/png'));
  });
  await page.waitForTimeout(500);
  let fillInfo = await page.evaluate(() => {
    const c = window.hcCanvas;
    const ph = c.getObjects().find(o => o.hcType === 'photo' && o.hcUserImage);
    if (!ph) return null;
    const clip = ph.clipPath;
    const clipSize = clip.radius ? clip.radius * 2 : (clip.width || 0);
    return {
      elW: ph.width, elH: ph.height, scaleX: ph.scaleX, scaleY: ph.scaleY,
      hcSize: ph.hcSize, clipSize, mask: ph.mask
    };
  });
  if (fillInfo && fillInfo.elW === fillInfo.hcSize && fillInfo.scaleX === 1 && fillInfo.scaleY === 1
      && Math.abs(fillInfo.clipSize - fillInfo.hcSize) < 2) {
    pass('Step2-photo-fill', `照片铺满：元素${fillInfo.elW}px == clip${fillInfo.clipSize}px，scale=1`);
  } else {
    fail('Step2-photo-fill', '照片未铺满：' + JSON.stringify(fillInfo));
  }
  await page.screenshot({ path: path.join(SHOTS, 'v8-photo-filled.png') });

  // Step3: 套用内容模版"三好学生"，荣誉名应在结语之上且无重叠（竖版照片）
  await page.evaluate(() => {
    const ed = window.hcEditorInst;
    const presets = window.HC_CONTENT_PRESETS;
    const idx = presets.findIndex(p => p.label === '三好学生');
    ed.applyContentPreset(presets[idx]);
  });
  await page.waitForTimeout(400);
  let orderP = await page.evaluate(() => {
    const c = window.hcCanvas;
    const honor = c.getObjects().find(o => o.hcType === 'text' && o.hcId === 'honor');
    const closing = c.getObjects().find(o => o.hcType === 'text' && o.hcId === 'closing');
    if (!honor || !closing) return null;
    return { honorTop: honor.top, honorH: honor.height || 60, closingTop: closing.top,
      honorText: honor.text, closingText: closing.text };
  });
  if (orderP && orderP.honorTop < orderP.closingTop && (orderP.honorTop + orderP.honorH / 2) < (orderP.closingTop - 15)) {
    pass('Step3-order-portrait', `荣誉名("${orderP.honorText}")在结语("${orderP.closingText}")之上，无重叠`);
  } else {
    fail('Step3-order-portrait', '荣誉名与结语顺序/重叠异常：' + JSON.stringify(orderP));
  }
  await page.screenshot({ path: path.join(SHOTS, 'v8-portrait-preset.png') });

  // Step4: 标题间距下移 + charSpacing（竖版 top 应为 200，含 charSpacing）
  let titleP = await page.evaluate(() => {
    const c = window.hcCanvas;
    const t = c.getObjects().find(o => o.hcType === 'text' && o.hcId === 'title');
    return t ? { top: t.top, charSpacing: t.charSpacing, text: t.text } : null;
  });
  if (titleP && titleP.top === 200 && titleP.charSpacing > 0 && !/\s/.test(titleP.text)) {
    pass('Step4-title-portrait', `标题下移 top=${titleP.top}，charSpacing=${titleP.charSpacing}，无内部空格("${titleP.text}")`);
  } else {
    fail('Step4-title-portrait', '标题位置/间距异常：' + JSON.stringify(titleP));
  }

  // Step5: 横版照片模板 tpl-13 套用 preset，荣誉名应在结语之上（修复前横版照片会重叠）
  await page.goto(BASE + '/#/editor?tpl=tpl-13', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const ed = window.hcEditorInst;
    const presets = window.HC_CONTENT_PRESETS;
    const idx = presets.findIndex(p => p.label === '优秀员工');
    ed.applyContentPreset(presets[idx]);
  });
  await page.waitForTimeout(400);
  let orderL = await page.evaluate(() => {
    const c = window.hcCanvas;
    const honor = c.getObjects().find(o => o.hcType === 'text' && o.hcId === 'honor');
    const closing = c.getObjects().find(o => o.hcType === 'text' && o.hcId === 'closing');
    if (!honor || !closing) return null;
    return { honorTop: honor.top, closingTop: closing.top };
  });
  if (orderL && orderL.honorTop < orderL.closingTop) {
    pass('Step5-order-landscape', `横版照片：荣誉名(top ${orderL.honorTop}) 在结语(top ${orderL.closingTop}) 之上`);
  } else {
    fail('Step5-order-landscape', '横版照片荣誉名/结语顺序异常：' + JSON.stringify(orderL));
  }
  // 横版标题下移检查
  let titleL = await page.evaluate(() => {
    const c = window.hcCanvas;
    const t = c.getObjects().find(o => o.hcType === 'text' && o.hcId === 'title');
    return t ? { top: t.top, charSpacing: t.charSpacing } : null;
  });
  if (titleL && titleL.top === 90 && titleL.charSpacing > 0) {
    pass('Step5b-title-landscape', `横版标题下移 top=${titleL.top}，charSpacing=${titleL.charSpacing}`);
  } else {
    fail('Step5b-title-landscape', '横版标题异常：' + JSON.stringify(titleL));
  }
  // 横版照片上传铺满检查
  await page.evaluate(() => {
    const ed = window.hcEditorInst;
    const c = window.hcCanvas;
    const p = c.getObjects().find(o => o.hcType === 'photo');
    const cv = document.createElement('canvas'); cv.width = 700; cv.height = 500;
    const x = cv.getContext('2d'); x.fillStyle = '#2f855a'; x.fillRect(0, 0, 700, 500);
    ed.replacePhoto(p, cv.toDataURL('image/png'));
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'v8-land-photo-filled.png') });

  // ===== 汇总 =====
  console.log('\n===== JS 运行期错误 =====');
  if (errors.length) { errors.forEach(e => console.log('  ⚠️ ' + e)); }
  else console.log('  无');
  console.log(`\n结果：${passN} 通过 / ${failN} 失败`);
  await browser.close();
  process.exit(failN === 0 && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
