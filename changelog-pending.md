## 未提交修改

### 首页卡片整卡跳转修复（MorningContent.vue）
- 根因：`<Card>` 的 `@tap → emit('click') → 父级 @click` 组件事件链在 H5 端无法触发跳转，而原生 `@tap`（透传到 Card 根 `<view>`）可靠可用（风口龙头/事件传导 行内 `@tap.stop` 已证明）。市场洞见/今日分析概览 仅依赖组件事件链，故整卡点击（含标题）无声响应。
- 修复：将 MorningContent.vue 中 5 张需求"整卡跳转"的卡片（风口龙头/事件传导/市场洞见/今日分析概览/重磅事件跟踪）的 `@click="goX"` 改为原生 `@tap="goX"`（fallthrough 到 Card 根视图），保留 `clickable` 以显示 cursor:pointer 与点击缩放动画；行内 `@tap.stop` 预览跳转逻辑不变、不冲突（stop 阻止冒泡到卡片根，无重复跳转）。

### 滚动时报错（Unable to preventDefault inside passive event listener）修复
- 根因：PageCard.vue / SubPageCard.vue / SubPageCard2.vue 的 `scroll-view` 使用 `:enhanced="true"`，H5 端 enhanced 滚动用自定义滚动器注册 passive 的 `touchmove` 监听并调用 `preventDefault()`，触发浏览器 Warning（一秒钟几十条）。此外 FloatingPodcast 悬浮球、自选股编辑态拖拽手柄用 `@touchmove.stop.prevent` 也在被动场景调用 preventDefault。
- 修复：
  - 移除上述 3 个 scroll-view 的 `:enhanced="true"` 与 `:bounces="false"`，回归 scroll-y 原生滚动（与首页 MainTabs 一致）。
  - FloatingPodcast fp-ball（已含 `touch-action:none`）、favorites drag-handle 将 `@touchmove.stop.prevent` 改用 `@touchmove.stop`，并给 `.drag-handle` 补 `touch-action:none`，由样式层禁用拖拽时的默认滚动，替代 JS preventDefault，杜绝 passive 告警；鼠标 mousedown 保留 `.prevent`（鼠标事件不会被标记 passive，无告警）。

### App 启动 Push token 注册 404 误报静默（usePushNotification.ts）
- 背景：`registerPushToken` 请求 `POST /agent/push/token`，后端接口尚未实现（agent.ts 已有 TODO），App 端每次都打 `[Push] register failed 服务异常(404)` 误导性红字。
- 修复：`.catch` 中当 `statusCode === 404`（未实现属预期）静默跳过，仅其它异常才打印；不影响后续后端落地后的正式注册。

### 微信扫码登录按钮图标不显示修复（login.vue）
- 根因：H5/APP-PLUS 的微信登录按钮用 `<image src="/static/icons/wechat.svg">`，该路径不存在（图标实际在 `/static/assets/icons/wechat.svg`），导致图标空白。
- 修复：改用统一 `SvgIcon name="wechat"`（映射到存在路径），三个平台按钮（MP-WEIXIN/H5/APP-PLUS）移除旧 `<image>` 引用；该 svg 已用白色色板，H5 mask / App dataUri 均正常显色。

### 首页日期标签配色调整（MorningContent.vue）
- 需求：日期标签不再用绿色；`itemTagType` 映射调整：
  - `date` → `neutral`（静尘蓝，呼应品牌主色）——影响大盘溯源/事件传导卡片的时间标签。
  - `buy`（今日分析概览「已更新」）→ `warning`（暖杏橙，置为醒目态）。
  - `wash`（「待更新」）→ `gray`（中性灰，弱化待生成态），避免与「已更新」橙色混淆。
- 事件传导卡片事件标签由日期(MM-DD)改为时间(HH:MM)：`publishTime.length>=16` 取 `slice(11,16)`，无时间部分回退日期，再回退「新」。