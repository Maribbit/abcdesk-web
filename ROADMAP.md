# 路线图 (Roadmap)

ABC Desk Web 是一个纯前端的 ABC 写谱工作台：左侧源码，右侧带播放、高亮和诊断的排版结果。

## 当前状态

- **工作台**：分栏/堆叠布局、源码持久化、hash 导入、ABC 打开与保存、质量诊断、深浅色主题。
- **播放器**：本地 soundfont 播放、进度拖拽、节拍覆盖、播放与源码双向联动、88 键视图、SVG/MIDI 导出，作为 Shadow DOM 组件独立于工作台。
- **质量保障**：Vitest 覆盖 player、studio 和 shared 三层的核心契约；领域索引维护在 `docs/specs/`。

## 优先级

1. **P0: 视觉重做**
   将站点配色与材质替换为博客的体系（冷灰底色、朱红强调、半透明纸张 + 发丝边），重写 `src/studio/styles/` 与 `src/player/view/styles/` 两套 token；乐谱面保持不透明以保证可读性。
2. **P0: 编辑器内核**
   用 CodeMirror 6 替换 `textarea` + 高亮镜像，换取 ABC 语法高亮、行号、按键行为和更省心的中文输入。
3. **P1: 分享与离线**
   hash 分享链路做压缩编码并提供“复制分享链接”；补齐 PWA 清单与 Service Worker，缓存应用壳和 soundfont。
4. **P1: i18n**
   界面文案抽成轻量映射，优先 zh-CN / en-US。
5. **P2: 输出与播放控制**
   评估 PDF 导出、音量、节拍器与声部选择；保持免费商用音源与包体积约束。
6. **P2: 诊断增强**
   在 abcjs warning 之上做保守的格式化与高置信修复，不猜测音乐意图；不引入内建 MusicXML 转换器。

## 维护规则

- 新功能先确认所属领域：`docs/specs/` -> 源码目录 -> 测试锚点。
- 提交前保持 `npm run check`、`CHANGELOG.md` 与 README 一致。
- 不为单一平台引入新的构建分叉；工作台是唯一的发布目标。
