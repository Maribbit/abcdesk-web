# 播放引擎 (Playback Specs)

定义 ABC 如何变成声音，以及音频生命周期与时序对齐的规则。

## 1. 核心概念

- **Soundfont 调度**：本地 `.mp3` 采样按需异步加载，绝不请求远端音源。
- **合成器状态机**：基于 Promise 的受控对象，管理 `ready` / `playing` / `paused` / `disposed`。
- **时序与节拍**：以 abcjs 生成的事件流为准，用户设置的速度覆盖谱面 `Q:`。

## 2. 状态同步

### 2.1 游标

- 不用 `setInterval` 轮询音频时钟，依赖解码引擎的事件回调。
- 每次音符触发下发 `startChar` / `endChar`，据此同时更新乐谱元素与源码编辑器的高亮。
- 暂停不是时序事件，暂停时必须主动清掉残留在乐谱与源码上的高亮，否则高亮会一直停在最后一个音符上。
- 拖拽进度或点击音符跳转时，跳转本身可能落在事件边界上而被跳过，必须在 seek 后直接补发一次高亮。

### 2.2 速度覆盖

用户手动设置的 BPM 优先；取消或重置时回落到 `Q:` 标定的原始速度。

## 3. 约束

- 声音层不查询 DOM，状态完全由数据驱动。
- 同一时刻只允许一份乐谱发声：收到新的播放信号，其他实例立即自行暂停。
- 实例销毁必须停止并释放音频节点，不能留下幽灵音。

## 代码与测试映射

- **源码锚点**
  - `src/player/playback/`: 时序、速度、音色库、合成器、进度与高亮同步。
  - `src/player/components/tempo-control.ts`: 速度 UI 与 abcjs tempo 输入的桥接。
  - `src/player/renderer.ts`: 播放生命周期、进度拖拽、点击跳转与实例释放。
- **测试锚点**
  - `src/player/playback/duration.test.ts`: 总时长读取、事件回退、倍率与展示格式。
  - `src/player/playback/tempo.test.ts`: BPM 读取、倍率换算、按小节推导与无效值展示。
  - `src/player/playback/soundfont.test.ts`: 内置钢琴音源路径与音符重写策略。
  - `src/player/components/tempo-control.test.ts`: 速度组件与 abcjs tempo 输入同步。
  - `src/player/renderer.test.ts`: 实例清理、进度起播、播放事件到源码高亮的集成。
