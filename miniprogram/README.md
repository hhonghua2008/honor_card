# HonorCard 微信小程序 · 个人版上线指南

> H5 地址：`https://hhonghua2008.github.io/honor_card`  
> 小程序目录：本文件夹 `miniprogram/`

## 产品设计说明（为什么首页是 28 套模板）

| 端 | 首页定位 | 原因 |
|----|----------|------|
| **H5 网站 `#/`** | 营销落地页（价值主张 + CTA） | Web 需要 SEO、转化叙事，模板在 `#/templates` |
| **小程序首页** | **模板画廊（28 套）** | 用户打开小程序是为了「马上做奖状」，应直达核心任务 |

旧版只展示 6 个模板是开发占位（`BUILTIN` 草稿），**不是产品定稿**。现已从 `js/data/templates.js` 自动同步全部 28 套。

---

## 重要限制：个人主体没有「业务域名」

这是微信官方规则，不是配置漏了：

| 主体 | 服务器域名 | 业务域名 / web-view |
|------|------------|---------------------|
| **个人** | ✅ 有（拉缩略图） | ❌ **没有入口，也不能内嵌 H5** |
| **企业** | ✅ | ✅ 可内嵌编辑器 |

因此个人版策略是：

- 小程序内：**浏览 28 套模板**（原生页面）
- 点「制作」：**复制 H5 链接** → 用户用手机浏览器打开完整编辑器  
  （`https://hhonghua2008.github.io/honor_card/#/editor?tpl=...`）

若希望小程序内直接编辑，需要以后升级为企业主体，或把编辑器改成原生重写（工作量大）。

## 你需要准备（个人 · 免费）

| 步骤 | 操作 | 费用 |
|------|------|------|
| 1 | 注册个人小程序（你已有：`奖状模版大全` / `wx456268e19464e18a`） | 免费 |
| 2 | AppID 已写入 `project.config.json` | — |
| 3 | **服务器域名** 添加 `https://hhonghua2008.github.io`（你已完成） | 免费 |
| 4 | 微信开发者工具导入、预览、上传、提审 | 免费 |

**不需要**：业务域名、企业认证、Node API。

---

## 第一步：改 AppID

编辑 `project.config.json`：

```json
"appid": "wxXXXXXXXXXXXXXXXX"
```

---

## 第二步：配置微信后台域名

登录 [微信公众平台](https://mp.weixin.qq.com/) → **开发 → 开发管理 → 开发设置**

### 业务域名（web-view 必须）

添加：`hhonghua2008.github.io`

1. 下载校验文件 `MP_verify_xxxx.txt`
2. 放到 HonorCard **仓库根目录**（与 `index.html` 同级）
3. `git push` 后访问 `https://hhonghua2008.github.io/honor_card/MP_verify_xxxx.txt` 确认可打开
4. 回到微信后台点「验证」

### request / downloadFile 合法域名

添加：`https://hhonghua2008.github.io`  
（用于小程序首页加载模板缩略图）

> 本地调试：开发者工具 → 详情 → **不校验合法域名**

---

## 第三步：本地开发

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. **导入项目** → 目录选 `miniprogram/`
3. AppID 选你的正式号（或测试号）
4. 编译 → 应看到 **28 套模板** + 筛选 + 缩略图

### 同步模板数据（改 H5 模板后）

```bash
node scripts/sync-miniprogram-catalog.mjs
```

---

## 第四步：上传与发布

### 方式 A · 开发者工具（推荐个人）

1. 开发者工具 → **上传**
2. 公众平台 → **版本管理** → 提交审核
3. 类目建议：**工具 → 效率** 或 **教育**（以平台可选为准）
4. 审核通过后 **发布**

### 方式 B · 命令行（可选）

1. 公众平台 → 开发 → 开发管理 → **小程序代码上传** → 生成密钥
2. 保存为 `miniprogram/private/upload.key`（已在 .gitignore）
3. 执行：

```bash
export WECHAT_APPID=wx你的AppID
export WECHAT_UPLOAD_KEY=miniprogram/private/upload.key
node scripts/miniprogram-upload.mjs
```

---

## 页面结构

| 页面 | 类型 | 说明 |
|------|------|------|
| `pages/index` | 原生 | **28 套模板画廊**（搜索 + 场景/横竖筛选） |
| `pages/editor` | web-view | H5 编辑器 `#/editor?tpl=...` |
| `pages/projects` | web-view | H5 我的项目 `#/projects` |
| `pages/web` | web-view | 指南 / Pro 说明等 |

---

## 个人版能力边界

| 功能 | 支持 |
|------|------|
| 28 套模板浏览 + 编辑 + 导出 | ✅ |
| 本地保存（H5 IndexedDB） | ✅ |
| 分享小程序 | ✅ |
| 小程序内微信支付 | ❌ 需企业 |
| 云端账号同步 | ❌ 需 API（可不部署） |

---

## 常见问题

**Q：首页缩略图不显示？**  
检查 downloadFile 合法域名是否已配置 `hhonghua2008.github.io`。

**Q：编辑器白屏？**  
检查业务域名校验是否通过；web-view 仅支持 HTTPS。

**Q：H5 首页没有模板，小程序为什么要 28 个？**  
H5 `#/` 是营销页；小程序是工具入口，首页应等于 `#/templates`。
