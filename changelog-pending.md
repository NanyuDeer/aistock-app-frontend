# changelog-pending.md（待提交修改记录）

## 2026-09-03 洞见卡头部标签换「洞见字标」设计 + 首页节奏大师卡精简
- **洞见字标标签**（InsightCard.vue，app 与组件库双端同步）：洞见卡头部由瞳孔 InsightTag 换为「洞见字标 PNG + 灰间隔号 + 彩色类型词」三段式；类型词沿用 5 类型色（event 取中调 #00a8d8 保白卡可读）；类型映射改短词（情绪/资金/事件/市场/趋势），`tag-text` 自定义词自动剥"洞见"后缀（如"板块洞见"→"板块"）；字标双图组件内 `import`（内联背景图 + `filter: drop-shadow` 右下远距投影；预览环境 image 标签不可用故不走 image）：浅色卡 `insight-wordmark.png`（深色）、深蓝研报卡 `insight-wordmark-light.png`（反白），图片随组件同目录（组件库 `src/components/`、app `src/shared/components/`；组件库 shims-vue.d.ts 补 `*.png` 声明）。InsightTag 其余调用点（通知弹窗/事件卡徽标等）保持不动。
- **首页节奏大师卡精简**（MorningContent.vue）：每行去日期、改为「仓位文案 + 档位色块」与其它功能卡"名称+Tag"同构；副标题近 5→3 个交易日（`HOME_RHYTHM_DAYS=3`），最新日期置顶（去掉 reverse）。
- **Dart Sass 弃用修复**（RhythmCard.vue）：`lighten($primary, 28%)` 弃用致 HBuilderX 打包失败 → 换 token `$primary-300`。
