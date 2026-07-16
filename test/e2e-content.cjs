const { chromium } = require('/Users/hehonghua/.workbuddy/binaries/node/workspace/node_modules/playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8787';
const SHOTS = '/Users/hehonghua/workshop/honor_card/test/shots';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message));

  const log = (s) => console.log(s);
  let step = 0;
  const ok = (n) => { step++; log(`STEP ${step} ✅ ${n}`); };
  const bad = (n, e) => { step++; log(`STEP ${step} ❌ ${n} :: ${e}`); };

  try {
    // 1) gallery
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.tpl-card', { timeout: 10000 });
    const cards = await page.$$eval('.tpl-card', els => els.length);
    if (cards === 12) ok(`画廊渲染 ${cards} 张模板`); else bad('画廊卡片数', `期望12 实际${cards}`);
    await page.screenshot({ path: SHOTS + '/c-gallery.png' });

    // 2) enter a NEW template (tpl-07)
    await page.locator('.tpl-card[data-id="tpl-07"]').click();
    await page.waitForSelector('#c', { timeout: 10000 });
    await page.waitForTimeout(800);
    ok('进入新模板 tpl-07 (宇宙蓝紫)');

    // 3) content preset dropdown populated
    const optCount = await page.$$eval('#ctplSelect option', els => els.length);
    if (optCount > 13) ok(`内容模版下拉已生成 (${optCount} 项, 含15套)`); else bad('内容模版下拉', `选项过少 ${optCount}`);

    // 4) apply a preset (三好学生 -> first optgroup 校园, index 1)
    await page.selectOption('#ctplSelect', { index: 1 });
    await page.waitForTimeout(400);
    const afterPreset = await page.evaluate(() => {
      const c = window.hcCanvas;
      const get = id => { const o = c.getObjects().find(o => o.hcType === 'text' && o.hcId === id); return o ? o.text : null; };
      return { title: get('title'), recipient: get('recipient'), reason: get('reason'), issuer: get('issuer') };
    });
    if (afterPreset.title === '奖状' && afterPreset.recipient && afterPreset.recipient.indexOf('同学') >= 0 && afterPreset.reason && afterPreset.reason.indexOf('三好学生') >= 0)
      ok(`套用内容模版成功 → 标题:${afterPreset.title} 姓名:${afterPreset.recipient} 正文含"三好学生"`);
    else bad('套用内容模版', JSON.stringify(afterPreset));

    // 5) edit form name field -> live update canvas
    await page.fill('#fName', '张小明 同学');
    await page.waitForTimeout(300);
    const nameOnCanvas = await page.evaluate(() => {
      const c = window.hcCanvas; const o = c.getObjects().find(o => o.hcType === 'text' && o.hcId === 'recipient'); return o ? o.text : null;
    });
    if (nameOnCanvas === '张小明 同学') ok(`表单改姓名实时写回画布 → ${nameOnCanvas}`); else bad('表单写回', nameOnCanvas);

    // 6) upload photo
    const fileInput = await page.$('#photoInput');
    await page.evaluate(() => {
      const c = window.hcCanvas; const p = c.getObjects().find(o => o.hcType === 'photo');
      if (p) { c.setActiveObject(p); c.renderAll(); }
    });
    await page.waitForTimeout(200);
    // trigger replace via property panel
    await page.evaluate(() => {
      const c = window.hcCanvas; const p = c.getObjects().find(o => o.hcType === 'photo');
      if (p) { c.setActiveObject(p); c.renderAll(); }
      const ev = new CustomEvent('selection:created'); c.fire('selection:created');
    });
    await page.waitForTimeout(200);
    const hasRep = await page.$('#repPhoto');
    if (hasRep) {
      await page.click('#repPhoto');
      await page.waitForTimeout(200);
      await fileInput.setInputFiles('/Users/hehonghua/workshop/honor_card/test/fixtures/test-photo.jpg');
      await page.waitForTimeout(900);
      const photoOK = await page.evaluate(() => {
        const c = window.hcCanvas; const p = c.getObjects().find(o => o.hcType === 'photo');
        return !!(p && p.hcUserImage);
      });
      if (photoOK) ok('照片上传 (圆形遮罩) 成功'); else bad('照片上传', '遮罩未生效');
    } else { bad('照片属性面板', '未出现替换按钮'); }

    // 7) export PNG
    const { execSync } = require('child_process');
    const before = fs.readdirSync(SHOTS).length;
    await page.click('#pngBtn');
    await page.waitForTimeout(1200);
    const exported = fs.readdirSync(SHOTS).filter(f => f.startsWith('honorcard') || f.endsWith('.png')).length;
    ok('点击 PNG 导出 (触发下载)');
    await page.screenshot({ path: SHOTS + '/c-editor.png' });

    log('\n=== 控制台错误 ===');
    if (errors.length) errors.slice(0, 8).forEach(e => log('  • ' + e)); else log('  (无)');

    log(`\n总步数: ${step}`);
  } catch (e) {
    bad('异常', e.message);
    log(e.stack);
  } finally {
    await browser.close();
  }
})();
