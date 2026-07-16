/**
 * 生产环境冒烟测试
 * 用法: BASE=https://your-site.pages.dev node test/smoke-prod.cjs
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let ok = true;

  try {
    const res = await page.goto(BASE + '#/', { waitUntil: 'networkidle', timeout: 30000 });
    if (!res || res.status() >= 400) { console.log('❌ 首页 HTTP', res && res.status()); ok = false; }
    else console.log('✅ 首页 HTTP', res.status());

    const count = await page.$$eval('.tpl-card', els => els.length);
    if (count === 28) console.log('✅ 模板数量', count);
    else { console.log('❌ 模板数量', count, 'expected 28'); ok = false; }

    await page.goto(BASE + '#/editor?tpl=tpl-01', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForFunction(() => window.hcCanvas, { timeout: 15000 });
    console.log('✅ 编辑器加载');

    const roundtrip = await page.evaluate(() => {
      const scene = window.hcCanvas.toJSON(['hcType', 'hcId']);
      const p = window.HC_Share.buildSharePayload('tpl-01', scene);
      const enc = window.HC_Share.encode(p);
      const dec = window.HC_Share.decode(enc);
      return dec.templateId === 'tpl-01';
    });
    if (roundtrip) console.log('✅ 分享编解码');
    else { console.log('❌ 分享编解码'); ok = false; }
  } catch (e) {
    console.log('❌', e.message);
    ok = false;
  }

  await browser.close();
  process.exit(ok ? 0 : 1);
})();
