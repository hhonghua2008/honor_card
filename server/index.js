/**
 * HonorCard API — Phase E
 * Run: cd server && npm install && npm start
 */
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { paymentConfig } = require('./lib/config');
const { createPaymentOrder, fulfillOrder, handleWechatNotify, handleAlipayNotify } = require('./lib/payment');
const catalogLib = require('./lib/catalog');

const PORT = process.env.PORT || 8788;
const DATA = path.join(__dirname, 'data.json');
const UPLOADS = path.join(__dirname, 'uploads');
const JWT_SECRET = process.env.JWT_SECRET || 'honorcard-dev-secret-change-me';
const OPS_KEY = process.env.OPS_API_KEY || 'honorcard-ops-dev';

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const ACTIVATION_CODES = {
  HONORPRO2026: { days: 365, plan: 'pro' },
  BETA30: { days: 30, plan: 'pro' },
  TEAM7: { days: 7, plan: 'team' }
};

function loadDb() {
  if (!fs.existsSync(DATA)) {
    return { users: {}, projects: {}, orders: {}, catalog: catalogLib.defaultCatalog() };
  }
  const db = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  if (!db.catalog) db.catalog = catalogLib.defaultCatalog();
  if (!db.orders) db.orders = {};
  return db;
}

function saveDb(db) {
  fs.writeFileSync(DATA, JSON.stringify(db, null, 2));
}

function hashPassword(p) {
  return crypto.createHash('sha256').update(p).digest('hex');
}

function signToken(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + 30 * 86400000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifyToken(token) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  const expect = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  if (sig !== expect) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Date.now()) return null;
    return data.uid;
  } catch (e) { return null; }
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const uid = verifyToken(token);
  if (!uid) return res.status(401).json({ error: '未登录' });
  req.uid = uid;
  next();
}

function opsAuth(req, res, next) {
  const key = req.headers['x-ops-key'] || req.query.ops_key || '';
  if (key !== OPS_KEY) return res.status(403).json({ error: 'Ops 密钥无效' });
  next();
}

function userPublic(u) {
  return {
    id: u.id, email: u.email, name: u.name,
    proUntil: u.proUntil || 0,
    teamUntil: u.teamUntil || 0,
    plan: u.teamUntil > Date.now() ? 'team' : (u.proUntil > Date.now() ? 'pro' : 'free')
  };
}

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, 'tpl_' + Date.now() + ext);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const app = express();
app.use(cors({ origin: true }));
app.use('/uploads', express.static(UPLOADS));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/v1/health', (req, res) => {
  const pay = paymentConfig();
  res.json({
    ok: true,
    service: 'honorcard-api',
    version: '1.1.0',
    payment: {
      wechat: pay.wechat.enabled ? 'live' : 'demo',
      alipay: pay.alipay.enabled ? 'live' : 'demo'
    }
  });
});

app.get('/api/v1/catalog', (req, res) => {
  const db = loadDb();
  res.json({ ok: true, catalog: catalogLib.listPublicCatalog(db) });
});

// —— Auth ——
app.post('/api/v1/auth/register', (req, res) => {
  const db = loadDb();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const name = req.body.name || email.split('@')[0];
  if (!email || password.length < 6) return res.status(400).json({ error: '邮箱或密码无效' });
  if (db.users[email]) return res.status(409).json({ error: '邮箱已注册' });
  const id = 'u_' + Date.now();
  db.users[email] = { id, email, name, passwordHash: hashPassword(password), proUntil: 0, teamUntil: 0, createdAt: Date.now() };
  saveDb(db);
  res.json({ ok: true, token: signToken(id), user: userPublic(db.users[email]) });
});

app.post('/api/v1/auth/login', (req, res) => {
  const db = loadDb();
  const email = (req.body.email || '').trim().toLowerCase();
  const u = db.users[email];
  if (!u || u.passwordHash !== hashPassword(req.body.password || '')) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  res.json({ ok: true, token: signToken(u.id), user: userPublic(u) });
});

app.get('/api/v1/auth/me', auth, (req, res) => {
  const db = loadDb();
  const u = Object.values(db.users).find(x => x.id === req.uid);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  res.json({ ok: true, user: userPublic(u) });
});

// —— Projects ——
app.get('/api/v1/projects', auth, (req, res) => {
  const db = loadDb();
  res.json({ ok: true, projects: Object.values(db.projects).filter(p => p.userId === req.uid) });
});

app.put('/api/v1/projects/:id', auth, (req, res) => {
  const db = loadDb();
  const id = req.params.id;
  db.projects[id] = {
    id, userId: req.uid,
    name: req.body.name, templateId: req.body.templateId,
    scene: req.body.scene, thumb: req.body.thumb,
    updatedAt: req.body.updatedAt || Date.now()
  };
  saveDb(db);
  res.json({ ok: true, project: db.projects[id] });
});

app.delete('/api/v1/projects/:id', auth, (req, res) => {
  const db = loadDb();
  const p = db.projects[req.params.id];
  if (p && p.userId === req.uid) delete db.projects[req.params.id];
  saveDb(db);
  res.json({ ok: true });
});

