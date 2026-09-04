---
name: fengshui
description: >-
  【风水竖版成片】用户给抖音/视频链接时使用：抽中文口播、改词不超过 5%、本机 VoxCPM 0.5 老者配音、山水静图、片头2秒毛笔标题+锦垣印、宋体100字幕、拼 9:16 成片。
  当用户说「风水skill」「风水竖版成片」、风水、阳宅、口播成片，或丢来抖音/视频链接要做视频时必须使用本 skill。
  禁止再走已废弃的阳宅图文 / Era 叠字 / gc-minimal / 4–6 页分篇出图。
---

# 风水竖版成片（一个链接 → 9:16 口播视频）

**本 skill 只做出片，不做 Era 多页图文。** 阳宅图文、gc-minimal-zine-poster 底图、分篇叠字、`image_previews` 多页入库流程**全部废弃**；若对话里还出现旧说法，纠正并改走本流程。

用户给**一个抖音链接（或等价视频链接）**即可全自动：抽口播 → 改词 → 配音 → 山水静图 → 片头毛笔标题+锦垣印 → 宋体字幕 → 拼 1080×1920 成片 → 交付 HTTPS 预览链接。

## 确认节奏

- 用户说「不用确认 / 直接出 / 全自动」→ **跳过试听**，一路做到交付。
- 否则可先合成/试听**一口**配音，用户点头后再跑全片。
- 被 **风大师**（`fengdashi`）调用时：全自动，零确认；但本机重负载预检失败时必须等待并报告，不能为“全自动”而强行启动。

## 禁止

- MiniMax（任何轨、任何克隆接口）
- 马善政等**代码字体**冒充毛笔标题
- gc-minimal-zine-poster / poetic-ink / Era `pageOverlay: fengshui` 叠字出图
- 横图上下拼接、补天补地凑竖版
- 对话框塞视频附件；**只发**实验室 / HTTPS 预览链接（链接单独一行）
- **只**丢 OSS 裸链当唯一交付
- 在本机重负载预检失败时启动 VoxCPM、下载模型/依赖、暂停或杀掉用户的其他任务

---

## 主流程（全自动）

### 1. 抽口播 + 改词

1. 从链接抽出**中文口播文案**（听写/字幕/旁白均可，以可念的中文为准）。
2. **改词少于 5%**：只允许换词或微调句序，**含义不变**；不要大段重写、不要加戏。
3. 读音（口播注入；上游亦可参见 `bibidu/bbd5213` 的 `docs/voice-reading.md`，仓内副本见 [references/voice-reading.md](./references/voice-reading.md)）：
   - **Qwen** → 读「千问」
   - **Codex** → 读 `/ˈkoʊ.dɛks/`
4. 输出定稿口播稿（纯中文可读文本），供配音与字幕共用。

### 2. 配音（本机 VoxCPM · 老者）

- 使用用户 Mac 上**既有的** **VoxCPM 0.5** 运行环境；不下载模型或依赖，不改系统设置。
- **克隆「老者」**：使用仓内固定参考音 `public/audio/150-20s.wav`，并将 [本机运行](./references/local-runtime.md) 中的精确参考文本作为 `--ref-text`。该 20 秒音频就是正式老者克隆参考音；音频与文本必须成对使用。原 fengshui-B / MiniMax B 轨只是一份已转换来源，**不要**回落到 MiniMax。
- **禁止 MiniMax**。
- 先按 [本机运行](./references/local-runtime.md) 做预检；通过后先合成一口试听（用户明确要求全自动时可跳过试听）。
- 同一时刻只允许一个本机重负载阶段：合成、ASR、OCR、嵌入、FFmpeg/Remotion 或 Blender 不得并行。预检不通过时不要暂停其他任务，只报告等待条件。
- 合成前检查参考音可解码且与精确参考文本成对使用；不以别的声线静默替代。

### 3. 静图（山水 · 9:16）

- 风格：**cinematic 9:16 shanshui + anime**。
- 人物：1–2 个行者/旅人，**小但能看清**；风景为主体。
- **上三分之一留空**给片头标题（构图勿把主景顶满）。
- 若生图是横图：对**整幅**做竖裁到 **1080×1920**；**禁止**上下拼接，**禁止**补天补地。
- 成片全程该图**静止**（Ken Burns / 推拉摇移一律不要）。

### 4. 片头：毛笔标题 + 锦垣印（停留 2 秒后消失）

