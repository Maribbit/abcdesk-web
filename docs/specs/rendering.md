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

### 2.3 谱面到源码

乐谱是源码的第二个视图，点击是最直接的那根指针。

- `abcelem.startChar` / `endChar` 是位置真相，不要自己重新扫描文本去猜音符边界。
- 它是按"一个音符量到下一个音符"给的，区间两端会带上分隔用的空白；指向音符本身前必须裁掉。
- 点击同时做两件事：把源码光标放到该音符的字符上、并 seek 到它的播放位置。两者互不依赖，没有音频时指针照样成立。
- 光标只移动、不夺焦：用户刚点的是乐谱，编辑器不应该因此开始接收击键。

### 2.4 源码到谱面

反方向不点、不播，只回答“我在这儿”。

- 光标移动时把对应的谱行滚进视野；不 seek、不高亮、不抢焦点，播放状态不受影响。
- 目标是整行谱表（`.abcjs-staff-wrapper`），不是单个音符：音符是一个点，读者需要的是它所在的那条线。
- 光标停在 `X:` / `T:` / `K:` 等文件头里时回到谱面顶部——那几行描述的是整张谱，不是第一个音。
- 滚动只发生在音符真的出了视野时（`block: "nearest"`），并用 `scroll-padding` 留出呼吸位，避免谱表贴着边缘被切。
- 编辑时的跟随不在每次击键上完成，而是等重渲染落地后再跟一次，不去追一张已经过时的谱。

## 3. 边界条件

- **XSS**：`T:`、`w:` 等字段来自用户手写或 AI 生成，进入 DOM 前必须清洗。
- **超长乐谱**：容器需有 `max-height` 与视口约束，不能无上限撑爆布局。
- **空输入**：清空时销毁实例、移除 SVG，状态回到就绪，而不是渲染空谱。

## 代码与测试映射

- **源码锚点**
  - `src/player/view/score-render.ts`: SVG 呈现、宽度测量与重排触发。
  - `src/player/view/score-reveal.ts`: 源码偏移到谱行的滚动（文件头回顶、谱行整行入视野）。
  - `src/player/renderer.ts`: 渲染生命周期、谱面点击到源码与播放位置的桥接、abcjs 告警反馈。
  - `src/player/playback/source-highlight.ts`: 播放事件到源码区间的换算与区间边界裁剪。
  - `src/player/exports/`: SVG 导出的动作与序列化。
  - `src/shared/abc-quality/`: 告警清洗、诊断对象构造与修复提示格式化。
  - `src/shared/abc-midi-export.ts`: MIDI 数据导出。
- **测试锚点**
  - `src/player/renderer.test.ts`: 告警展示、宽度换行渲染、点谱到源码范围与生命周期集成。
  - `src/player/playback/source-highlight.test.ts`: 音符区间两端空白的裁剪与越界收敛。
  - `src/player/view/score-reveal.test.ts`: 谱行入视、无落点回退与文件头回顶。
  - `src/player/exports/svg-export.test.ts`: 文件名清洗、缺省标题与 SVG 序列化。
  - `src/shared/abc-quality/validate.test.ts`: 空输入、干净 ABC、告警到诊断、HTML 清洗。
  - `src/shared/abc-midi-export.test.ts`: MIDI 文件名、二进制数据与 Blob 包装。
