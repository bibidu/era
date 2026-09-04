# 风水竖版成片 · 就绪检查

本 skill **不再**依赖 Era Bridge / `ensure-era-ready.sh`（那是已废弃图文叠字链路）。

成片前确认本机侧可用：

1. 已按 **CosyVoice > VoxCPM2 > VoxCPM 0.5** 探测并选定机器可运行的最高优先级引擎；若均未安装，已按该顺序在资源安全窗口安装第一个可完成 10 秒样本的引擎；**禁止 MiniMax**
2. 引擎名称、版本、模型、设备与参考音 SHA-256 已记录；能读取 `public/audio/150-20s.wav`，且参考文本已由 ASR 逐字核对
3. 没有正在运行的本机重负载阶段；内存、swap 与 OOM 状态安全，详情见 [local-runtime.md](./local-runtime.md)
4. 10 秒真实克隆已通过逐字、停顿、噪声、响度、基频、语速门禁；最终首帧已生成；用户已明确确认两者
5. **ffmpeg** 可用，且编码能带 `bframes=0:keyint=30:min-keyint=30:scenecut=0`；只在配音完成后单独运行
6. 生图能力可用（cinematic 9:16 shanshui + anime）
7. 可读取 `public/fengshui-assets/jinyuan-seal.png`：原片复刻的朱文竖椭圆「锦垣」印，须为 RGBA（仅红色印迹保留、印心和印外透明）
8. 可读取 `public/fengshui-assets/brush-calligraphy-reference.png`：透明白飞白毛笔标题参考；优先补充同系列 3–5 张不同汉字参考；逐篇标题据参考重生成，不复用示例文字
9. 交付必须是 `?tab=fengshui&v=<本次 mp4>` 专属深链，并已在无登录会话中核对对象、起播和时长；裸根路径 / 通用 `?tab=data` / SPA 回落的 `/previews/` 目录链都不算成片预览

字体：字幕用 Noto Serif CJK SC Bold（或等价 `Noto Serif SC` Bold）；标题用 AI 毛笔（白飞白行楷），禁止马善政等代码字体。
