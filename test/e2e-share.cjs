/**
 * Phase A 分享链路 E2E
 * 用法: node test/e2e-share.cjs
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';

(async () => {
  let passed = 0, failed = 0;
  const ok = (n, m) => { console.log('  ✅', n, m || ''); passed++; };
  const bad = (n, m) => { console.log('  ❌', n, m || ''); failed++; };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  try {
    await page.goto(BASE + '#/editor?tpl=tpl-03', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForFunction(() => window.hcCanvas && window.hcCanvas.getObjects().length > 0, { timeout: 15000 });

    // 纯文字分享
    const enc = await page.evaluate(() => {
      const scene = window.hcCanvas.toJSON(['hcType', 'hcId', 'mask', 'frame', 'hcSize', 'selectable', 'evented', 'sealText', 'sealColor', 'sealSize', 'hcUserImage']);
      const payload = window.HC_Share.buildSharePayload('tpl-03', scene);
      return { enc: window.HC_Share.encode(payload), len: window.HC_Share.encode(payload).length, stripped: payload.photosStripped };
    });
    if (enc.len < 60000) ok('text-share-size', enc.len + ' bytes');
    else bad('text-share-size', 'too large');

    const sp = await browser.newPage();
    await sp.goto(BASE + '#p=' + enc.enc, { waitUntil: 'networkidle', timeout: 20000 });
    await sp.waitForFunction(() => window.hcCanvas && window.hcEditorInst && window.hcEditorInst.readonly, { timeout: 15000 });
    ok('readonly-view', 'canvas readonly');

    const hasSaveAs = await sp.$('#saveAsBtn');
    if (hasSaveAs) ok('save-as-btn', 'present');
    else bad('save-as-btn', 'missing');

    // 分类筛选
    await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
    await page.click('.scene-btn[data-scene="photo"]');
    const photoCards = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.tpl-card')).filter(el => el.style.display !== 'none').length
    );
    if (photoCards >= 10) ok('scene-filter', photoCards + ' photo templates');
    else bad('scene-filter', photoCards);

    // 搜索
    await page.fill('#gallerySearch', '小熊');
    await page.waitForTimeout(300);
    const bear = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.tpl-card')).filter(el => el.style.display !== 'none').length
    );
    if (bear === 1) ok('search', '小熊 → 1');
    else bad('search', 'count=' + bear);

    await sp.close();
  } catch (e) {
    bad('runtime', e.message);
  }

  if (errors.length) bad('js-errors', errors.slice(0, 2).join(' | '));
  else ok('no-js-error', '');

  await browser.close();
  console.log(`\n分享 E2E: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
