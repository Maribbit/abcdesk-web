# 播放器视图 (Interface Specs)

播放器是一个可嵌入任意页面的 Shadow DOM 组件，因此样式与状态都必须自给自足。

## 1. 核心概念

- **Shadow DOM 隔离**：宿主页面的全局 CSS（如工具类框架）不可预测，组件必须自带闭环样式。
- **内联样式装配**：分段编写的 CSS 通过 `?inline` 编译成字符串，一次性注入 `ShadowRoot`，避免运行时发请求。

## 2. 设计规范

### 2.1 主题

- 主题来源为手动设置或宿主背景亮度探测，结果落到根节点的主题属性。
- 字体不继承宿主，显式指定系统字体栈。
- 所有颜色通过 CSS 变量（背景、文本、边框、高亮）管理，禁止在 TypeScript 里写颜色替换逻辑。

### 2.2 控制栏

- 单向数据流：UI 是状态的倒影，按钮只负责派发事件，真实状态来自播放引擎。
- 组件群：头部（标题与元数据）、音频栏（时间与进度）、键盘（黑白键映射）、诊断面板（告警浮层）。

## 3. 纪律

- 不向 `window` 或宿主 `document.body` 挂载任何逻辑。
- 卸载时 100% 解绑事件监听与 `ResizeObserver`。
- 控件为图标按钮，需保证最小点按面积（桌面 `min-width` / `min-height` 28px）与可访问名称。
- **手指的尺寸**：`@media (max-width: 600px)` 下所有图标按钮与分段控件占 44×44，桌面仍是 28px。触区变大、画出来的东西不变——被选中的控件仍在 44px 里画成 30–32px 的圆或方角芯片（`::before` 内缩 6–7px），否则一块 44px 的实心色块会横贯 56px 高的标题栏。播放条的进度轨只有 10px 高，触区靠 `::after { inset: -17px 0 }` 撑到 44px，轨道本身不变粗。
- 视图不持有业务状态，也不做颜色计算。
- `renderer.ts` 是播放器唯一稳定门面：新功能先落在 `components/`、`playback/`、`view/` 的子模块，由 `renderer.ts` 协调实例生命周期。

## 代码与测试映射

- **源码锚点**
  - `src/player/view/styles/audio.css`: 播放条、进度轨与手机下的 44px 触区。
  - `src/player/renderer.ts`: Shadow DOM 实例的创建、更新与销毁。
  - `src/player/view/`: 视图装配、主题解析、乐谱视图封装与样式入口。
  - `src/player/view/styles/`: Shadow DOM 内联样式分片。
  - `src/player/components/`: 控制栏、键盘、诊断、全屏、代码折叠等控件。
- **测试锚点**
  - `src/player/view/theme.test.ts`: 手动主题、自动深浅探测、透明背景合成与系统偏好回退。
  - `src/player/renderer.test.ts`: 实例生命周期、诊断反馈、进度交互与高亮回调。
  - `src/player/components/code-toggle.test.ts`: 代码折叠按钮的可访问状态与事件派发。
  - `src/player/components/keyboard-toggle.test.ts`: 键盘按钮的可访问状态与事件派发。
  - `src/player/components/fullscreen-toggle.test.ts`: 全屏能力探测与目标元素请求。
  - `src/player/components/quality-panel.test.ts`: 诊断面板展示、清空隐藏与复制反馈。
  - `src/player/components/tempo-control.test.ts`: 速度组件的状态同步与无效输入。
