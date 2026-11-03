# 乐谱渲染 (Rendering Specs)

把纯文本 ABC 变成浏览器里的矢量乐谱，并在出错时给出可用的诊断。

## 1. 核心概念

- **解析与排版 (Parser & Engraver)**：由 `abcjs` 完成文本到 SVG 的转换，本项目只做封装，不自己解析 ABC。
- **质量诊断 (Diagnostics)**：收集底层词法/语法告警，转成带源码位置的诊断对象，供编辑器面板与后续修复提示使用。

## 2. 排版契约

### 2.1 响应式重排

预览区宽度由用户拖拽分栏决定，会频繁变化。

- 用 `ResizeObserver` 监听容器宽度。
- 变化超过阈值才重排，且必须复用现有解析结果、只换 `staffwidth`；禁止重新请求资源或从头重新解析。
- 重排抖动必须收敛：连续拖拽期间不重复触发完整渲染。

### 2.2 SVG 颜色覆写

abcjs 产出的 SVG 在内联属性里硬编码填充色。

- 只用 CSS（`currentColor` 及 CSS 变量）覆写，不改 DOM 属性，保证深浅色切换与主题一致性。
- 颜色规范由 `interface.md` 约束。乐谱容器必须是不透明表面，透明纸材质只用于外层 chrome。

## 3. 边界条件

- **XSS**：`T:`、`w:` 等字段来自用户手写或 AI 生成，进入 DOM 前必须清洗。
- **超长乐谱**：容器需有 `max-height` 与视口约束，不能无上限撑爆布局。
- **空输入**：清空时销毁实例、移除 SVG，状态回到就绪，而不是渲染空谱。

## 代码与测试映射

- **源码锚点**
  - `src/player/view/score-render.ts`: SVG 呈现、宽度测量与重排触发。
  - `src/player/renderer.ts`: 渲染生命周期与 abcjs 告警反馈。
  - `src/player/exports/`: SVG 导出的动作与序列化。
  - `src/shared/abc-quality/`: 告警清洗、诊断对象构造与修复提示格式化。
  - `src/shared/abc-midi-export.ts`: MIDI 数据导出。
- **测试锚点**
  - `src/player/renderer.test.ts`: 告警展示、宽度换行渲染与生命周期集成。
  - `src/player/exports/svg-export.test.ts`: 文件名清洗、缺省标题与 SVG 序列化。
  - `src/shared/abc-quality/validate.test.ts`: 空输入、干净 ABC、告警到诊断、HTML 清洗。
  - `src/shared/abc-midi-export.test.ts`: MIDI 文件名、二进制数据与 Blob 包装。
