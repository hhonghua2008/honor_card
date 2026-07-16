const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:8787';
const SHOTS = '/Users/hehonghua/workshop/honor_card/test/shots';
fs.mkdirSync(SHOTS, { recursive: true });

let passN = 0, failN = 0;
const pass = (s, m) => { passN++; console.log(`  ✅ ${s}: ${m}`); };
const fail = (s, m) => { failN++; console.log(`  ❌ ${s}: ${m}`); };

function info(page) {
  return page.evaluate(() => {
    const c = window.hcCanvas, t = window.hcEditorInst.template;
    const W = t.canvas.w;
    const o = (id) => c.getObjects().find(x => x.hcType === 'text' && x.hcId === id);
    const photo = c.getObjects().find(x => x.hcType === 'photo');
    const title = c.getObjects().find(x => x.hcType === 'text' && x.hcId === 'title');
    const r = o('recipient'), hon = o('honor'), iss = o('issuer'), clos = o('closing');
    return {
      W, H: t.canvas.h,
      titleCS: title ? title.charSpacing : null,
      photoLeft: photo ? photo.left : null,
      recipientLeft: r ? r.left : null,
      honorText: hon ? hon.text : null,
      honorTop: hon ? hon.top : null,
      closingTop: clos ? clos.top : null,
      closingCenterX: clos ? clos.left : null,
      issuerLeft: iss ? iss.left : null,
      hasPhoto: !!photo
    };
  });
}

