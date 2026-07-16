# HonorCard 微信小程序

基于 **web-view 嵌入 H5 编辑器** 的轻量小程序壳，模板列表原生展示，编辑/支付走 H5 完整能力。

## 开发步骤

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本项目目录 `miniprogram/`
3. 修改 `utils/config.js`：
   - `h5Base` → 已部署的 HonorCard H5 地址
   - `apiBase` → Phase D API 地址（可选，用于同步 catalog）
4. 微信公众平台 → 开发 → 开发管理 → **业务域名**：添加 `h5Base` 域名
5. 本地调试：开发者工具 → 详情 → 不校验合法域名

## 页面结构

| 页面 | 说明 |
|------|------|
| `pages/index` | 模板列表（内置 + API catalog） |
| `pages/editor` | web-view 打开 `#/editor?tpl=...` |
| `pages/pricing` | web-view 打开 `#/pricing` |

## 发布注意

- web-view 仅支持 **HTTPS** 正式域名
- 小程序支付需单独申请微信支付（与 H5 商户号可复用）
- 后续可做：小程序原生登录 → 换 token 传给 H5（`postMessage`）

## AppID

`project.config.json` 中 `touristappid` 为游客模式，上线前替换为正式 AppID。
