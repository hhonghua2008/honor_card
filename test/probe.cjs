const { chromium } = require('/Users/hehonghua/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERR: '+e.message));
  await page.goto('http://localhost:8787/#/editor?tpl=tpl-17', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const c = window.hcCanvas;
    if (!c) return { error: 'no canvas' };
    const objs = c.getObjects();
    return {
      w: c.getWidth(), h: c.getHeight(),
      count: objs.length,
      types: objs.map(o => o.hcType + ':' + (o.hcId||'')),
      texts: objs.filter(o=>o.hcType==='text').map(o=>({id:o.hcId,text:o.text,fill:o.fill,left:Math.round(o.left),top:Math.round(o.top),fontSize:o.fontSize})),
      bg: objs.some(o=>o.hcType==='bg')
    };
  });
  console.log('tpl-17 info:', JSON.stringify(info, null, 2));
  console.log('errors:', JSON.stringify(errs, null, 2));
  await page.screenshot({ path: '/Users/hehonghua/workshop/honor_card/test/shots/probe-tpl17.png' });
  await browser.close();
})().catch(e=>{console.error('FATAL', e); process.exit(1);});
