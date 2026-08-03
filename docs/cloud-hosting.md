# 云发布配置（示例，勿提交真实密钥）

## 全局约定：凡发图必走 OSS

本仓库**任何**交付给用户的图片（图文页、封面、拼图、截图、生成图等）：

1. 必须经 `bash scripts/oss-upload.sh` 上传到 **阿里云 OSS 私有桶**
2. 必须在**对话框直接发送**返回的 URL（普通图为 **12 小时签名 URL**；封面为带 `__cover_keep__` 的**永久公共 URL**）
3. 禁止本地路径、用 HTML 嵌入代替对话框发图

Cursor 全局规则：`.cursor/rules/oss-image-delivery.mdc`（`alwaysApply`）。

## 阿里云 OSS（图片：私有读 + 12h 签名）

- Bucket: `agent-17718139319`
- Region: `oss-cn-beijing`
- ACL: **private**（禁止公共读；**封面永久对象例外**见下）
- 前缀: `era/assets/`（默认）
- 交付: `ossutil sign oss://bucket/key --timeout 43200`  
  URL 带 `Expires` / `OSSAccessKeyId` / `Signature` 临时通行证参数

### 封面图永久保留（`__cover_keep__`）

风水 / 图文 / 社媒等**所有封面图**上传时，对象 key 文件名须带标记 **`__cover_keep__`**（脚本会对 `cover.png` / `cover-*.png` 等自动插入，也可用 `bash scripts/oss-upload.sh --cover <file>` 强制）：

- 清理脚本**永不删除**含该标记的对象
- ACL 设为 **public-read**，stdout 返回**无过期**的公共 URL（写入 Supabase `cover_url` / `image_previews` 首图时必须用此 URL）
- 例：`era/assets/20260730-120000/cover__cover_keep__.png`

普通内容页 / 拼图仍走私有 + 12h 签名，并参与 14h 清理。

### 过期对象自动清理（省存储费）

签名 URL 有效期 12 小时；对象在签名过期后仍占存储会继续计费。因此：

- **每次存图前**，`oss-upload.sh` 会自动调用 `scripts/oss-cleanup-expired.sh`
- 默认删除 `era/assets/` 下 **LastModified 超过 14 小时**的对象（比签名多留约 2 小时缓冲）
- **跳过** key 含 `__cover_keep__` 的封面
- 也可手动：`npm run oss:cleanup` 或 `bash scripts/oss-cleanup-expired.sh --dry-run`
- 紧急跳过清理：`OSS_SKIP_CLEANUP=1 bash scripts/oss-upload.sh ...`

### Cloud Agent 跨境上传（美西 → 北京）

Cloud Agent 出口常在 **AWS us-west-2**，Bucket 在 **cn-beijing**。实测约 3MB PNG 单次成功需 **~2–3 分钟**（有效吞吐约 20–40KiB/s）。

- `oss-upload.sh` 默认 `--read-timeout 180`、`--retry-times 3`（覆盖 ossutil 默认 20s×10 次空重试）
- `cp` 报 `i/o timeout` 时会 **`stat` 校验远端大小**；完整则视为成功（服务端已写入、客户端等响应超时）
- 进度条 `100%` 且 `done:(0 objects)` **不等于**上传成功
- 传输加速未开通前不要改用 `oss-accelerate` 域名
- 详解：`.agents/skills/oss-upload/SKILL.md`

凭证优先用 Cursor Cloud Secrets（推荐，Cloud Agent 自动注入）：

- `OSS_ACCESS_KEY_ID`
- `OSS_ACCESS_KEY_SECRET`

配置入口：https://cursor.com/dashboard/cloud-agents → Secrets。  
`scripts/oss-upload.sh` 若发现没有 `~/.ossutilconfig`，会用上述环境变量自动写入该文件。

本机也可手写 `~/.ossutilconfig`（勿提交仓库）：

```
[Credentials]
language=CH
endpoint=oss-cn-beijing.aliyuncs.com
accessKeyID=<RAM AccessKey ID>
accessKeySecret=<RAM AccessKey Secret>
```

推荐 RAM 用户: `era-oss` + 策略 `AliyunOSSFullAccess`（或更细粒度仅本 bucket）。

脚本:

```bash
npm run oss:upload -- <file> [key]
bash scripts/oss-upload.sh --cover <cover.png>   # 强制按封面永久上传
npm run oss:cleanup
npm run oss:rewrite-html -- <index.html>
bash scripts/oss-upload.sh --sign <object-key>
```

## 阿里云轻量自建站（前端 + 业务 REST）

- 公网 IP: `39.106.179.17`（北京轻量）
- 交付: **`http://39.106.179.17/`**（可带 `?tab=data` / `highlight` / `title` / `stitch`）
- 栈: Caddy（静态 `/opt/era-web` + `/rest/v1`）+ PostgREST + Postgres（仅本机 5432）
- 配置: `deploy/swas/server.env` + `id_rsa`；AccessKey 见 `server.secrets.env`（gitignore）
- 源码目录: `/opt/era`
- 发布前端: `npm run deploy:swas`（**先 push `main`**，再 SSH 到服务器 `git pull` + build）。Skill：`.agents/skills/swas-deploy/SKILL.md`

同机部署时浏览器用 `location.origin` 调 REST，无需跨域。追加 `tab` / `shareId` / `text` 时用 `highlightSetupPagesUrl` / `titleComposerPagesUrl` / `buildAppPagesUrl`；**禁止**对整段 query 再 `encodeURIComponent`。

Edge Functions（余额 / 视频抽取 / image-proxy）仍在旧 Supabase。
