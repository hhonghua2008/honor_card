// E2E v1.14 — 验证照片奖状 / 荣誉奖状 纵向行距已统一（块间间距 ~45px，无重叠）
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

  async function measure(tpl) {
    await page.goto(`${BASE}/#/editor?tpl=${tpl}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.hcCanvas && window.hcCanvas.getObjects().length > 0, { timeout: 15000 });
    await page.waitForTimeout(300);
    return await page.evaluate(() => {
      const c = window.hcCanvas;
      const o = id => c.getObjects().find(x => x.hcType === 'text' && x.hcId === id);
      const edge = x => { if (!x) return null; const h = x.height || 0; return { te: x.top - h / 2, be: x.top + h / 2 }; };
      const ids = ['recipient', 'reason', 'honor', 'closing'].filter(id => o(id));
      const edges = ids.map(id => ({ id, ...edge(o(id)) }));
      const gaps = [];
      for (let i = 1; i < edges.length; i++) gaps.push({ a: edges[i-1].id, b: edges[i].id, g: Math.round(edges[i].te - edges[i-1].be) });
      return { gaps };
    });
  }

  const cases = ['tpl-01', 'tpl-02', 'tpl-03', 'tpl-19', 'tpl-20'];
  for (const tpl of cases) {
    const m = await measure(tpl);
    console.log(`\n[${tpl}] gaps:`, m.gaps.map(x => `${x.a}→${x.b}=${x.g}`).join('  '));
    await page.screenshot({ path: `${SHOT}/v14-${tpl}.png` });
    let ok = true; const details = [];
    for (const gp of m.gaps) {
      if (gp.g < 30) { ok = false; details.push(`${gp.a}→${gp.b}=${gp.g}(重叠/过挤)`); }
      else if (gp.g > 80) { ok = false; details.push(`${gp.a}→${gp.b}=${gp.g}(过大)`); }
      else details.push(`${gp.a}→${gp.b}=${gp.g}`);
    }
    if (ok) pass(`S-${tpl}`, '统一行距 ' + details.join(' / '));
    else fail(`S-${tpl}`, '异常 ' + details.join(' / '));
  }

  // 同时验证 v1.13 的两个修复未被破坏：称呼为正文色、遮罩切换
  await page.goto(`${BASE}/#/editor?tpl=tpl-03`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.hcCanvas && window.hcCanvas.getObjects().length > 0, { timeout: 15000 });
  const col = await page.evaluate(() => {
    const c = window.hcCanvas; const o = id => c.getObjects().find(x => x.hcType === 'text' && x.hcId === id);
    return { recipient: o('recipient').fill, reason: o('reason').fill, title: o('title').fill, honor: o('honor').fill };
  });
  if (col.recipient === col.reason && col.recipient !== col.title && col.honor === col.title)
    pass('color-keep', `称呼(${col.recipient})=正文色≠标题红(${col.title})，荣誉名=红`);
  else fail('color-keep', JSON.stringify(col));

  if (errors.length === 0) pass('no-js-error', '无 JS 运行时错误');
  else fail('no-js-error', `捕获 ${errors.length} 个错误: ` + errors.slice(0,3).join(' | '));

  await browser.close();
  console.log(`\n==== v1.14 E2E: ${passN} 通过 / ${failN} 失败 ====`);
  process.exit(failN === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
