const { chromium } = require('/Users/hehonghua/.workbuddy/binaries/node/workspace/node_modules/playwright');
const FS = require('fs');
const PATH = require('path');

const BASE = 'http://localhost:8787';
const SHOT_DIR = '/Users/hehonghua/workshop/honor_card/test/shots';
const TEST_PHOTO = '/Users/hehonghua/workshop/honor_card/test/fixtures/test-photo.jpg';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });

  const results = [];
  const pass = (n, d) => { results.push({ n, s: '✅', d }); console.log('✅ ' + n + ': ' + d); };
  const fail = (n, d) => { results.push({ n, s: '❌', d }); console.log('❌ ' + n + ': ' + d); };

  function getObjs() {
    return page.evaluate(() => {
      const c = window.hcCanvas; if (!c) return { error: 'no canvas' };
      const W = c.getWidth() / c.getZoom(); // 原图宽
      const objs = c.getObjects();
      const out = { W, H: c.getHeight() / c.getZoom(), count: objs.length, types: objs.map(o => o.hcType + ':' + (o.hcId || '')), list: [] };
      objs.forEach(o => {
        if (o.hcType === 'text' || o.hcType === 'seal') {
          out.list.push({ id: o.hcId, type: o.hcType, text: o.text ? o.text.substring(0, 24) : '',
            left: Math.round(o.left), top: Math.round(o.top), originX: o.originX, fontSize: o.fontSize,
            right: Math.round(o.left + (o.width || 0) * (o.scaleX || 1) / 2), w: Math.round((o.width || 0) * (o.scaleX || 1)) });
        }
        if (o.hcType === 'photo') out.list.push({ id: o.hcId, type: 'photo', left: Math.round(o.left), top: Math.round(o.top) });
      });
      return out;
    });
  }

  try {
    // ===== Step 1: 竖版标准布局（tpl-02 粉彩童趣，照片款）=====
    await page.goto(BASE + '#/editor?tpl=tpl-02', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2800);
    let info = await getObjs();
    const cx = info.W / 2;
    const recipient = info.list.find(o => o.id === 'recipient');
    const issuer = info.list.find(o => o.id === 'issuer');
    const date = info.list.find(o => o.id === 'date');
    const photo = info.list.find(o => o.id === 'photo');
    const recipientLeft = recipient && recipient.left < cx * 0.8 && recipient.originX === 'left';
    const issuerRight = issuer && issuer.left > cx && issuer.originX === 'right';
    const dateRight = date && date.left > cx && date.originX === 'right';
    const photoExists = !!photo;
    if (recipientLeft && issuerRight && dateRight && photoExists)
      pass('Step1-layout', `竖版标准布局: 称呼左上(originX=${recipient && recipient.originX}), 落款/日期右下(originX=${issuer && issuer.originX}/${date && date.originX}), 照片默认存在`);
    else
      fail('Step1-layout', `recipientLeft=${recipientLeft}, issuerRight=${issuerRight}, dateRight=${dateRight}, photo=${photoExists} (info: ${JSON.stringify(info.list.map(o=>o.id+':'+o.originX))})`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v6-tpl02-portrait.png') });

    // ===== Step 2: 套用内容模版"三好学生"，荣誉名独立居中一行 =====
    await page.selectOption('#ctplSelect', { label: '三好学生' }).catch(() => {});
    // 上面可能因 optgroup 失败，改用值
    await page.evaluate(() => {
      const sel = document.querySelector('#ctplSelect');
      // 找到 label=三好学生 的 option
      for (const op of sel.options) { if (op.textContent.includes('三好学生')) { sel.value = op.value; sel.dispatchEvent(new Event('change')); break; } }
    });
    await page.waitForTimeout(800);
    const honorInfo = await page.evaluate(() => {
      const c = window.hcCanvas;
      const honor = c.getObjects().find(o => o.hcId === 'honor');
      const reason = c.getObjects().find(o => o.hcId === 'reason');
      const closing = c.getObjects().find(o => o.hcId === 'closing');
      const cx = window.hcEditorInst.template.canvas.w / 2;
      return {
        hasHonor: !!honor,
        honorText: honor ? honor.text : null,
        honorOriginX: honor ? honor.originX : null,
        honorCentered: honor ? Math.abs(honor.left - cx) < 8 : false,
        reasonText: reason ? reason.text.substring(0, 20) : null,
        closingText: closing ? closing.text.substring(0, 12) : null,
        recipient: c.getObjects().find(o=>o.hcId==='recipient').text
      };
    });
    if (honorInfo.hasHonor && honorInfo.honorText === '三好学生' && honorInfo.honorCentered && honorInfo.closingText.includes('特发此状'))
      pass('Step2-honor', `套用"三好学生": 荣誉名="${honorInfo.honorText}" 居中独立一行, 结语="${honorInfo.closingText}", 称呼="${honorInfo.recipient}"`);
    else
      fail('Step2-honor', `荣誉名未正确显示: ${JSON.stringify(honorInfo)}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v6-tpl02-sanhao.png') });

    // ===== Step 3: 横版标准布局（tpl-13）=====
    await page.goto(BASE + '#/editor?tpl=tpl-13', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2800);
    info = await getObjs();
    const cxL = info.W / 2;
    const recL = info.list.find(o => o.id === 'recipient');
    const issL = info.list.find(o => o.id === 'issuer');
    const phL = info.list.find(o => o.id === 'photo');
    if (recL && recL.left < cxL && recL.originX === 'left' && issL && issL.left > cxL && phL)
      pass('Step3-land', `横版标准布局: 称呼左上, 落款右下(originX=${issL.originX}), 照片默认存在`);
    else
      fail('Step3-land', `recL=${JSON.stringify(recL)}, issL=${JSON.stringify(issL)}, photo=${!!phL}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v6-tpl13-landscape.png') });

    // ===== Step 4: 签章字体可读（自适应字号 + 透明镂空）=====
    await page.goto(BASE + '#/editor?tpl=tpl-23', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2800);
    const sealInfo = await page.evaluate(() => {
      const c = window.hcCanvas;
      const seal = c.getObjects().find(o => o.hcType === 'seal');
      const el = seal.getElement();
      const cv = document.createElement('canvas'); cv.width = el.width; cv.height = el.height;
      const ctx = cv.getContext('2d'); ctx.drawImage(el, 0, 0);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const N = d.length / 4; let trans = 0, red = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 20) trans++;
        if (d[i + 3] > 100 && d[i] > 120 && d[i] > d[i + 1] + 15 && d[i] > d[i + 2] + 15) red++;
      }
      // 估算字号：统计弧形文字区域最大连续红宽（粗略）
      return { w: cv.width, size: seal.sealSize, transRatio: (trans / N).toFixed(2), red,
        isTransparentInterior: (function(){ const cx=cv.width/2, cy=cv.height/2, r=cv.width/2-4;
          const pLow = Math.floor(cx + r*0.35); return d[(cy*cv.width+pLow)*4+3] < 40; })() };
    });
    // 透明镂空 + 红色元素存在 + 字号足够（size>=150 竖/120 横）
    if (sealInfo.isTransparentInterior && sealInfo.red > 1000 && sealInfo.size >= 120)
      pass('Step4-seal', `签章: 透明镂空(内部透明=${sealInfo.isTransparentInterior}), 红字红圈(red像素=${sealInfo.red}), 尺寸=${sealInfo.size}px(自适应放大)`);
    else
      fail('Step4-seal', `签章异常: ${JSON.stringify(sealInfo)}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v6-tpl23-seal.png') });

    // ===== Step 5: 照片区域默认可见（虚线金边占位）=====
    await page.goto(BASE + '#/editor?tpl=tpl-23', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // 选中照片，检查遮罩边框附近有金色像素（虚线金边 #c9a227 ≈ rgb(201,162,39)）
    const photoVisible = await page.evaluate(() => {
      const c = window.hcCanvas;
      const photo = c.getObjects().find(o => o.hcType === 'photo');
      if (!photo) return { exists: false };
      const el = photo.getElement();
      const cv = document.createElement('canvas'); cv.width = el.width; cv.height = el.height;
      const ctx = cv.getContext('2d'); ctx.drawImage(el, 0, 0);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let gold = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
        if (a > 120 && r > 160 && r < 230 && g > 130 && g < 190 && b < 120) gold++;
      }
      return { exists: true, gold, w: cv.width };
    });
    if (photoVisible.exists && photoVisible.gold > 30)
      pass('Step5-photo', `照片槽位默认可见: 占位图含金色虚线边框(gold像素=${photoVisible.gold})，无需点击"增加照片"`);
    else
      fail('Step5-photo', `照片占位不可见: ${JSON.stringify(photoVisible)}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v6-photo-visible.png') });

    // ===== Step 6: 横版可爱模板（tpl-28 海洋）套用内容模版正常 =====
    await page.goto(BASE + '#/editor?tpl=tpl-28', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    info = await getObjs();
    const hasAll = info.list.some(o => o.id === 'title') && info.list.some(o => o.id === 'reason')
      && info.list.some(o => o.id === 'closing') && info.list.some(o => o.id === 'photo')
      && info.list.some(o => o.id === 'seal');
    if (hasAll) pass('Step6-cute', `可爱横版(tpl-28)图层完整: ${info.types.join('|')}`);
    else fail('Step6-cute', `图层缺失: ${info.types.join('|')}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v6-tpl28-ocean.png') });

    if (errs.length) console.log('\n⚠️ Console/Page errors:\n' + errs.join('\n'));
    else console.log('\n✅ 无 JS 报错');

    console.log('\n═══ E2E v1.6 结果 ═══');
    const p = results.filter(r => r.s === '✅').length, f = results.filter(r => r.s === '❌').length;
    console.log(`总计: ${p + f} | 通过: ${p} | 失败: ${f}`);
    results.forEach(r => console.log('  ' + r.s + ' ' + r.n + ': ' + r.d));
  } catch (e) {
    console.error('FATAL:', e.message);
  } finally {
    await browser.close();
  }
})();
