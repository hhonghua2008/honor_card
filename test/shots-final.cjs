const { chromium } = require('/Users/hehonghua/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });

  // 编辑页：奖状完整可见、无需滚动、签章镂空红圈
  await page.goto('http://localhost:8787/#/editor?tpl=tpl-23?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/Users/hehonghua/workshop/honor_card/test/shots/final-editor-tpl23.png' });
  console.log('saved editor tpl-23');

  // 公章放大截图（透明镂空 + 红圈红字）
  const sealBox = await page.evaluate(() => {
    const c = window.hcCanvas; const s = c.getObjects().find(o => o.hcType === 'seal');
    return s ? { left: s.left, top: s.top, size: s.sealSize } : null;
  });
  if (sealBox) {
    // 用 canvas 数据导出印章区域 PNG
    const sealUrl = await page.evaluate(() => {
      const c = window.hcCanvas; const s = c.getObjects().find(o => o.hcType === 'seal');
      const el = s.getElement();
      const cv = document.createElement('canvas'); cv.width = el.width; cv.height = el.height;
      cv.getContext('2d').drawImage(el, 0, 0);
      return cv.toDataURL('image/png');
    });
    const fs = require('fs');
    fs.writeFileSync('/Users/hehonghua/workshop/honor_card/test/shots/final-seal.png', Buffer.from(sealUrl.split(',')[1], 'base64'));
    console.log('saved seal png (transparent)');
  }

  // 首页画廊（含可爱横版）
  await page.goto('http://localhost:8787/?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/Users/hehonghua/workshop/honor_card/test/shots/final-gallery.png', fullPage: true });
  console.log('saved gallery');

  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
