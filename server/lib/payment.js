const { createWechatNativeOrder, verifyWechatNotify } = require('./wechat-pay');
const { buildAlipayPagePay, verifyAlipayNotify } = require('./alipay');
const { planAmount } = require('./config');

async function createPaymentOrder(db, uid, plan, channel) {
  const ch = channel === 'alipay' ? 'alipay' : 'wechat';
  const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const order = {
    id: orderId,
    userId: uid,
    plan: plan === 'team' ? 'team' : 'pro',
    amount: planAmount(plan),
    channel: ch,
    status: 'pending',
    createdAt: Date.now()
  };
  db.orders[orderId] = order;

  if (ch === 'alipay') {
    const pay = buildAlipayPagePay(order);
    order.payMode = pay.mode;
    order.payUrl = pay.payUrl;
    order.qrUrl = pay.qrUrl;
  } else {
    const pay = await createWechatNativeOrder(order);
    order.payMode = pay.mode;
    order.codeUrl = pay.codeUrl;
    order.qrUrl = pay.qrUrl;
    order.prepayId = pay.prepayId;
  }
  return order;
}

function fulfillOrder(db, orderId) {
  const order = db.orders[orderId];
  if (!order || order.status === 'paid') return null;
  order.status = 'paid';
  order.paidAt = Date.now();
  const u = Object.values(db.users).find(x => x.id === order.userId);
  if (!u) return null;
  const days = 365;
  const base = Math.max(u.proUntil || 0, u.teamUntil || 0, Date.now());
  if (order.plan === 'team') u.teamUntil = base + days * 86400000;
  else u.proUntil = base + days * 86400000;
  db.users[u.email] = u;
  return { order, user: u };
}

function handleWechatNotify(db, headers, body) {
  const v = verifyWechatNotify(headers, body);
  if (!v.ok) return { ok: false };
  const orderId = findOrderByTradeNo(db, v.outTradeNo);
  if (!orderId) return { ok: false, error: 'order not found' };
  fulfillOrder(db, orderId);
  return { ok: true, orderId };
}

function handleAlipayNotify(db, body) {
  const v = verifyAlipayNotify(body);
  if (!v.ok || v.tradeStatus !== 'TRADE_SUCCESS') return { ok: false };
  const orderId = v.outTradeNo;
  if (!db.orders[orderId]) return { ok: false, error: 'order not found' };
  fulfillOrder(db, orderId);
  return { ok: true, orderId };
}

function findOrderByTradeNo(db, tradeNo) {
  if (db.orders[tradeNo]) return tradeNo;
  return Object.keys(db.orders).find(id => id.includes(tradeNo) || tradeNo.includes(id));
}

module.exports = {
  createPaymentOrder, fulfillOrder,
  handleWechatNotify, handleAlipayNotify
};
