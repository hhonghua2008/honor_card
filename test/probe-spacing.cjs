// 测量竖版照片奖状(tpl-01)与竖版非照片奖状(tpl-03)各文本块的真实上下边距与间距
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  async function measure(tpl) {
    await page.goto(`http://localhost:8787/#/editor?tpl=${tpl}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.hcCanvas && window.hcCanvas.getObjects().length > 0, { timeout: 15000 });
    await page.waitForTimeout(300);
    return await page.evaluate(() => {
      const c = window.hcCanvas;
      const o = id => c.getObjects().find(x => x.hcType === 'text' && x.hcId === id);
      const info = x => { if (!x) return null; const h = x.height || 0; return { top: Math.round(x.top), h: Math.round(h), te: Math.round(x.top - h/2), be: Math.round(x.top + h/2) }; };
      const r = o('recipient'), re = o('reason'), hn = o('honor'), cl = o('closing');
      const R = info(r), RE = info(re), H = info(hn), C = info(cl);
      const gap = (a, b) => (a && b) ? (b.te - a.be) : null;
      return {
        recipient: R, reason: RE, honor: H, closing: C,
        gap_rec_reason: gap(R, RE), gap_reason_honor: gap(RE, H), gap_honor_closing: gap(H, C)
      };
    });
  }
  for (const tpl of ['tpl-01', 'tpl-03']) {
    const m = await measure(tpl);
    console.log(`\n=== ${tpl} ===`);
    console.log('recipient:', JSON.stringify(m.recipient), ' reason:', JSON.stringify(m.reason), ' honor:', JSON.stringify(m.honor), ' closing:', JSON.stringify(m.closing));
    console.log(`称呼→正文 gap = ${m.gap_rec_reason}`);
    console.log(`正文→荣誉名 gap = ${m.gap_reason_honor}`);
    console.log(`荣誉名→结语 gap = ${m.gap_honor_closing}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
