/**
 * 支付配置 — 填入商户凭证后启用真实通道，否则走 demo 模式
 */
function paymentConfig() {
  const baseUrl = (process.env.PUBLIC_URL || 'http://127.0.0.1:8788').replace(/\/$/, '');
  return {
    demo: process.env.PAYMENT_DEMO !== '0',
    wechat: {
      enabled: !!(process.env.WECHAT_APP_ID && process.env.WECHAT_MCH_ID && process.env.WECHAT_API_V3_KEY),
      appId: process.env.WECHAT_APP_ID || '',
      mchId: process.env.WECHAT_MCH_ID || '',
      apiV3Key: process.env.WECHAT_API_V3_KEY || '',
      notifyUrl: baseUrl + '/api/v1/payment/notify/wechat'
    },
    alipay: {
      enabled: !!(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY),
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
      notifyUrl: baseUrl + '/api/v1/payment/notify/alipay',
      returnUrl: (process.env.PUBLIC_WEB_URL || 'http://127.0.0.1:8787') + '/#/pricing?paid=1'
    },
    publicWebUrl: process.env.PUBLIC_WEB_URL || 'http://127.0.0.1:8787'
  };
}

function planAmount(plan) {
  return plan === 'team' ? 29900 : 9900;
}

function planLabel(plan) {
  return plan === 'team' ? 'HonorCard Team 年费' : 'HonorCard Pro 年费';
}

module.exports = { paymentConfig, planAmount, planLabel };