时间轴：

| 时段 | 画面 |
| --- | --- |
| 0–2s | 静图 + 毛笔标题 + 锦垣印 |
| 2s 之后 | **只留**静图 + 字幕（标题与印消失） |

标题：

- **AI 毛笔**（白飞白行楷），**右起左行两列竖排**
- 先读取固定字形参考 [`public/fengshui-assets/brush-calligraphy-reference.png`](../../../public/fengshui-assets/brush-calligraphy-reference.png)：它取自 `150.MP4` 的透明白色毛笔标题，用于约束飞白、笔锋、字重和双列节奏
- 每篇标题仍须依该参考**重新生成对应文字**；禁止裁用示例中的字、复用示例文案，或用代码/UI 字体替代
- 禁止马善政、系统黑体、数黑体等代码/UI 字体冒充毛笔

印：

- 固定资产 [`public/fengshui-assets/jinyuan-seal.png`](../../../public/fengshui-assets/jinyuan-seal.png)：原片复刻的朱文竖椭圆「锦垣」印
- 该 PNG 是 **RGBA**：仅红色印迹保留，印心和印外均透明；合成时必须保留 alpha，禁止铺红色实底、扁平化或重绘成其他印章
- 旋转 **2–6°**，宽约 **112px**
- 落在**最左列文字正下方**，不压字
- 标题+印相对上部空白再**下移 30px**（整组略沉，勿贴顶）

### 5. 字幕

- 字体：**宋体加粗 100px**（Noto Serif CJK SC Bold / `Noto Serif SC` Bold）
- 距底约画幅 **五分之一**
- **只有中文**；不加书名号《》
- 跟配音时间轴走（逐句/逐段对齐口播）

### 6. 本机成片编码

- 画幅 **1080×1920**（9:16）
- 静图始终静止；字幕跟配音
- x264（或等价）参数须含：`bframes=0:keyint=30:min-keyint=30:scenecut=0`
- 在配音任务结束且本机预检仍通过后，才以单任务运行 FFmpeg 导出 mp4

示例（按实际滤镜/字幕轨改；硬性是分辨率与 x264 参数）：

```bash
ffmpeg -y \
  -loop 1 -i still-1080x1920.jpg \
  -i voice.wav \
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,…" \
  -c:v libx264 -pix_fmt yuv420p \
  -x264-params "bframes=0:keyint=30:min-keyint=30:scenecut=0" \
  -c:a aac -shortest \
  out-1080x1920.mp4
```

### 7. 交付

1. 成片上传（走仓内 OSS 惯例时可 `bash scripts/oss-upload.sh`，预览勿只丢裸链）。
2. 对话框**只发**实验室 / **HTTPS** 预览链接，链接**单独给人**，例如：  
   `https://39.106.179.17.sslip.io/`（可带业务侧深链参数；**勿发 HTTP 裸 IP**）。
3. **不要**往聊天塞视频附件；**不要**把 OSS 裸链当作唯一交付。

---

## 输出前检查清单

1. 口播来自链接；改词 < 5%；Qwen/Codex 读音已注入
2. 配音＝本机既有 VoxCPM 0.5 + 老者参考音/精确参考文本；无 MiniMax；无并行重负载
3. 静图 9:16 cinematic shanshui+anime；1–2 小行者；上 1/3 留白；横图只竖裁不拼接
4. 片头 2s：已读取 `brush-calligraphy-reference.png` 生成的白飞白行楷两列竖排 + `jinyuan-seal.png` 原样 alpha 合成（2–6°、~112px、最左列下、整组下移 30px）；之后无标题无印
5. 字幕：宋体 Bold 100px、距底约 1/5、纯中文、无书名号
6. 成片 1080×1920；静图静止；`bframes=0:keyint=30:min-keyint=30:scenecut=0`
7. 对话只有 HTTPS/实验室预览链接；无附件、无「仅 OSS 裸链」

## 与旧物的关系

| 旧物 | 状态 |
| --- | --- |
| Era 阳宅图文 / `pageOverlay: fengshui` / gc-minimal 底图 | **废弃**，本 skill 不调用 |
| 图文 skill（`tuwen`） | **废弃**，见该 skill 的 DEPRECATED 说明 |
| `graphic-text` 运行时代码 | 可留在仓内；**skill/rules 不再入口** |
| 风大师（`fengdashi`） | 复盘/档期等保留；成片调用**本** skill |
