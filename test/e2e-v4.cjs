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
  const results = [];

  function pass(name, detail) { results.push({ name, status: '✅', detail }); console.log('✅ ' + name + ': ' + detail); }
  function fail(name, detail) { results.push({ name, status: '❌', detail }); console.log('❌ ' + name + ': ' + detail); }

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

    // ===== Step 1: 画廊横版缩略图比例正确 =====
    await page.goto(BASE + '/?v=' + Date.now(), { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const thumbs = await page.evaluate(() => {
      var lands = document.querySelectorAll('.thumb.land');
      var ports = document.querySelectorAll('.thumb:not(.land)');
      return {
        landCount: lands.length,
        portCount: ports.length,
        landAspect: lands.length ? (lands[0].offsetWidth / lands[0].offsetHeight).toFixed(1) : 'N/A',
        portAspect: ports.length ? (ports[0].offsetWidth / ports[0].offsetHeight).toFixed(1) : 'N/A'
      };
    });
    if (thumbs.landCount === 6 && thumbs.landAspect === '1.5' && thumbs.portAspect === '0.8')
      pass('Step1', '画廊: 竖版' + thumbs.portCount + '张(3:4), 横版' + thumbs.landCount + '张(3/2)');
    else
      fail('Step1', '异常: ' + JSON.stringify(thumbs));
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v4-step1-gallery.png') });

    // ===== Step 2: 横版模板 tpl-17 完整内容渲染 =====
    await page.goto(BASE + '#/editor?tpl=tpl-17', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    var info = await page.evaluate(function() {
      var c = window.hcCanvas;
      if (!c) return { error: 'no canvas' };
      var objs = c.getObjects();
      return {
        count: objs.length,
        types: objs.map(function(o) { return o.hcType + ':' + (o.hcId || ''); }),
        hasReason: objs.some(function(o) { return o.hcId === 'reason'; }),
        hasSeal: objs.some(function(o) { return o.hcType === 'seal'; }),
        hasDate: objs.some(function(o) { return o.hcId === 'date'; }),
        hasIssuer: objs.some(function(o) { return o.hcId === 'issuer'; })
      };
    });
    info.jsErrors = errs;
    var hasAllLayers = info.hasReason && info.hasSeal && info.hasDate && info.hasIssuer;
    if (hasAllLayers && info.count >= 9)
      pass('Step2', 'tpl-17 渲染 ' + info.count + ' 个图层，含 reason/seal/date/issuer 全部内容');
    else
      fail('Step2', 'tpl-17 缺少! count=' + info.count + ', types=' + info.types.join('|') + ', errors=' + errs.slice(0, 3).join('; '));
    await page.screenshot({ path: PATH.join(SHOT_DIR, 'v4-step2-tpl17-full.png') });

    // ===== Step 3: 横版纯文字模板 tpl-14 =====
    await page.goto(BASE + '#/editor?tpl=tpl-14', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    var t14 = await page.evaluate(function() {
      var c = window.hcCanvas;
      if (!c) return { error: 'no canvas' };
      var objs = c.getObjects();
      return {
        count: objs.length,
        hasReason: objs.some(function(o) { return o.hcId === 'reason'; }),
        hasSeal: objs.some(function(o) { return o.hcType === 'seal'; })
      };
    });
    if (t14.hasReason && t14.hasSeal && t14.count >= 7)
      pass('Step3', 'tpl-14(横版纯文字) ' + t14.count + ' 个图层，含 reason+seal');
    else
      fail('Step3', 'tpl-14 异常! count=' + t14.count);

    // ===== Step 4: 竖版模板正常 =====
    await page.goto(BASE + '#/editor?tpl=tpl-01', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    var t01 = await page.evaluate(function() {
      var c = window.hcCanvas;
      if (!c) return { error: 'no canvas' };
      return { count: c.getObjects().length };
    });
    if (t01.count >= 9)
      pass('Step4', 'tpl-01(竖版) ' + t01.count + ' 个图层正常');
    else
      fail('Step4', 'tpl-01 异常! count=' + t01.count);

    // ===== Step 5: 照片裁剪弹窗触发 =====
    await page.goto(BASE + '#/editor?tpl=tpl-17', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.evaluate(function() {
      var c = window.hcCanvas;
      var photo = c.getObjects().find(function(o) { return o.hcType === 'photo'; });
      if (photo) c.setActiveObject(photo);
    });
    await page.waitForTimeout(500);
    var repBtn = await page.$('#repPhoto');
    if (repBtn) {
      var fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(function() { return null; });
      await repBtn.click();
      var fileChooser = await fileChooserPromise;
      if (fileChooser) {
        await fileChooser.setFiles(TEST_PHOTO);
        await page.waitForTimeout(800);
        var modal = await page.$('.crop-modal');
        var cropImg = await page.$('#cropImg');
        var cropBox = await page.$('.crop-box');
        var confirmBtn = await page.$('#cropConfirm');
        if (modal && cropImg && cropBox && confirmBtn)
          pass('Step5', '裁剪弹窗正常弹出（含预览、裁剪框、确认按钮）');
        else
          fail('Step5', '裁剪弹窗不完整: modal=' + !!modal + ', img=' + !!cropImg + ', box=' + !!cropBox + ', btn=' + !!confirmBtn);
        await page.screenshot({ path: PATH.join(SHOT_DIR, 'v4-step5-crop-modal.png') });

        // ===== Step 6: 裁剪确认后照片填满遮罩 =====
        await confirmBtn.click();
        await page.waitForTimeout(1500);
        var photoInfo = await page.evaluate(function() {
          var c = window.hcCanvas; if (!c) return null;
          var photo = c.getObjects().find(function(o) { return o.hcType === 'photo' && o.hcUserImage; });
          if (!photo) return { error: 'no uploaded photo' };
          return {
            scaleX: Number(photo.scaleX.toFixed(3)),
            scaleY: Number(photo.scaleY.toFixed(3)),
            clipOk: !!photo.clipPath,
            hcSize: photo.hcSize
          };
        });
        if (photoInfo && !photoInfo.error && photoInfo.clipOk)
          pass('Step6', '照片已应用: scale=' + photoInfo.scaleX + 'x' + photoInfo.scaleY + ', 遮罩=' + photoInfo.clipOk);
        else
          fail('Step6', '照片状态异常: ' + JSON.stringify(photoInfo));
        await page.screenshot({ path: PATH.join(SHOT_DIR, 'v4-step6-photo-applied.png') });
      } else {
        fail('Step5', '点击替换照片后未弹出文件选择器');
      }
    } else {
      fail('Step5', '选中照片后无替换按钮');
    }

    // ===== Step 7: 内容模版套用 =====
    await page.goto(BASE + '#/editor?tpl=tpl-17', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.selectOption('#ctplSelect', '0');
    await page.waitForTimeout(500);
    var contentTexts = await page.evaluate(function() {
      var c = window.hcCanvas; if (!c) return null;
      function gt(id) { var o = c.getObjects().find(function(x) { return x.hcType === 'text' && x.hcId === id; }); return o ? o.text : null; }
      return { title: gt('title'), recipient: gt('recipient'), issuer: gt('issuer') };
    });
    if (contentTexts.title === '奖状' && contentTexts.recipient && contentTexts.recipient.indexOf('同学') >= 0)
      pass('Step7', '内容模版套用: "' + contentTexts.title + '" / "' + contentTexts.recipient + '"');
    else
      fail('Step7', '内容模版异常: ' + JSON.stringify(contentTexts));

    // ===== Step 8: PNG 导出 =====
    var pngBtn = await page.$('#pngBtn');
    if (pngBtn) {
      var dlPromise = page.waitForEvent('download', { timeout: 10000 }).catch(function() { return null; });
      await pngBtn.click();
      var dl = await dlPromise;
      if (dl) {
        var savePath = PATH.join(SHOT_DIR, 'v4-export.png');
        await dl.saveAs(savePath);
        var sizeKB = Math.round(FS.statSync(savePath).size / 1024);
        pass('Step8', 'PNG 导出成功, ' + sizeKB + 'KB');
      } else {
        fail('Step8', 'PNG 导出超时或失败');
      }
    } else {
      fail('Step8', 'PNG 按钮不存在');
    }

    // Summary
    console.log('\n═══ E2E v1.4 结果 ═══');
    var passed = results.filter(function(r) { return r.status === '✅'; }).length;
    var failed = results.filter(function(r) { return r.status === '❌'; }).length;
    console.log('总计: ' + (passed + failed) + ' | 通过: ' + passed + ' | 失败: ' + failed);
    results.forEach(function(r) { console.log('  ' + r.status + ' ' + r.name + ': ' + r.detail); });

  } catch (e) {
    console.error('FATAL:', e.message);
    console.error(e.stack);
  } finally {
    await browser.close();
  }
})();
