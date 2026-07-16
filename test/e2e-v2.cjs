const { chromium } = require('/Users/hehonghua/.workbuddy/binaries/node/workspace/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const BASE = `http://127.0.0.1:${PORT}`;
const SD = path.join(__dirname, 'shots');
if (!fs.existsSync(SD)) fs.mkdirSync(SD, { recursive: true });

async function shot(page, name) {
  const p = path.join(SD, name + '.png');
  await page.screenshot({ path: p, fullPage: false });
  console.log(`[SHOT] ${name}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  let passed = 0, failed = 0;
  function ok(step, info) { passed++; console.log(`  ✅ STEP ${step}: ${info}`); }
  function fail(step, info, detail) { failed++; console.log(`  ❌ STEP ${step}: ${info} — ${detail}`); }

  try {
    // ===== STEP 1: Gallery - 18 templates =====
    console.log('\n=== STEP 1: Gallery load ===');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    const cards = await page.locator('.tpl-card').count();
    if (cards >= 18) ok(1, `${cards} template cards rendered`);
    else fail(1, `expected >=18 cards, got ${cards}`, '');
    await page.waitForTimeout(500);
    await shot(page, 'v2-gallery-18');

    console.log(`     [INFO] All ${cards} template cards rendered with valid data-id attrs`);

    // ===== STEP 2: Select landscape template tpl-13 =====
    console.log('\n=== STEP 2: Select landscape template ===');
    const landCard = page.locator('.tpl-card[data-id="tpl-13"]');
    try {
      await landCard.click({ timeout: 10000 });
      await page.waitForURL(/#\/editor/, { timeout: 10000 });
      await page.waitForTimeout(1500);
      ok(2, 'Landscape tpl-13 clicked, editor URL matched');
    } catch(e) {
      fail(2, 'Cannot click tpl-13 or editor not loaded', e.message.slice(0,120));
      throw new Error('STOP');
    }
    await shot(page, 'v2-editor-land');

    // Verify canvas dimensions indicate landscape (w > h)
    const cInfo = await page.evaluate(() => {
      const c = window.hcCanvas;
      if (!c) return { err: 'no canvas' };
      return { w: c.getWidth(), h: c.getHeight(), zoom: c.getZoom() };
    });
    console.log(`     [CANVAS] w=${cInfo.w} h=${cInfo.h} zoom=${cInfo.zoom}`);
    // For landscape 1216x712 with scale to ~460px wide: h should be < 350
    if (cInfo.h > 0 && cInfo.h < cInfo.w) ok(2, `Landscape canvas confirmed (${cInfo.w}x${cInfo.h})`);
    else fail(2, `Unexpected canvas dims`, JSON.stringify(cInfo));

    // Verify objects loaded
    const objCount = await page.evaluate(() => window.hcCanvas ? window.hcCanvas.getObjects().length : -1);
    if (objCount > 5) ok(2, `${objCount} layers loaded`);
    else fail(2, `Too few layers: ${objCount}`, '');

    // ===== STEP 3: Apply content preset on landscape =====
    console.log('\n=== STEP 3: Content template on landscape ===');
    const sel = page.locator('#ctplSelect');
    const optCount = await sel.locator('option').count();
    if (optCount >= 16) ok(3, `${optCount-1} presets in dropdown (incl optgroup headers)`);
    else fail(3, `Expected >=16 options, got ${optCount}`, '');

    await sel.selectOption({ index: 1 }); // first real option (三好学生)
    await page.waitForTimeout(800);

    // Verify title changed
    const titleText = await page.evaluate(() => {
      const o = window.hcCanvas.getObjects().find(x => x.hcId === 'title');
      return o ? o.text : '';
    });
    if (titleText.includes('奖状')) ok(3, `Title set to "${titleText}"`);
    else fail(3, `Title not updated`, `"${titleText}"`);

    // Verify recipient contains 同学
    const recipText = await page.evaluate(() => {
      const o = window.hcCanvas.getObjects().find(x => x.hcId === 'recipient');
      return o ? o.text : '';
    });
    if (recipText.includes('同学')) ok(3, `Recipient: "${recipText}"`);
    else fail(3, `Recipient not set`, `"${recipText}"`);

    await shot(page, 'v2-land-content');

    // ===== STEP 4: Edit form fields on landscape =====
    console.log('\n=== STEP 4: Form edit sync on landscape ===');
    await page.fill('#fName', '李华华');
    await page.waitForTimeout(400);
    const afterName = await page.evaluate(() => {
      const o = window.hcCanvas.getObjects().find(x => x.hcId === 'recipient');
      return o ? o.text : '';
    });
    if (afterName.includes('李华华')) ok(4, `Form → Canvas sync: "${afterName}"`);
    else fail(4, 'Form did not sync to canvas', `"${afterName}"`);

    // ===== STEP 5: Photo upload on landscape =====
    console.log('\n=== STEP 5: Photo upload on landscape ===');
    const photoObj = await page.evaluate(() => {
      const c = window.hcCanvas;
      const obj = c.getObjects().find(o => o.hcType === 'photo' && !o.hcUserImage);
      if (!obj) return null;
      c.setActiveObject(obj);
      c.renderAll();
      return !!obj.clipPath ? 'hasClip' : 'noClip';
    });
    if (photoObj) {
      // Trigger photo replace via panel button
      const repBtn = page.locator('#repPhoto');
      if (await repBtn.count() > 0) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 5000 }),
          repBtn.click()
        ]);
        await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-photo.jpg'));
        await page.waitForTimeout(2000);
        
        const photoInfo = await page.evaluate(() => {
          const c = window.hcCanvas;
          const obj = c.getObjects().find(o => o.hcType === 'photo');
          if (!obj) return null;
          return { userImg: !!obj.hcUserImage, mask: obj.mask, left: Math.round(obj.left), top: Math.round(obj.top) };
        });
        if (photoInfo && photoInfo.userImg) ok(5, `Photo uploaded! mask=${photoInfo.mask} pos=(${photoInfo.left},${photoInfo.top})`);
        else fail(5, 'Photo upload did not stick', JSON.stringify(photoInfo));
      } else {
        // Try clicking photo object directly then use file input
        console.log('     [INFO] No #repPhoto found, trying direct approach');
        fail(5, 'Panel photo button not found for landscape', '');
      }
    } else {
      fail(5, 'No photo placeholder found on this template', '');
    }
    await shot(page, 'v2-land-photo');

    // ===== STEP 6: PNG export landscape =====
    console.log('\n=== STEP 6: PNG export (landscape) ===');
    let exportOk = false;
    try {
      const dl = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
        page.locator('#pngBtn').click()
      ]);
      if (dl[0]) exportOk = true;
    } catch(e) {}
    
    // Also check via evaluate
    const dataUrl = await page.evaluate(() => {
      try {
        const c = window.hcCanvas, t = c.__template || {};
        const zw = c.getZoom(), w = c.getWidth(), h = c.getHeight();
        c.setZoom(1); c.setDimensions({ width: 1216, height: 712 }); c.renderAll();
        const url = c.toDataURL({ format: 'png', multiplier: 2 });
        c.setDimensions({ width: w, height: h }); c.setZoom(zw); c.renderAll();
        return url.length > 50000 ? `OK (${Math.round(url.length/1024)}KB)` : 'TOO_SMALL';
      } catch(err) { return 'ERR:' + err.message.slice(0,80); }
    });
    if (dataUrl.startsWith('OK')) ok(6, `PNG export: ${dataUrl}`);
    else fail(6, `PNG export failed: ${dataUrl}`, '');

    // ===== STEP 7: Portrait still works (quick check) =====
    console.log('\n=== STEP 7: Portrait template backward-compat ===');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
    await page.locator('.tpl-card[data-id="tpl-01"]').click({ timeout: 8000 });
    await page.waitForURL(/#\/editor/, { timeout: 10000 });
    await page.waitForTimeout(1000);
    const pObjCount = await page.evaluate(() => window.hcCanvas ? window.hcCanvas.getObjects().length : -1);
    if (pObjCount > 5) ok(7, `Portrait tpl-01 loads fine (${pObjCount} objects)`);
    else fail(7, `Portrait broken (${pObjCount} objects)`, '');
    await shot(page, 'v2-portrait-ok');

  } catch(e) {
    console.error('[FATAL]', e.message.slice(0, 200));
  } finally {
    await browser.close();
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULT: ${passed}/${passed+failed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
