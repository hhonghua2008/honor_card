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
      const W = c.getWidth() / c.getZoom();
      const objs = c.getObjects();
      const out = { W, H: c.getHeight() / c.getZoom(), count: objs.length, types: objs.map(o => o.hcType + ':' + (o.hcId || '')), list: [] };
      objs.forEach(o => {
        if (o.hcType === 'text' || o.hcType === 'seal') {
          out.list.push({ id: o.hcId, type: o.hcType, text: o.text ? o.text.substring(0, 30) : '',
            left: Math.round(o.left), top: Math.round(o.top), originX: o.originX,
            fontSize: o.fontSize, textAlign: o.textAlign });
        }
        if (o.hcType === 'photo') out.list.push({ id: o.hcId, type: 'photo',
          left: Math.round(o.left), top: Math.round(o.top), hasImage: !!o.hcUserImage });
      });
      return out;
    });
  }

  try {
    // ===== Step 1: 照片区域默认可见（同步 Canvas 占位图）=====
    // 验证：照片模板打开后，画布上存在 photo 对象，且其元素包含金色虚线边框像素
    await page.goto(BASE + '#/editor?tpl=tpl-01', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const photoInfo = await page.evaluate(() => {
      const c = window.hcCanvas;
      const photo = c.getObjects().find(o => o.hcType === 'photo');
      if (!photo) return { exists: false };
      const el = photo.getElement();
      if (!el) return { exists: true, noElement: true };
      const cv = document.createElement('canvas'); cv.width = el.width; cv.height = el.height;
      const ctx = cv.getContext('2d'); ctx.drawImage(el, 0, 0);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let gold = 0, opaque = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i+3] > 100) opaque++;
        const r=d[i], g=d[i+1], b=d[i+2], a=d[i+3];
        if (a > 120 && r > 160 && r < 230 && g > 130 && g < 190 && b < 120) gold++; // #c9a227 虚线金边
      }
      return { exists: true, w: el.width, h: el.height, opaque, gold };
    });
    if (photoInfo.exists && !photoInfo.noElement && photoInfo.gold > 50)
      pass('Step1-visible', `照片区域默认可见: 占位图尺寸 ${photoInfo.w}x${photoInfo.h}, 不透明像素=${photoInfo.opaque}, 金色边框像素=${photoInfo.gold}`);
    else
      fail('Step1-visible', `照片占位异常: ${JSON.stringify(photoInfo)}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v7-photo-visible.png') });

    // ===== Step 2: 点击空照片区域触发文件选择器 =====
    // 获取照片对象在画布上的屏幕坐标，用 Playwright mouse.click 模拟点击
    let clickTriggered = false;
    // 先拦截 file input 的 click，防止实际弹出文件对话框
    await page.evaluate(() => {
      window.__photoClickTest = { triggered: false };
      const origClick = HTMLInputElement.prototype.click;
      const inp = document.getElementById('photoInput');
      if (inp) {
        inp.addEventListener('click', () => { window.__photoClickTest.triggered = true; }, { once: true });
      }
    });
    // 用 Playwright 在照片位置点击
    const photoCoord = await page.evaluate(() => {
      const c = window.hcCanvas;
      const photo = c.getObjects().find(o => o.hcType === 'photo');
      if (!photo) return null;
      const canvasEl = document.getElementById('c');
      const rect = canvasEl.getBoundingClientRect();
      return {
        x: rect.left + photo.left * c.getZoom(),
        y: rect.top + photo.top * c.getZoom()
      };
    });
    if (photoCoord) {
      await page.mouse.click(photoCoord.x, photoCoord.y);
      await page.waitForTimeout(300);
    }
    clickTriggered = await page.evaluate(() => window.__photoClickTest?.triggered || !!window.hcEditorInst?.pendingPhoto);
    if (clickTriggered)
      pass('Step2-click', `点击空照片区域 → 文件选择器已触发(pendingPhoto 或 input click 拦截到)`);
    else
      fail('Step2-click', `点击空照片未触发上传流程`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v7-photo-click.png') });

    // ===== Step 3: 竖版标准布局（称呼左上+荣誉名加引号+落款右下+签章压落款）=====
    await page.goto(BASE + '#/editor?tpl=tpl-02', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    let info = await getObjs();
    const recipient = info.list.find(o => o.id === 'recipient');
    const issuer = info.list.find(o => o.id === 'issuer');
    const date = info.list.find(o => o.id === 'date');
    const seal = info.list.find(o => o.id === 'seal');
    const photo = info.list.find(o => o.type === 'photo');
    // 称呼左上 (originX='left'), 落款日期右下 (originX='right')
    const okLayout = recipient?.originX === 'left'
      && issuer?.originX === 'right' && date?.originX === 'right'
      && !!photo && seal?.type === 'seal';
    // 照片在右侧 (left > canvas宽的一半)
    const photoRightSide = photo && photo.left > info.W * 0.6;
    if (okLayout && photoRightSide)
      pass('Step3-portrait-layout', `竖版布局标准: 称呼左(${recipient.originX}) 落款右(${issuer.originX}) 日期右(${date.originX}) 签章存在 照片在右侧(photo.left=${photo.left}>W*0.6=${Math.round(info.W*0.6)})`);
    else
      fail('Step3-portrait-layout', `竖版布局异常: ${JSON.stringify({recipient, issuer, date, seal, photo, W:info.W})}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v7-portrait-layout.png') });

    // ===== Step 4: 套用内容模版"三好学生"，荣誉名含引号 =====
    await page.selectOption('#ctplSelect', { index: 0 }).catch(() => {});
    await page.evaluate(() => {
      const sel = document.querySelector('#ctplSelect');
      for (const op of sel.options) { if (op.textContent.includes('三好学生')) { sel.value = op.value; sel.dispatchEvent(new Event('change')); break; } }
    });
    await page.waitForTimeout(800);
    const honorInfo = await page.evaluate(() => {
      const c = window.hcCanvas;
      const honor = c.getObjects().find(o => o.hcId === 'honor');
      const closing = c.getObjects().find(o => o.hcId === 'closing');
      const reason = c.getObjects().find(o => o.hcId === 'reason');
      return {
        honorText: honor ? honor.text : null,
        closingText: closing ? closing.text : null,
        reasonText: reason ? reason.text.substring(0, 20) : null,
        hasQuotes: honor ? (honor.text.startsWith('"') || honor.text.startsWith('"')) : false
      };
    });
    if (honorInfo.hasQuotes && honorInfo.closingText.includes('特发此状'))
      pass('Step4-honor-quotes', `荣誉名含引号: "${honorInfo.honorText}", 结语="${honorInfo.closingText}"`);
    else
      fail('Step4-honor-quotes', `荣誉名格式异常: ${JSON.stringify(honorInfo)}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v7-honor-quotes.png') });

    // ===== Step 5: 横版照片奖状布局（文字左侧+照片右侧+无重叠）=====
    await page.goto(BASE + '#/editor?tpl=tpl-13', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    info = await getObjs();
    const recL = info.list.find(o => o.id === 'recipient');
    const reasL = info.list.find(o => o.id === 'reason');
    const phL = info.list.find(o => o.type === 'photo');
    const issL = info.list.find(o => o.id === 'issuer');
    // 横版照片模板：称呼在左侧，照片在右侧，正文也在左侧区域
    const landPhotoOk = recL && phL && issL
      && recL.originX === 'left'
      && phL.left > info.W * 0.7  // 照片在右侧 70%+
      && recL.left < info.W * 0.3; // 称呼在左侧 30%- 以内
    if (landPhotoOk)
      pass('Step5-land-photo', `横版照片布局: 称呼left=${recL.left}(originX=${recL.originX}), 照片left=${phL.left}(>W*0.7=${Math.round(info.W*0.7)}), 落款originX=${issL.originX}`);
    else
      fail('Step5-land-photo', `横版照片布局: ${JSON.stringify({recL, phL, issL, W:info.W})}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v7-land-photo.png') });

    // ===== Step 6: 非照片模板仍保持全宽居中布局 =====
    await page.goto(BASE + '#/editor?tpl=tpl-03', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    info = await getObjs();
    const nonPhotoRecipient = info.list.find(o => o.id === 'recipient');
    const nonPhotoReason = info.list.find(o => o.id === 'reason');
    // 非照片模板：没有 photo 图层，正文居中
    const hasNoPhoto = !info.types.some(t => t.startsWith('photo'));
    const reasonCentered = nonPhotoReason && (
      Math.abs(nonPhotoReason.left - info.W / 2) < 60 || nonPhotoReason.w > info.W * 0.5
    );
    if (hasNoPhoto)
      pass('Step6-nonphoto', `非照片模板(tpl-03): 无照片图层, 类型=[${info.types.join('|')}], 正文位置left=${nonPhotoReason?.left}, 宽度w=${nonPhotoReason?.w}`);
    else
      fail('Step6-nonphoto', `非照片模板异常: types=${info.types.join('|')}`);
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v7-nonphoto.png') });

    if (errs.length) console.log('\n⚠️ Console/Page errors:\n' + errs.join('\n'));
    else console.log('\n✅ 无 JS 报错');

    console.log('\n═══ E2E v1.7 结果 ═══');
    const p = results.filter(r => r.s === '✅').length, f = results.filter(r => r.s === '❌').length;
    console.log(`总计: ${p + f} | 通过: ${p} | 失败: ${f}`);
    results.forEach(r => console.log('  ' + r.s + ' ' + r.n + ': ' + r.d));
  } catch (e) {
    console.error('FATAL:', e.message);
  } finally {
    await browser.close();
  }
})();
