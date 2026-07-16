# Phase A 发布回归清单

## 自动测试

```bash
./start.sh &
node test/e2e-v15.cjs
node test/e2e-share.cjs
node test/smoke-prod.cjs   # 可选，对生产 URL
```

## 手动验收

| # | 场景 | 通过 |
|---|------|------|
| 1 | 生产/本地 URL 首屏可加载 | ☐ |
| 2 | 画廊分类 + 搜索可用 | ☐ |
| 3 | 选模板 → 改字 → 保存 → 刷新后仍在 | ☐ |
| 4 | 含照片项目 save 不报错（IndexedDB） | ☐ |
| 5 | 分享纯文字 → 只读页 → 另存为 → 可编辑 | ☐ |
| 6 | 分享含照片 → 提示不含照片 → 只读占位 | ☐ |
| 7 | 横版 PDF 比例正确 | ☐ |
| 8 | 高清 PNG 宽度 ≥ 2480（竖版） | ☐ |
| 9 | 隐私/条款页可访问 | ☐ |
| 10 | Safari + Chrome 各测一遍 | ☐ |

## 发布前

- [ ] `main` 分支 push 触发 GitHub Pages
- [ ] 模板 thumbs + web PNG 已生成
- [ ] CHANGELOG v1.0.0 已更新
