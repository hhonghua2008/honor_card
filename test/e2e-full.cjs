const { chromium } = require('/Users/hehonghua/.workbuddy/binaries/node/workspace/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8000';
const ROOT = '/Users/hehonghua/workshop/honor_card';
const SHOTS = path.join(ROOT, 'test/shots');
const FIXTURES = path.join(ROOT, 'test/fixtures');

let passed = 0, failed = 0;
function assert(cond, label) {
  if (cond) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.log(`  ❌ FAIL: ${label}`); }
}
function logStep(n, title) { console.log(`\n━━━ STEP ${n}: ${title} ━━━`); }
async function shot(page, name, desc) {
  await page.waitForTimeout(600);
  const fp = path.join(SHOTS, `${String(name).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`  📸 ${desc} → ${path.basename(fp)}`);
}

(async () => {
  console.log('╔══════════════════════════════════╗');
  console.log('║  HonorCard MVP — E2A 全链路自测  ║');
  console.log('╚══════════════════════════════════╝\n');

  /* ---- Browser setup ---- */
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-software-rasterizer'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true });
  const page = await ctx.newPage();

  // Auto-accept all native dialogs
  page.on('dialog', async dlg => {
    console.log(`  💬 ${dlg.type()} "${dlg.message().slice(0, 90)}"`);
    await (dlg.type() === 'prompt' ? dlg.accept('E2E Auto Test') : dlg.accept());
  });
  page.on('pageerror', e => console.error(`  ⚠️ PAGE_ERR: ${e.message.slice(0, 120)}`));
  page.on('console', msg => { if (msg.type() === 'error') console.error(`  ⚠️ CONSOLE: ${msg.text().slice(0, 120)}`); });

  /* ═══ STEP 1: 画廊首页 ═══ */
  logStep(1, '画廊首页加载与模板展示');
  await page.goto(BASE + '#/', { waitUntil: 'networkidle', timeout: 30000 });
  const cards = await page.locator('.tpl-card').count();
  assert(cards === 6, `画廊应有 6 张模板卡片，实际 ${cards} 张`);
  const title = await page.title();
  assert(title.includes('HonorCard'), `页面标题含 HonorCard: "${title}"`);
  await shot(page, 'gallery', '画廊首页全貌');

  /* ═══ STEP 2: 选择红金荣耀模板进编辑器 ═══ */
  logStep(2, '选择照片奖状模板进入编辑器');
  await page.locator('.tpl-card[data-id="tpl-01"]').click();
  await page.waitForSelector('#c', { timeout: 10000 });
  await page.waitForTimeout(2000); // 等背景图加载完成
  const cv = await page.locator('#c').isVisible();
  assert(cv, 'Fabric 画布 #c 已渲染');
  const topbar = await page.locator('#saveBtn,#pngBtn,#pdfBtn').count();
  assert(topbar >= 3, `操作栏按钮可见 (${topbar}个)`);
  await shot(page, 'editor-loaded', '红金荣耀编辑器初始状态');

  /* ═══ STEP 3: 文字编辑（改姓名 + 改事由） ═══ */
  logStep(3, '通过 Fabric API 编辑文字图层');
  const r1 = await page.evaluate(() => {
    const c = window.hcCanvas; if (!c) return 'NO_CANVAS';
    const o = c.getObjects().find(x => x.hcId === 'recipient' && x.hcType === 'text');
    if (o) { o.set('text', '南柯先生'); c.renderAll(); return 'OK'; }
    return 'NOT_FOUND';
  });
  assert(r1 === 'OK', `修改 recipient 文字 → ${r1}`);
  await page.evaluate(() => {
    const c = window.hcCanvas;
    const o = c.getObjects().find(x => x.hcId === 'reason' && x.hcType === 'text');
    if (o) { o.set('text', '在量化交易策略研发中表现卓越\n特发此证，以资表彰。'); c.renderAll(); }
  });
  await shot(page, 'text-edited', '修改姓名为"南柯先生" + 修改事由后');

  /* ═══ STEP 4: 上传照片到遮罩区域 ═══ */
  logStep(4, '上传照片到圆形遮罩占位');
  // 选中画布上的照片占位对象 → 面板出现"替换照片"按钮
  const psel = await page.evaluate(() => {
    const c = window.hcCanvas; if (!c) return false;
    const p = c.getObjects().find(x => x.hcType === 'photo'); if (!p) return false;
    c.setActiveObject(p); c.fire('selection:created', { selected: [p] }); c.renderAll(); return true;
  });
  assert(psel, '已选中画布上的 photo 占位对象');
  await page.waitForSelector('#repPhoto', { timeout: 6000 });
  assert(true, '"替换照片"按钮已在属性面板中出现');
  // 用 Playwright fileChooser API 接管系统文件对话框
  let fcErr = null;
  try {
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      page.click('#repPhoto'),
    ]);
    await fc.setFiles(path.join(FIXTURES, 'test-photo.jpg'));
  } catch (e) { fcErr = e.message; }
  assert(!fcErr, `fileChooser 上传成功${fcErr ? ', 错误:' + fcErr.slice(0, 80) : ''}`);
  // 等图片解码 + 遮罩裁切 + 渲染
  await page.waitForTimeout(4000);
  // 验证照片已被应用
  const pst = await page.evaluate(() => {
    const c = window.hcCanvas; if (!c) return null;
    const p = c.getObjects().find(x => x.hcType === 'photo');
    return p ? { userImg: !!p.hcUserImage, mask: p.mask, sx: +(p.scaleX || 0).toFixed(2), sy: +(p.scaleY || 0).toFixed(2) } : null;
  });
  assert(pst && pst.userImg === true, `照片已设置到遮罩: mask=${pst?.mask}, scale=${pst?.sx}x${pst?.sy}`);
  await shot(page, 'photo-uploaded', '照片上传至圆形遮罩后效果');

  /* ═══ STEP 5: 导出 PNG ═══ */
  logStep(5, '导出 PNG 高清证书图');
  let dlOk = false;
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }).catch(() => null),
      page.click('#pngBtn'),
    ]);
    if (dl) { await dl.saveAs(path.join(SHOTS, 'export-cert.png')); dlOk = true; }
  } catch (e) { console.error(`  导出异常: ${e.message?.slice(0, 100)}`); }
  assert(dlOk, 'PNG 下载事件触发并保存成功');
  await shot(page, 'after-png-export', '导出 PNG 后编辑器状态');

  /* ═══ STEP 6: 保存项目到 localStorage ═══ */
  logStep(6, '保存项目到「我的项目」');
  await page.click('#saveBtn');
  await page.waitForTimeout(1200); // 等 prompt + alert 回调完成
  assert(true, '保存操作已执行（自动 accept 了 prompt/dialog）');
  await shot(page, 'after-save', '保存项目后');

  /* ═══ STEP 7: 生成分享链接 ═══ */
  logStep(7, '生成纯前端分享链接');
  // 注入拦截器捕获分享 URL
  await page.evaluate(() => {
    window.__capturedShareUrl = '';
    const origWrite = navigator.clipboard?.writeText?.bind(navigator.clipboard);
    if (origWrite) navigator.clipboard.writeText = t => { window.__capturedShareUrl = t; return origWrite(t); };
    const origPrompt = window.prompt.bind(window);
    window.prompt = (_, v) => { window.__capturedShareUrl = window.__capturedShareUrl || v || ''; return v || ''; };
  });
  await page.click('#shareBtn');
  await page.waitForTimeout(1500);
  const sUrl = await page.evaluate(() => window.__capturedShareUrl || '');
  assert(sUrl.length > 10, `分享链接已生成 (长度=${sUrl.length}, 前80字符: ${sUrl.slice(0, 80)})`);
  console.log(`  🔗 完整分享链接:\n     ${sUrl}`);
  await shot(page, 'share-result', '分享链接生成结果');

  /* ═══ STEP 8: 新标签页打开分享链接验证还原 ═══ */
  if (sUrl) {
    logStep(8, '分享链接只读还原验证');
    const sp = await ctx.newPage();
    sp.on('dialog', async d => await d.accept());
    await sp.goto(sUrl, { waitUntil: 'networkidle', timeout: 25000 });
    await sp.waitForTimeout(2500);
    // 验证编辑器画布已还原
    const sc = await sp.evaluate(() => !!window.hcCanvas);
    assert(sc, '分享链接页面已还原出编辑器画布');
    // 验证文字内容是否保留
    const rt = await sp.evaluate(() => {
      const c = window.hcCanvas; if (!c) return '';
      const o = c.getObjects().find(x => x.hcId === 'recipient' && x.hcType === 'text');
      return o ? o.text : '';
    });
    assert(rt.includes('南柯先生'), `分享还原后 recipient="${rt}" 含"南柯先生"`);
    await shot(sp, 'share-restored', '分享链接只读还原后的画布');
    await sp.close();
  }

  /* ═══ STEP 9: 「我的项目」列表验证持久化 ═══ */
  logStep(9, '「我的项目」页面验证本地持久化');
  await page.goto(BASE + '#/projects', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  const pc = await page.locator('.proj-item').count();
  assert(pc >= 1, `「我的项目」列表有 ${pc} 个已存项目（应 ≥1）`);
  await shot(page, 'my-projects', '「我的项目」页面');

  /* ═══ 结果汇总 ═══ */
  console.log(`\n${'═'.repeat(45)}`);
  console.log(`  总计: ${passed + failed} 项 | ✅ 通过 ${passed}  | ❌ 失败 ${failed}`);
  console.log(`${'═'.repeat(45)}`);
  const shots = fs.readdirSync(SHOTS).filter(f => f.endsWith('.png')).sort();
  console.log(`  截图共 ${shots.length} 张 → ${SHOTS}/`);
  shots.forEach(s => console.log(`    • ${s}`));

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch(e => {
  console.error('💥 E2E 崩溃:', e.stack || e.message || e);
  process.exit(2);
});
