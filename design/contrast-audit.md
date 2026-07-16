# 模板色彩对比度验收表

> 验收标准：正文 body ≥ 4.5:1 · 强调 accent ≥ 3.0:1 · 辅助 muted ≥ 3.0:1  
> 运行脚本：`node scripts/validate-contrast.mjs`  
> 最后更新：2026-07-15 · v1.3.0

## 色彩角色

| 角色 | 图层 | 说明 |
|------|------|------|
| accent | title, honor | 标题与荣誉名，可一键调整 |
| body | recipient, reason, closing, recipient_label | 正文 |
| muted | issuer, date | 落款与日期，略淡于正文 |

## 喜庆红金系

| 模板 | Preset | Accent | Body | 备注 |
|------|--------|--------|------|------|
| tpl-01 红金荣耀 | 经典金 | #f3d27a | #fff0c8 | 深红底，烫金标题 |
| tpl-01 | **中国红** | #c1272d | #fff0c8 | 新增，朱红标题 |
| tpl-08 红金节日 | 经典金 / 中国红 | 同上 | #ffe7c2 | |
| tpl-13 红金横版 | 经典金 / 中国红 | 同上 | #fff0c8 | |
| tpl-21 牡丹师恩 | 经典金 / 中国红 | 同上 | #fff0e0 | 默认 honor=优秀教师 |

## 企业正式系

| 模板 | Preset | Accent | Body | 布局 |
|------|--------|--------|------|------|
| tpl-03 蓝金典藏 | 金辉 / 云白 | #f3d27a | #eaf2ff | center |
| tpl-05 紫韵华章 | 紫金 | #f3d27a | #f3e9ff | center |
| tpl-10 香槟奢华 | 香槟金 | #e8c98a | #3a2e1c | center，浅底深字 |
| tpl-14 蓝金横版 | 金辉 | #f3d27a | #eaf2ff | landscape-center |
| tpl-19 典雅文凭 | 烫金 | #b8860b | #4a3728 | center，米金 parchment |
| tpl-22 暗夜精英 | 香槟金 / 银白 | #d4af37 / **#e8e0d8** | #e8e0d8 | 银白 preset 已加深 |

## 童趣 / 活动系

| 模板 | 默认 honor | Accent 策略 |
|------|-----------|-------------|
| tpl-02 粉彩 | 进步小明星 | 玫瑰粉 #d6336c |
| tpl-11 卡通 | 闯关小勇士 | 彩虹粉 #ff6b9d |
| tpl-06 志愿 | 最美志愿者 | 橙金 #c2410c |
| tpl-23–28 可爱横版 | 各场景专属 | 主题色，非红色 |

## 已知需人工复核（打印 300dpi）

1. **tpl-07 月光白 preset**：浅紫字 `#d9d4ff` 在深空底上偏淡，建议导出后目视确认
2. **tpl-10 奶白 preset**：白字 `#ffffff` 在香槟浅底上对比度不足，仅适合深色装饰区域
3. **tpl-22 银白 preset**：已调深至 `#e8e0d8`，黑底打印建议仍做灰度测试

## 布局 Archetype

| 类型 | 模板数 | 代表 |
|------|--------|------|
| classic | 竖版纯文字 | tpl-08 |
| photo-left | 竖版照片左 | tpl-01, tpl-04 |
| center | 竖版居中对称 | tpl-03, tpl-05, tpl-10 |
| landscape | 横版标准 | tpl-13, tpl-15 |
| landscape-center | 横版居中 | tpl-14, tpl-16 |
| landscape-cute | 横版童趣 | tpl-23–28 |

## v1.3.0 设计改动摘要

- 荣誉名默认**去掉引号**
- 标题字距：竖版 1200 / 横版 900（原 2600/2400）
- 荣誉名与结语增加垂直间距
- 每套模板默认 copy 与场景匹配（示例姓名：张小明）
- 编辑器新增「强调色」取色器，联动 title + honor
- 画廊缩略图 lazy 渲染示例文字预览
