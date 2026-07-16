# HonorCard API（Phase D/E）

轻量 Node.js 后端：账号、云同步、支付、模板运营。

## 启动

```bash
cd server
npm install
cp .env.example .env    # 可选：填入微信/支付宝商户凭证
npm start               # http://127.0.0.1:8788
```

## 前端配置

```html
<script>window.HC_API_URL = 'http://127.0.0.1:8788';</script>
```

## 支付（Phase E）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/payment/config` | 可用支付通道 |
| POST | `/api/v1/payment/orders` | 创建订单 `{ plan, channel: wechat\|alipay }` |
| GET | `/api/v1/payment/orders/:id` | 查询状态（前端轮询） |
| POST | `/api/v1/payment/notify/wechat` | 微信支付回调 |
| POST | `/api/v1/payment/notify/alipay` | 支付宝回调 |

凭证环境变量见 `.env.example`。未配置时自动 **demo 模式**（QR + confirm 模拟）。

## 模板运营

| 方法 | 路径 | Header |
|------|------|--------|
| GET | `/api/v1/catalog` | 公开，画廊合并用 |
| GET | `/api/v1/ops/catalog` | `X-Ops-Key` |
| POST | `/api/v1/ops/templates/:id/toggle` | 上下架 |
| POST | `/api/v1/ops/templates` | 新增自定义模板 |
| POST | `/api/v1/ops/upload` | 上传背景图 |

默认 Ops 密钥：`honorcard-ops-dev`（`OPS_API_KEY`）

## 其他 API

Auth / Projects / Activate 同 Phase D，见 health 检查 `GET /api/v1/health`。

## 生产部署

- PostgreSQL 替代 `data.json`
- 微信 v3 建议使用官方 SDK 替换 `lib/wechat-pay.js` 占位实现
- 支付宝 RSA2 私钥填入 `ALIPAY_PRIVATE_KEY`（PEM 或单行 base64）
- HTTPS + 回调 URL 白名单

`data.json` 与 `uploads/` 已 gitignore。
