// E2E v1.10 — 验证：①落款/签章往中间挪 ②横版非照片统一边距 ③正文/结语字号增大
const { chromium } = require('playwright');
const BASE = 'http://localhost:8787';
let passN = 0, failN = 0;
function pass(s, d) { passN++; console.log('  ✅ ' + s + (d ? ' — ' + d : '')); }
function fail(s, d) { failN++; console.log('  ❌ ' + s + (d ? ' — ' + d : '')); }
function info(tpl) { return `?tpl=${tpl}`; }

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  async function layout(tpl) {
    await page.goto(BASE + '/#/editor' + info(tpl), { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    return await page.evaluate(() => {
      const c = window.hcCanvas, t = window.hcEditorInst.template, W = t.canvas.w;
      const get = id => c.getObjects().find(o => o.hcType === 'text' && o.hcId === id) ||
                          c.getObjects().find(o => o.hcType === 'seal' && o.hcId === id);
      const objs = c.getObjects();
      const photo = objs.find(o => o.hcType === 'photo');
      const r = id => { const o = get(id); if (!o) return null;
        return { left: o.left, top: o.top, fs: o.fontSize, originX: o.originX, width: o.width,
                 rightEdge: o.originX === 'right' ? o.left : (o.left + (o.width || 0) / 2) }; };
      const seal = objs.find(o => o.hcType === 'seal');
      return {
        W, photo: !!photo,
        recipient: r('recipient'), reason: r('reason'), honor: r('honor'),
        closing: r('closing'), issuer: r('issuer'), date: r('date'),
        seal: seal ? { left: seal.left, top: seal.top } : null
      };
    });
  }

  console.log('\n=== v1.10 E2E ===\n');

  // ---- Step 1: 竖版照片奖状 — 落款/签章往中间挪 + 字号 ----
  console.log('Step1: 竖版照片奖状 (tpl-01)');
  let L = await layout('tpl-01');
  // 落款 rightEdge 应明显 < 794（旧值），约 720；签章中心应在 720 附近
  if (L.issuer && L.issuer.rightEdge <= 740 && L.issuer.rightEdge > 600) pass('落款右移进内', `rightEdge=${L.issuer.rightEdge}`);
  else fail('落款右移进内', `rightEdge=${L.issuer && L.issuer.rightEdge}`);
  if (L.seal && L.seal.left <= 740 && L.seal.left >= 680) pass('签章左移进内', `center=${L.seal.left}`);
  else fail('签章左移进内', `center=${L.seal && L.seal.left}`);
  if (L.reason && L.reason.fs >= 36) pass('正文字号增大', `fs=${L.reason.fs}`);
  else fail('正文字号增大', `fs=${L.reason && L.reason.fs}`);
  if (L.closing && L.closing.fs >= 34) pass('结语字号增大', `fs=${L.closing.fs}`);
  else fail('结语字号增大', `fs=${L.closing && L.closing.fs}`);
  await page.screenshot({ path: 'test/shots/v10-portrait-photo.png' });

  // ---- Step 2: 竖版非照片奖状 (tpl-03) ----
  console.log('Step2: 竖版非照片奖状 (tpl-03)');
  L = await layout('tpl-03');
  if (L.issuer && L.issuer.rightEdge <= 740 && L.issuer.rightEdge > 600) pass('落款右移进内', `rightEdge=${L.issuer.rightEdge}`);
  else fail('落款右移进内', `rightEdge=${L.issuer && L.issuer.rightEdge}`);
  if (L.seal && L.seal.left <= 740) pass('签章左移进内', `center=${L.seal.left}`);
  else fail('签章左移进内', `center=${L.seal && L.seal.left}`);
  if (L.reason && L.reason.fs >= 38) pass('正文字号增大', `fs=${L.reason.fs}`);
  else fail('正文字号增大', `fs=${L.reason && L.reason.fs}`);
  // 验证荣誉名与正文不重叠：honor.top 应明显 > reason 底部估算
  if (L.reason && L.honor && L.honor.top > L.reason.top + 120) pass('荣誉名在正文下方', `honor.top=${L.honor.top} > reason.top=${L.reason.top}`);
  else fail('荣誉名位置', `honor.top=${L.honor && L.honor.top}, reason.top=${L.reason && L.reason.top}`);
  await page.screenshot({ path: 'test/shots/v10-portrait-nonphoto.png' });

  // ---- Step 3: 横版照片奖状 (tpl-13) ----
  console.log('Step3: 横版照片奖状 (tpl-13)');
  L = await layout('tpl-13');
  if (L.issuer && L.issuer.rightEdge <= 1000 && L.issuer.rightEdge >= 900) pass('落款右移进内', `rightEdge=${L.issuer.rightEdge} (旧1096)`);
  else fail('落款右移进内', `rightEdge=${L.issuer && L.issuer.rightEdge}`);
  if (L.seal && L.seal.left <= 980 && L.seal.left >= 920) pass('签章左移进内', `center=${L.seal.left} (旧1040)`);
  else fail('签章左移进内', `center=${L.seal && L.seal.left}`);
  if (L.reason && L.reason.fs >= 28) pass('正文字号增大', `fs=${L.reason.fs}`);
  else fail('正文字号增大', `fs=${L.reason && L.reason.fs}`);
  await page.screenshot({ path: 'test/shots/v10-land-photo.png' });

  // ---- Step 4: 横版非照片「荣誉证书」(tpl-14) — 重点验证统一边距 ----
  console.log('Step4: 横版非照片荣誉证书 (tpl-14)');
  L = await layout('tpl-14');
  if (L.photo) { fail('tpl-14 不应有照片', ''); }
  else pass('非照片模板无照片层', '');
  // 称呼左距应 >= 140（统一边距 M=140），不再贴边 120
  if (L.recipient && L.recipient.left >= 140) pass('称呼统一边距', `left=${L.recipient.left}`);
  else fail('称呼统一边距', `left=${L.recipient && L.recipient.left}`);
  // 落款同样往中间挪
  if (L.issuer && L.issuer.rightEdge <= 1000 && L.issuer.rightEdge >= 900) pass('落款右移进内', `rightEdge=${L.issuer.rightEdge}`);
  else fail('落款右移进内', `rightEdge=${L.issuer && L.issuer.rightEdge}`);
  if (L.reason && L.reason.fs >= 32) pass('正文字号增大', `fs=${L.reason.fs}`);
  else fail('正文字号增大', `fs=${L.reason && L.reason.fs}`);
  // 边距一致：reason 居中宽度右侧边距应与称呼左距大致对称
  if (L.reason && L.reason.rightEdge <= L.W - 120) pass('正文右留边距', `rightEdge=${L.reason.rightEdge}, W=${L.W}`);
  else fail('正文右留边距', `rightEdge=${L.reason && L.reason.rightEdge}`);
  await page.screenshot({ path: 'test/shots/v10-land-nonphoto.png' });

  // ---- Step 5: 横版可爱非照片 (tpl-26) — 同样统一 ----
  console.log('Step5: 横版非照片可爱 (tpl-26)');
  L = await layout('tpl-26');
  if (L.issuer && L.issuer.rightEdge <= 1000) pass('落款右移进内', `rightEdge=${L.issuer.rightEdge}`);
  else fail('落款右移进内', `rightEdge=${L.issuer && L.issuer.rightEdge}`);
  if (L.reason && L.reason.fs >= 32) pass('正文字号增大', `fs=${L.reason.fs}`);
  else fail('正文字号增大', `fs=${L.reason && L.reason.fs}`);
  await page.screenshot({ path: 'test/shots/v10-land-nonphoto-cute.png' });

  console.log('\n=== JS 错误检查 ===');
  if (errors.length === 0) pass('无 JS 报错', '');
  else fail('存在 JS 报错', errors.slice(0, 5).join(' | '));

  await browser.close();
  console.log(`\n=== 结果: ${passN} 通过 / ${failN} 失败 ===`);
  process.exit(failN === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
