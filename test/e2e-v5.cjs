const { chromium } = require('/Users/hehonghua/.workbuddy/binaries/node/workspace/node_modules/playwright');
const FS = require('fs');
const PATH = require('path');

const BASE = 'http://localhost:8787';
const SHOT_DIR = '/Users/hehonghua/workshop/honor_card/test/shots';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const results = [];
  const pass = (n, d) => { results.push({ n, s: 'PASS', d }); console.log('PASS ' + n + ': ' + d); };
  const fail = (n, d) => { results.push({ n, s: 'FAIL', d }); console.log('FAIL ' + n + ': ' + d); };

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

    // ===== Step 1: Gallery shows 28 templates, new cute landscape present =====
    await page.goto(BASE + '/?v=' + Date.now(), { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const gal = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.tpl-card'));
      const lands = document.querySelectorAll('.thumb.land').length;
      const ids = window.HC_TEMPLATES.map(t => t.id);
      return { count: cards.length, lands, hasBear: ids.includes('tpl-23'), hasOcean: ids.includes('tpl-28'), totalIds: ids.length };
    });
    if (gal.count === 28 && gal.lands >= 12 && gal.hasBear && gal.hasOcean)
      pass('Step1-gallery', `首页显示 ${gal.count} 套模板（横版 ${gal.lands} 张），含小熊/海洋等可爱横版`);
    else
      fail('Step1-gallery', `模板数异常: ${JSON.stringify(gal)}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v5-gallery.png'), fullPage: true });

    // ===== Step 2: Editor canvas fits viewport (no scroll), full content =====
    await page.goto(BASE + '#/editor?tpl=tpl-23', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const ed23 = await page.evaluate(() => {
      const c = window.hcCanvas;
      const wrap = document.querySelector('.canvas-wrap');
      const cs = getComputedStyle(wrap);
      return {
        cw: c.getWidth(), ch: c.getHeight(),
        objs: c.getObjects().length,
        types: c.getObjects().map(o => o.hcType + ':' + (o.hcId || '')),
        hasReason: c.getObjects().some(o => o.hcId === 'reason'),
        hasSeal: c.getObjects().some(o => o.hcType === 'seal'),
        align: cs.alignItems,
        // 奖状是否完整在视口内（无需滚动）：画布高度不超过容器可见高度
        fits: c.getHeight() <= wrap.clientHeight + 4
      };
    });
    if (ed23.cw >= 600 && ed23.hasReason && ed23.hasSeal && ed23.fits)
      pass('Step2-canvas', `tpl-23 画布 ${ed23.cw}x${ed23.ch} 居中且无需滚动，含 reason+seal 共 ${ed23.objs} 图层`);
    else
      fail('Step2-canvas', `画布异常: ${JSON.stringify(ed23)}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v5-tpl23-editor.png') });

    // ===== Step 3: Seal is transparent outline (not solid fill) =====
    const sealInfo = await page.evaluate(() => {
      const c = window.hcCanvas;
      const seal = c.getObjects().find(o => o.hcType === 'seal');
      if (!seal) return { error: 'no seal' };
      const el = seal.getElement();
      const cv = document.createElement('canvas');
      cv.width = el.width; cv.height = el.height;
      const ctx = cv.getContext('2d');
      ctx.drawImage(el, 0, 0);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let transparent = 0, red = 0;
      const N = d.length / 4;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 20) transparent++;
        if (d[i + 3] > 100 && d[i] > 120 && d[i] > d[i + 1] + 20 && d[i] > d[i + 2] + 20) red++;
      }
      return { w: cv.width, transparentRatio: (transparent / N).toFixed(2), redPixels: red };
    });
    // 透明占比应明显高于"纯实心圆盘"的 0.35（真实镂空约 0.7+），且存在红色像素（红圈红字）
    if (sealInfo.transparentRatio > 0.55 && sealInfo.redPixels > 500)
      pass('Step3-seal', `签章为透明镂空：透明像素占比 ${sealInfo.transparentRatio}（实心盘仅~0.35），红色像素 ${sealInfo.redPixels}（红圈+红字）`);
    else
      fail('Step3-seal', `签章仍像实心填充: ${JSON.stringify(sealInfo)}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v5-seal.png'), clip: { x: 900, y: 350, width: 360, height: 300 } });

    // ===== Step 4: Remaining cute landscape templates render fully =====
    for (const id of ['tpl-24', 'tpl-25', 'tpl-26', 'tpl-27', 'tpl-28']) {
      await page.goto(BASE + '#/editor?tpl=' + id, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);
      const r = await page.evaluate(() => {
        const c = window.hcCanvas;
        return { objs: c.getObjects().length, hasReason: c.getObjects().some(o => o.hcId === 'reason'), hasSeal: c.getObjects().some(o => o.hcType === 'seal'), hasPhoto: c.getObjects().some(o => o.hcType === 'photo') };
      });
      if (r.objs >= 7 && r.hasReason && r.hasSeal)
        pass('Step4-' + id, `${id} 渲染 ${r.objs} 图层（含 reason+seal${r.hasPhoto ? '+photo' : ''}）`);
      else
        fail('Step4-' + id, `${id} 异常: ${JSON.stringify(r)}`);
    }

    // ===== Step 5: No JS errors across session =====
    if (errs.length === 0)
      pass('Step5-errors', '全程无 JS 报错');
    else
      fail('Step5-errors', 'JS 报错: ' + errs.slice(0, 3).join(' | '));

    // ===== Summary =====
    console.log('\n===== E2E v1.5 结果 =====');
    const p = results.filter(r => r.s === 'PASS').length;
    const f = results.filter(r => r.s === 'FAIL').length;
    console.log(`总计 ${p + f} | 通过 ${p} | 失败 ${f}`);
  } catch (e) {
    console.error('FATAL:', e.message);
  } finally {
    await browser.close();
  }
})();
