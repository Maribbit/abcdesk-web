# 独立工作台 (Workspace Specs)

Workspace 是产品本体：一个无后端、纯客户端的 ABC 草稿本与乐谱游乐场。

## 1. 定位

- 不依赖任何宿主或浏览器特权 API，可以部署为纯静态站点。
- 播放器是它的预览内核，两者保持单向解耦：Workspace 依赖 Player，Player 不知道 Workspace 存在。

## 2. 状态生命周期

无后端时，状态如何存活是首要设计问题。

### 2.1 URL hash 分享

- 源码写入 `#abc=` + 编码后的文本，作为跨设备分享与草稿恢复的链路。
- 初始化时解析 hash 取得源码，随后用 `replaceState` 清掉 hash，避免刷新时覆盖用户后续编辑。
- 当前编码是 `encodeURIComponent`；压缩编码属于后续增强，契约（前缀 + 单向编解码）不变。

### 2.2 本地私有状态

- 换行开关、主题模式、分栏模式、关键词诊断开关与最近一次源码存在 `localStorage`。
- 这些是用户私有偏好，不随 hash 分享。
- 所有存储访问集中在 `settings-store.ts` 适配层，工作台不对存储方式做假设。

## 3. 交互链路

- **左屏：源码编辑器**：工作台只通过 `AbcEditor` 门面（取值、写入、播放高亮、诊断与跳转、换行）使用编辑器，不碰具体 DOM；当前实现是 CodeMirror 6，语法三档灰与诊断波浪线都由装饰层绘制。
- **左屏：源码动作**：导入 `.abc` / `.txt`、导出当前源码、复制、加载示例、清空，以及字符统计。
- **右屏：预览代理**：输入后按 350ms 防抖重新渲染，并刷新诊断面板与状态文案。
- **分栏**：可拖拽、可键盘调整，尺寸与方向持久化；窄屏自动降级为上下堆叠。

## 4. 约束

- 空源码不进入渲染流程，直接回到就绪态。
- 渲染失败必须显式反馈，不能只留空白预览。
- 移动端不保留横向双栏，避免拖拽与滚动冲突。

## 代码与测试映射

- **源码锚点**
  - `src/workspace/`: 工作台入口、分栏、源码动作、展示状态、诊断面板与渲染控制。
  - `src/workspace/editor/`: 编辑器门面 `AbcEditor`、CodeMirror 6 实现（装饰层、换行与跳转）与纯净的语法扫描器。
  - `src/shared/workspace-url.ts`: hash 编解码。
  - `src/shared/abc-file.ts` 与 `src/shared/filename.ts`: 文件导入导出与安全文件名。
- **测试锚点**
  - `src/workspace/settings-store.test.ts`: 设置加载、回退与保存。
  - `src/workspace/rendering.test.ts`: 空输入清理、源码修剪渲染与高亮偏移。
  - `src/workspace/quality-report.test.ts`: 诊断面板呈现、清空隐藏与状态文案映射。
  - `src/workspace/presentation.test.ts`: 主题解析与布局类名。
  - `src/workspace/editor/codemirror-editor.test.ts`: 编辑器挂载、编辑回调、播放高亮、语法着色、诊断下划线与跳转、换行偏好。
  - `src/workspace/editor/abc-syntax.test.ts`: 字段、注释与谱线标记的扫描边界。
  - `src/workspace/source-actions.test.ts`: 字符统计、空源码禁用与导入错误规范化。
  - `src/workspace/source-highlight.test.ts`: 高亮范围合并与播放偏移。
  - `src/workspace/split-layout.test.ts`: 尺寸恢复、方向切换与键盘调整边界。
  - `src/shared/workspace-url.test.ts`: hash 往返与非 Workspace hash 拒绝。
  - `src/shared/abc-file.test.ts` 与 `src/shared/filename.test.ts`: 源码导入、扩展名拒绝与文件名清洗。
