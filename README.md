# HonorCard · 奖状模板定制

免费在线奖状/荣誉证书制作工具。选模板 → 改内容 → 下载 PNG/PDF 或分享链接。

## 本地运行

```bash
chmod +x start.sh
./start.sh          # 默认 http://127.0.0.1:8787
./start.sh 8080     # 指定端口
```

## 浏览器要求

- Chrome / Edge / Safari 最新两版
- 需启用 IndexedDB（隐私模式可能受限）

## 功能

- 28+ 精美模板（竖版 / 横版 / 照片奖状）
- 在线编辑文字、照片、签章
- 本地保存（IndexedDB，数据不上传服务器）
- 分享链接（纯前端编码）
- 导出 PNG / PDF（标准 / 高清）
- JPG 导出（适合微信分享）
- 批量生成：名单/CSV → ZIP 打包 PNG

## 资源优化

```bash
./scripts/optimize-templates.sh   # 生成 WebP 与缩略图
```

## 部署

静态站点，无需构建。推荐 **GitHub Pages**（免费）。

### 在线地址（部署后）

**https://hhonghua2008.github.io/honor_card**

### 一键部署

```bash
brew install gh          # 若未安装
gh auth login            # 浏览器授权一次
./scripts/deploy-github.sh
```

推送 `main` 后 GitHub Actions 自动部署（见 `.github/workflows/deploy.yml`）。

也支持 [Vercel](https://vercel.com) / [Netlify](https://netlify.com) / [Cloudflare Pages](https://pages.cloudflare.com)（已含 `vercel.json`、`netlify.toml`、`_headers`）。

## 隐私

- 默认：照片与作品仅存于用户浏览器本地
- 可选：登录并配置 `HC_API_URL` 后，项目 JSON 可同步至自建 API（照片仍建议本地存储）
- 分享链接将作品数据编码在 URL 中，请谨慎分享

## Phase D · 云端与增长（v1.4+）

```bash
cd server && npm install && npm start   # API → http://127.0.0.1:8788
```

在 `index.html` 取消注释：

```html
<script>window.HC_API_URL = 'http://127.0.0.1:8788';</script>
```

| 路由 | 功能 |
|------|------|
| `#/account` | 登录 / 注册 |
| `#/guides` | SEO 制作指南（20+ 专题） |
| `#/team` | Team 邀请码管理 |
| `#/admin` | 转化漏斗看板（PIN: honor2026） |

```bash
node scripts/generate-sitemap.mjs   # 生成 sitemap.xml
```

## Phase E · 支付 / 小程序 / 运营（v1.5+）

### 微信 & 支付宝

```bash
cp server/.env.example server/.env   # 填入商户凭证
cd server && npm start
```

定价页登录后可选 **微信支付** 或 **支付宝**；演示模式支持模拟支付 + 轮询到账。

Notify 回调：
- `POST /api/v1/payment/notify/wechat`
- `POST /api/v1/payment/notify/alipay`

### 微信小程序

```bash
# 用微信开发者工具打开 miniprogram/
# 修改 miniprogram/utils/config.js 中的 h5Base
```

### 模板运营

| 路由 | 说明 |
|------|------|
| `#/ops` | 模板上下架、新增自定义模板 |
| Header `X-Ops-Key` | 与服务端 `OPS_API_KEY` 一致 |

## 开发

```bash
# E2E 测试（需 Playwright）
node test/e2e-v15.cjs
```

## 版本

见 [CHANGELOG.md](CHANGELOG.md)

### Pro 内测激活

访问 [定价页](http://127.0.0.1:8787/#/pricing) 输入激活码：

- `HONORPRO2026` — 365 天
- `BETA30` — 30 天

正式微信支付/支付宝接入后将替换为在线订阅。
