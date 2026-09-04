# 风水竖版成片 · 就绪检查

本 skill **不再**依赖 Era Bridge / `ensure-era-ready.sh`（那是已废弃图文叠字链路），也不依赖云机。

成片前确认本机侧可用：

1. 既有 **VoxCPM 0.5** 运行环境能读取仓内「老者」参考音 `public/audio/150-20s.wav`，并与 `references/local-runtime.md` 的精确参考文本成对使用；**禁止 MiniMax**、禁止临时下载模型/依赖
2. 没有正在运行的本机重负载阶段，且 `memory_pressure` 未显示 throttled pages；详情见 [local-runtime.md](./local-runtime.md)
3. **ffmpeg** 可用，且编码能带 `bframes=0:keyint=30:min-keyint=30:scenecut=0`；只在配音完成后单独运行
4. 生图能力可用（cinematic 9:16 shanshui + anime）
5. 可读取 `public/fengshui-assets/jinyuan-seal.png`：原片复刻的朱文竖椭圆「锦垣」印，须为 RGBA（仅红色印迹保留、印心和印外透明）
6. 可读取 `public/fengshui-assets/brush-calligraphy-reference.png`：透明白飞白毛笔标题参考；逐篇标题据其重生成，不复用示例文字
7. 交付用实验室 / HTTPS 预览（默认 `https://39.106.179.17.sslip.io/`），勿只丢 OSS 裸链

字体：字幕用 Noto Serif CJK SC Bold（或等价 `Noto Serif SC` Bold）；标题用 AI 毛笔（白飞白行楷），禁止马善政等代码字体。