app.post('/api/v1/activate', auth, (req, res) => {
  const db = loadDb();
  const u = Object.values(db.users).find(x => x.id === req.uid);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  const code = (req.body.code || '').trim().toUpperCase();
  const row = ACTIVATION_CODES[code];
  if (!row) return res.status(400).json({ error: '激活码无效' });
  const base = Math.max(u.proUntil || 0, u.teamUntil || 0, Date.now());
  const until = base + row.days * 86400000;
  if (row.plan === 'team') u.teamUntil = until;
  else u.proUntil = until;
  db.users[u.email] = u;
  saveDb(db);
  res.json({ ok: true, user: userPublic(u), msg: '激活成功' });
});

// —— Payment ——
app.get('/api/v1/payment/config', (req, res) => {
  const pay = paymentConfig();
  res.json({
    ok: true,
    channels: [
      { id: 'wechat', name: '微信支付', enabled: true, mode: pay.wechat.enabled ? 'live' : 'demo' },
      { id: 'alipay', name: '支付宝', enabled: true, mode: pay.alipay.enabled ? 'live' : 'demo' }
    ]
  });
});

app.post('/api/v1/payment/orders', auth, async (req, res) => {
  const db = loadDb();
  const plan = req.body.plan === 'team' ? 'team' : 'pro';
  const channel = req.body.channel === 'alipay' ? 'alipay' : 'wechat';
  try {
    const order = await createPaymentOrder(db, req.uid, plan, channel);
    saveDb(db);
    res.json({
      ok: true,
      orderId: order.id,
      status: order.status,
      channel: order.channel,
      amount: order.amount,
      payMode: order.payMode,
      qrUrl: order.qrUrl,
      payUrl: order.payUrl || null,
      msg: order.payMode === 'demo'
        ? '演示模式：可轮询订单状态，或调用 confirm 模拟支付'
        : '请使用' + (channel === 'alipay' ? '支付宝' : '微信') + '扫码完成支付'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/v1/payment/orders/:id/confirm', auth, (req, res) => {
  const db = loadDb();
  const order = db.orders[req.params.id];
  if (!order || order.userId !== req.uid) return res.status(404).json({ error: '订单不存在' });
  const result = fulfillOrder(db, order.id);
  if (!result) return res.status(400).json({ error: '订单无法完成' });
  saveDb(db);
  res.json({ ok: true, status: 'paid', user: userPublic(result.user) });
});

app.get('/api/v1/payment/orders/:id', auth, (req, res) => {
  const db = loadDb();
  const order = db.orders[req.params.id];
  if (!order || order.userId !== req.uid) return res.status(404).json({ error: '订单不存在' });
  const u = Object.values(db.users).find(x => x.id === req.uid);
  res.json({
    ok: true,
    order: {
      id: order.id, status: order.status, channel: order.channel,
      plan: order.plan, amount: order.amount, payMode: order.payMode,
      qrUrl: order.qrUrl, payUrl: order.payUrl, paidAt: order.paidAt
    },
    user: u ? userPublic(u) : null
  });
});

app.post('/api/v1/payment/notify/wechat', (req, res) => {
  const db = loadDb();
  const r = handleWechatNotify(db, req.headers, req.body);
  if (r.ok) saveDb(db);
  res.status(r.ok ? 200 : 400).json({ code: r.ok ? 'SUCCESS' : 'FAIL', message: r.error || 'OK' });
});

app.post('/api/v1/payment/notify/alipay', (req, res) => {
  const db = loadDb();
  const r = handleAlipayNotify(db, req.body);
  if (r.ok) saveDb(db);
  res.send(r.ok ? 'success' : 'fail');
});

// —— Ops / 模板运营 ——
app.get('/api/v1/ops/catalog', opsAuth, (req, res) => {
  const db = loadDb();
  res.json({ ok: true, catalog: catalogLib.listPublicCatalog(db) });
});

app.put('/api/v1/ops/catalog', opsAuth, (req, res) => {
  const db = loadDb();
  const cat = catalogLib.applyCatalogOps(db, req.body);
  saveDb(db);
  res.json({ ok: true, catalog: cat });
});

app.post('/api/v1/ops/templates/:id/toggle', opsAuth, (req, res) => {
  const db = loadDb();
  const disabled = catalogLib.toggleTemplate(db, req.params.id, !!req.body.enabled);
  saveDb(db);
  res.json({ ok: true, disabled });
});

app.post('/api/v1/ops/templates', opsAuth, (req, res) => {
  const db = loadDb();
  const tpl = req.body;
  if (!tpl.id || !tpl.name) return res.status(400).json({ error: '缺少 id / name' });
  catalogLib.upsertCustomTemplate(db, tpl);
  saveDb(db);
  res.json({ ok: true, template: tpl });
});

app.delete('/api/v1/ops/templates/:id', opsAuth, (req, res) => {
  const db = loadDb();
  catalogLib.removeCustomTemplate(db, req.params.id);
  saveDb(db);
  res.json({ ok: true });
});

app.post('/api/v1/ops/upload', opsAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  const url = '/uploads/' + req.file.filename;
  const base = (process.env.PUBLIC_URL || 'http://127.0.0.1:8788').replace(/\/$/, '');
  res.json({ ok: true, url, absoluteUrl: base + url });
});

app.listen(PORT, () => {
  const pay = paymentConfig();
  console.log('HonorCard API → http://127.0.0.1:' + PORT);
  console.log('Payment: WeChat=' + (pay.wechat.enabled ? 'LIVE' : 'demo') + ' Alipay=' + (pay.alipay.enabled ? 'LIVE' : 'demo'));
  console.log('Ops key: OPS_API_KEY (default honorcard-ops-dev)');
});
