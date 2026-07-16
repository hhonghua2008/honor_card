const crypto = require('crypto');
const { paymentConfig, planLabel } = require('./config');

function buildAlipayPagePay(order) {
  const cfg = paymentConfig().alipay;
  const outTradeNo = order.id;
  const amountYuan = (order.amount / 100).toFixed(2);

  if (!cfg.enabled) {
    const demoUrl = paymentConfig().publicWebUrl + '/#/pricing?demo_alipay=' + encodeURIComponent(order.id);
    return {
      mode: 'demo',
      payUrl: demoUrl,
      qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(demoUrl),
      formHtml: null
    };
  }

  const params = {
    app_id: cfg.appId,
    method: 'alipay.trade.page.pay',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    version: '1.0',
    notify_url: cfg.notifyUrl,
    return_url: cfg.returnUrl + '&order=' + encodeURIComponent(order.id),
    biz_content: JSON.stringify({
      out_trade_no: outTradeNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: amountYuan,
      subject: planLabel(order.plan)
    })
  };

  const signStr = Object.keys(params).sort().map(k => k + '=' + params[k]).join('&');
  const sign = crypto.createSign('RSA-SHA256').update(signStr).sign(cfg.privateKey, 'base64');
  params.sign = sign;

  const query = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  const payUrl = 'https://openapi.alipay.com/gateway.do?' + query;

  return {
    mode: 'live',
    payUrl,
    qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(payUrl),
    formHtml: null
  };
}

function verifyAlipayNotify(body) {
  const cfg = paymentConfig().alipay;
  if (!cfg.enabled) {
    return { ok: true, demo: true, outTradeNo: body.out_trade_no, tradeStatus: body.trade_status || 'TRADE_SUCCESS' };
  }
  const sign = body.sign;
  if (!sign) return { ok: false, error: 'missing sign' };
  const verify = crypto.createVerify('RSA-SHA256');
  const content = Object.keys(body).filter(k => k !== 'sign' && k !== 'sign_type').sort()
    .map(k => k + '=' + body[k]).join('&');
  verify.update(content);
  const ok = verify.verify(cfg.alipayPublicKey, sign, 'base64');
  return { ok, outTradeNo: body.out_trade_no, tradeStatus: body.trade_status };
}

module.exports = { buildAlipayPagePay, verifyAlipayNotify };