(async () => {
  const errors = [];
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  // ===== Step1: 竖版照片奖状（tpl-01）=====
  console.log('\n[Step1] 竖版照片奖状 tpl-01（照片应在左，默认三好学生）');
  await page.goto(`${BASE}/#/editor?tpl=tpl-01`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  let i1 = await info(page);
  console.log('  layout:', JSON.stringify(i1));
  if (i1.photoLeft !== null && i1.recipientLeft !== null && i1.photoLeft < i1.recipientLeft)
    pass('Step1-photoLeft', `照片在左(left=${i1.photoLeft}) < 文字(left=${i1.recipientLeft})`);
  else fail('Step1-photoLeft', `照片/文字位置异常: photo=${i1.photoLeft}, recipient=${i1.recipientLeft}`);
  if (i1.honorText && i1.honorText.includes('三好学生'))
    pass('Step1-defaultThreeHao', `默认荣誉名 = "${i1.honorText}"`);
  else fail('Step1-defaultThreeHao', `默认荣誉名异常: "${i1.honorText}"`);
  if (i1.titleCS === 300) pass('Step1-titleCS', `标题字距 charSpacing=${i1.titleCS}`);
  else fail('Step1-titleCS', `标题字距=${i1.titleCS}，期望 300`);
  // 边距检查：落款右对齐应距右边≥200
  if ((i1.W - i1.issuerLeft) >= 200) pass('Step1-issuerMargin', `落款右边距=${i1.W - i1.issuerLeft}`);
  else fail('Step1-issuerMargin', `落款太靠右，右边距=${i1.W - i1.issuerLeft}`);
  await page.screenshot({ path: `${SHOTS}/v9-portrait-photo-left.png` });

  // ===== Step2: 竖版非照片（tpl-03）=====
  console.log('\n[Step2] 竖版非照片 tpl-03（内容居中、边距充足、默认三好学生）');
  await page.goto(`${BASE}/#/editor?tpl=tpl-03`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  let i2 = await info(page);
  console.log('  layout:', JSON.stringify(i2));
  if (!i2.hasPhoto) pass('Step2-nonPhoto', `非照片模板无 photo 图层`);
  else fail('Step2-nonPhoto', `应为非照片模板`);
  if (i2.recipientLeft >= 200) pass('Step2-recipientMargin', `称呼左边距=${i2.recipientLeft}`);
  else fail('Step2-recipientMargin', `称呼太靠左，left=${i2.recipientLeft}`);
  if ((i2.W - i2.issuerLeft) >= 200) pass('Step2-issuerMargin', `落款右边距=${i2.W - i2.issuerLeft}`);
  else fail('Step2-issuerMargin', `落款太靠右，右边距=${i2.W - i2.issuerLeft}`);
  if (i2.honorText && i2.honorText.includes('三好学生'))
    pass('Step2-defaultThreeHao', `默认荣誉名 = "${i2.honorText}"`);
  else fail('Step2-defaultThreeHao', `默认荣誉名异常: "${i2.honorText}"`);
  // 荣誉名应在结语之上
  if (i2.honorTop < i2.closingTop) pass('Step2-honorAboveClosing', `荣誉名(top=${i2.honorTop}) 在结语(top=${i2.closingTop}) 之上`);
  else fail('Step2-honorAboveClosing', `顺序异常: honor=${i2.honorTop}, closing=${i2.closingTop}`);
  await page.screenshot({ path: `${SHOTS}/v9-portrait-nonphoto.png` });

  // ===== Step3: 横版照片奖状（tpl-13）=====
  console.log('\n[Step3] 横版照片奖状 tpl-13（照片应在左，默认三好学生）');
  await page.goto(`${BASE}/#/editor?tpl=tpl-13`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  let i3 = await info(page);
  console.log('  layout:', JSON.stringify(i3));
  if (i3.photoLeft !== null && i3.recipientLeft !== null && i3.photoLeft < i3.recipientLeft)
    pass('Step3-photoLeft', `照片在左(left=${i3.photoLeft}) < 文字(left=${i3.recipientLeft})`);
  else fail('Step3-photoLeft', `照片/文字位置异常: photo=${i3.photoLeft}, recipient=${i3.recipientLeft}`);
  if (i3.titleCS === 200) pass('Step3-titleCS', `标题字距 charSpacing=${i3.titleCS}`);
  else fail('Step3-titleCS', `标题字距=${i3.titleCS}，期望 200`);
  if (i3.honorText && i3.honorText.includes('三好学生'))
    pass('Step3-defaultThreeHao', `默认荣誉名 = "${i3.honorText}"`);
  else fail('Step3-defaultThreeHao', `默认荣誉名异常: "${i3.honorText}"`);
  if ((i3.W - i3.issuerLeft) >= 100) pass('Step3-issuerMargin', `落款右边距=${i3.W - i3.issuerLeft}`);
  else fail('Step3-issuerMargin', `落款太靠右，右边距=${i3.W - i3.issuerLeft}`);
  await page.screenshot({ path: `${SHOTS}/v9-land-photo-left.png` });

  // ===== Step4: 横版非照片（tpl-14）=====
  console.log('\n[Step4] 横版非照片 tpl-14（内容居中、边距充足、默认三好学生）');
  await page.goto(`${BASE}/#/editor?tpl=tpl-14`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  let i4 = await info(page);
  console.log('  layout:', JSON.stringify(i4));
  if (i4.recipientLeft >= 100) pass('Step4-recipientMargin', `称呼左边距=${i4.recipientLeft}`);
  else fail('Step4-recipientMargin', `称呼太靠左，left=${i4.recipientLeft}`);
  if ((i4.W - i4.issuerLeft) >= 100) pass('Step4-issuerMargin', `落款右边距=${i4.W - i4.issuerLeft}`);
  else fail('Step4-issuerMargin', `落款太靠右，右边距=${i4.W - i4.issuerLeft}`);
  if (i4.honorText && i4.honorText.includes('三好学生'))
    pass('Step4-defaultThreeHao', `默认荣誉名 = "${i4.honorText}"`);
  else fail('Step4-defaultThreeHao', `默认荣誉名异常: "${i4.honorText}"`);
  await page.screenshot({ path: `${SHOTS}/v9-land-nonphoto.png` });

  // ===== Step5: 之前是“金色之星”的模板（tpl-20）现在默认三好学生 =====
  console.log('\n[Step5] tpl-20（原金色之星）现在默认应为三好学生');
  await page.goto(`${BASE}/#/editor?tpl=tpl-20`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  let i5 = await info(page);
  console.log('  layout:', JSON.stringify(i5));
  if (i5.honorText && i5.honorText.includes('三好学生'))
    pass('Step5-forcedThreeHao', `tpl-20 默认荣誉名 = "${i5.honorText}"`);
  else fail('Step5-forcedThreeHao', `tpl-20 默认荣誉名仍为: "${i5.honorText}"`);
  await page.screenshot({ path: `${SHOTS}/v9-tpl20-default.png` });

  // ===== 汇总 =====
  console.log('\n========== E2E v1.9 结果 ==========');
  console.log(`通过 ${passN} / 失败 ${failN}`);
  if (errors.length) {
    console.log('⚠️ 控制台/页面错误:');
    errors.forEach(e => console.log('   - ' + e));
  } else {
    console.log('✅ 无 JS 报错');
  }
  await browser.close();
  process.exit(failN === 0 && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('运行异常:', e); process.exit(2); });
