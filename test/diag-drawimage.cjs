// 精准诊断: 逐步排查 drawImage 崩溃来源
const { chromium } = require('/Users/hehonghua/.workbuddy/binaries/node/workspace/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  page.on('pageerror', e => console.error(`[ERR] ${e.message.slice(0, 150)}`));
  
  await page.goto('http://127.0.0.1:8000/#/', { waitUntil: 'networkidle' });
  await page.locator('.tpl-card[data-id="tpl-01"]').click();
  await page.waitForSelector('#c', { timeout: 10000 });
  await page.waitForTimeout(3000);
  
  // === 测试 A: 不传照片，直接 toDataURL ===
  console.log('\n=== TEST A: 初始状态(无用户照片) toDataURL ===');
  const resultA = await page.evaluate(() => {
    const c = window.hcCanvas; if (!c) return 'NO_CANVAS';
    try {
      // 先列出所有对象及其类型
      const objs = c.getObjects().map(o => ({
        type: o.type, hcType: o.hcType, hcId: o.hcId,
        hasClipPath: !!o.clipPath,
        isImage: o.type === 'image',
        elementType: o._element ? o._element.constructor.name : 'none',
        elementTag: o._element ? String(o._element.tagName || '').toLowerCase() : '',
        width: o.width || o.radius ? (o.radius || o.width) : null,
        src: o._element ? (o._element.src || '').slice(0, 60) : ''
      }));
      
      let url = null;
      let err = null;
      try { url = c.toDataURL({ format: 'png', multiplier: 1 }); }
      catch(e) { err = e.message; }
      
      return { objectCount: objs.length, objects: objs, 
               dataUrlLength: url ? url.length : 0, 
               dataUrlStart: url ? url.slice(0, 40) : null,
               error: err };
    } catch(e) { return `EVAL_ERR: ${e.message}`; }
  });
  console.log(JSON.stringify(resultA, null, 2));

  // === 测试 B: 上传照片后再 toDataURL ===
  console.log('\n=== TEST B: 上传照片后 toDataURL ===');
  
  // Select photo placeholder
  await page.evaluate(() => {
    const c = window.hcCanvas;
    const p = c.getObjects().find(x => x.hcType === 'photo');
    if (p) { c.setActiveObject(p); c.fire('selection:created', { selected: [p] }); c.renderAll(); }
  });
  await page.waitForSelector('#repPhoto', { timeout: 5000 });
  
  const [fc] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('#repPhoto')
  ]);
  await fc.setFiles('/Users/hehonghua/workshop/honor_card/test/fixtures/test-photo.jpg');
  await page.waitForTimeout(4000);

  const resultB = await page.evaluate(() => {
    const c = window.hcCanvas; if (!c) return 'NO_CANVAS';
    try {
      const photoObj = c.getObjects().find(o => o.hcType === 'photo' && o.hcUserImage);
      const photoInfo = photoObj ? {
        hasElement: !!photoObj._element,
        elemType: photoObj._element?.constructor?.name,
        elemTag: photoObj._element?.tagName,
        naturalW: photoObj._element?.naturalWidth,
        naturalH: photoObj._element?.naturalHeight,
        complete: photoObj._element?.complete,
        srcLen: photoObj._element?.src?.length,
        srcStart: photoObj._element?.src?.slice(0, 50),
        scaleX: photoObj.scaleX, scaleY: photoObj.scaleY,
        clipType: photoObj.clipPath?.type
      } : 'NO_PHOTO_OBJ';

      let url = null, err = null;
      try { url = c.toDataURL({ format: 'png', multiplier: 1 }); }
      catch(e) { err = e.message; }

      return { photoInfo, dataUrlLength: url ? url.length : 0, error: err };
    } catch(e) { return `EVAL_ERR: ${e.message}`; }
  });
  console.log(JSON.stringify(resultB, null, 2));

  // === 测试 C: 尝试用原生 canvas toDataURL（绕过 Fabric）===
  console.log('\n=== TEST C: DOM canvas 直接 toDataURL ===');
  const resultC = await page.evaluate(() => {
    const el = document.querySelector('#c'); if (!el) return 'NO_ELEM';
    try {
      const url = el.toDataURL('image/png');
      return { length: url?.length, start: url?.slice(0, 40) };
    } catch(e) { return `ERROR: ${e.message}`; }
  });
  console.log(JSON.stringify(resultC, null, 2));

  await browser.close();
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
})().catch(e => console.error('CRASH:', e));
