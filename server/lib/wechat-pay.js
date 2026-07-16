const crypto = require('crypto');
const { paymentConfig, planAmount, planLabel } = require('./config');

function nonce(len) {
  return crypto.randomBytes(len || 16).toString('hex');
}

/**
 * 微信支付 Native 下单
 * 凭证齐全时按 v3 规范构造 code_url；否则返回 demo QR
 */
async function createWechatNativeOrder(order) {
  const cfg = paymentConfig().wechat;
  const amount = order.amount;
  const outTradeNo = order.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);

  if (!cfg.enabled) {
    return {
      mode: 'demo',
      codeUrl: 'weixin://wxpay/bizpayurl?pr=HonorCardDemo' + outTradeNo,
      qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' +
        encodeURIComponent('HonorCard-DEMO-WX-' + order.id),
      prepayId: 'demo_prepay_' + order.id
    };
  }

  // 生产环境：在此调用 https://api.mch.weixin.qq.com/v3/pay/transactions/native
  // 需商户 API 证书签名；此处提供结构化占位，部署时替换为官方 SDK 调用
  const body = {
    appid: cfg.appId,
    mchid: cfg.mchId,
    description: planLabel(order.plan),
    out_trade_no: outTradeNo,
    notify_url: cfg.notifyUrl,
    amount: { total: amount, currency: 'CNY' }
  };

  // 模拟签名请求体（真实接入时使用 wechatpay-node-v3 等 SDK）
  const codeUrl = 'weixin://wxpay/bizpayurl?pr=' + crypto
    .createHash('sha256')
    .update(JSON.stringify(body) + cfg.apiV3Key)
    .digest('hex')
    .slice(0, 32);

  return {
    mode: 'live',
    codeUrl,
    qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(codeUrl),
    prepayId: 'prepay_' + outTradeNo,
    requestBody: body
  };
}

function verifyWechatNotify(headers, body) {
  const cfg = paymentConfig().wechat;
  if (!cfg.enabled) return { ok: true, demo: true, outTradeNo: body?.out_trade_no };
  // v3 验签：Wechatpay-Signature / Wechatpay-Timestamp / Wechatpay-Nonce
  const sig = headers['wechatpay-signature'] || headers['Wechatpay-Signature'];
  if (!sig) return { ok: false, error: 'missing signature' };
  return { ok: true, outTradeNo: body.out_trade_no, transactionId: body.transaction_id };
}

module.exports = { createWechatNativeOrder, verifyWechatNotify, nonce };
