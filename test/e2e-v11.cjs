// E2E v1.11 — 验证：正文遵守右边距 + 画廊横/竖筛选记忆
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8787';

let passN = 0, failN = 0;
function pass(s, m){ passN++; console.log('  ✅ ['+s+'] '+m); }
function fail(s, m){ failN++; console.log('  ❌ ['+s+'] '+m); }

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  try {
    // ===== 修复1：正文遵守右边距 =====
    // 竖版照片奖状
    await page.goto(BASE + '/#/editor?tpl=tpl-01', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.hcCanvas && window.hcCanvas.getObjects().length > 0, { timeout: 10000 });
    let r1 = await page.evaluate(() => {
      const W = 1024, MARGIN = 794;
      const objs = window.hcCanvas.getObjects();
      function re(o){ return o.originX === 'right' ? o.left : (o.left + (o.width||0) * (o.originX==='left'?1:0.5)); }
      const reason = objs.find(o => o.hcId === 'reason');
      const closing = objs.find(o => o.hcId === 'closing');
      return {
        reasonRE: reason ? re(reason) : null,
        closingRE: closing ? re(closing) : null,
        margin: MARGIN,
        reasonLines: reason ? (reason._textLines ? reason._textLines.length : 1) : 0
      };
    });
    if (r1.reasonRE !== null && r1.reasonRE <= r1.margin) pass('P-portrait-reason', `竖版照片 正文右边缘=${Math.round(r1.reasonRE)} ≤ ${r1.margin}`);
    else fail('P-portrait-reason', `竖版照片 正文右边缘=${Math.round(r1.reasonRE)} 超出 ${r1.margin}`);
    if (r1.closingRE !== null && r1.closingRE <= r1.margin) pass('P-portrait-closing', `竖版照片 结语右边缘=${Math.round(r1.closingRE)} ≤ ${r1.margin}`);
    else fail('P-portrait-closing', `竖版照片 结语右边缘=${Math.round(r1.closingRE)} 超出 ${r1.margin}`);
    if (r1.reasonLines >= 2) pass('P-portrait-wrap', `竖版照片 正文已自动换行（${r1.reasonLines} 行）`);
    else fail('P-portrait-wrap', `竖版照片 正文未换行（${r1.reasonLines} 行），rightEdge=${Math.round(r1.reasonRE)}`);
    await page.screenshot({ path: 'test/shots/v11-portrait-photo.png' });

    // 横版照片奖状
    await page.goto(BASE + '/#/editor?tpl=tpl-13', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.hcCanvas && window.hcCanvas.getObjects().length > 0, { timeout: 10000 });
    let r2 = await page.evaluate(() => {
      const MARGIN = 976;
      const objs = window.hcCanvas.getObjects();
      function re(o){ return o.originX === 'right' ? o.left : (o.left + (o.width||0) * (o.originX==='left'?1:0.5)); }
      const reason = objs.find(o => o.hcId === 'reason');
      const closing = objs.find(o => o.hcId === 'closing');
      return { reasonRE: reason?re(reason):null, closingRE: closing?re(closing):null, margin: MARGIN };
    });
    if (r2.reasonRE !== null && r2.reasonRE <= r2.margin) pass('P-land-photo-reason', `横版照片 正文右边缘=${Math.round(r2.reasonRE)} ≤ ${r2.margin}`);
    else fail('P-land-photo-reason', `横版照片 正文右边缘=${Math.round(r2.reasonRE)} 超出 ${r2.margin}`);
    await page.screenshot({ path: 'test/shots/v11-land-photo.png' });

    // 横版非照片（荣誉证书）
    await page.goto(BASE + '/#/editor?tpl=tpl-14', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.hcCanvas && window.hcCanvas.getObjects().length > 0, { timeout: 10000 });
    let r3 = await page.evaluate(() => {
      const MARGIN = 976;
      const objs = window.hcCanvas.getObjects();
      function re(o){ return o.originX === 'right' ? o.left : (o.left + (o.width||0) * (o.originX==='left'?1:0.5)); }
      const reason = objs.find(o => o.hcId === 'reason');
      const closing = objs.find(o => o.hcId === 'closing');
      return { reasonRE: reason?re(reason):null, closingRE: closing?re(closing):null, margin: MARGIN };
    });
    if (r3.reasonRE !== null && r3.reasonRE <= r3.margin) pass('P-land-nonphoto-reason', `横版荣誉证书 正文右边缘=${Math.round(r3.reasonRE)} ≤ ${r3.margin}`);
    else fail('P-land-nonphoto-reason', `横版荣誉证书 正文右边缘=${Math.round(r3.reasonRE)} 超出 ${r3.margin}`);
    await page.screenshot({ path: 'test/shots/v11-land-nonphoto.png' });

    // ===== 修复2：画廊横/竖筛选记忆 =====
    // 进入画廊，选「横版」
    await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.filter-btn[data-filter="land"]', { timeout: 10000 });
    await page.click('.filter-btn[data-filter="land"]');
    const landActive = await page.evaluate(() => document.querySelector('.filter-btn[data-filter="land"]').classList.contains('active'));
    if (landActive) pass('G-select-land', `已选中「横版」筛选`); else fail('G-select-land', `未选中横版`);
    // 进入编辑页再返回 → 应仍显示横版（点击当前可见的第一张横版卡片）
    await page.locator('.tpl-card:visible').first().click();
    await page.waitForFunction(() => window.location.hash.indexOf('#/editor') === 0, { timeout: 10000 });
    await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.filter-btn[data-filter="land"]', { timeout: 10000 });
    const restored = await page.evaluate(() => {
      const active = document.querySelector('.filter-btn.active');
      const cards = [...document.querySelectorAll('.tpl-card')];
      const visible = cards.filter(c => c.style.display !== 'none').length;
      const landTotal = cards.filter(c => c.querySelector('.thumb.land')).length;
      return { activeFilter: active ? active.dataset.filter : null, visible, landTotal };
    });
    if (restored.activeFilter === 'land' && restored.visible === restored.landTotal)
      pass('G-remember-land', `返回画廊后仍为「横版」筛选（显示 ${restored.visible}/${restored.landTotal} 张横版）`);
    else fail('G-remember-land', `筛选未记忆：active=${restored.activeFilter}, visible=${restored.visible}/${restored.landTotal}`);
    await page.screenshot({ path: 'test/shots/v11-gallery-land.png' });

    // 切回「全部」并确认 localStorage 会更新
    await page.click('.filter-btn[data-filter="all"]');
    const cleared = await page.evaluate(() => localStorage.getItem('hc_gallery_filter'));
    if (cleared === 'all') pass('G-clear', `切换「全部」后 localStorage = ${cleared}`); else fail('G-clear', `localStorage = ${cleared}`);

  } catch (e) {
    fail('FATAL', e.message);
  }

  await browser.close();
  console.log('\n==== E2E v1.11 结果 ====');
  console.log('通过: ' + passN + ' / 失败: ' + failN);
  if (errors.length) { console.log('JS 错误:'); errors.forEach(e => console.log('  - ' + e)); }
  else console.log('无 JS 运行时错误 ✅');
  process.exit(failN === 0 && errors.length === 0 ? 0 : 1);
})();
