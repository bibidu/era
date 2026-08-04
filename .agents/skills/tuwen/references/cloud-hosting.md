# 云托管与发图回链（OSS 私有读签名 + 自建站）

本仓库内容 skill（图文 `tuwen` / 风水 `fengshui`）以及**任何**需要把图片发给用户的场景，统一走下列托管。预览交付见 `.cursor/rules/image-preview-delivery.mdc`（禁止对话框直发 OSS 图链）。

## 图片 → 阿里云 OSS（私有读 + 12 小时签名 URL）

- Bucket：`agent-17718139319`（华北2 北京）
- **ACL：私有**（禁止公共读，防盗刷；**封面 `__cover_keep__` 例外为公共读**）
- 交付链接：`ossutil sign` 生成的临时 URL，带 `Expires` / `OSSAccessKeyId` / `Signature`，**默认有效期 12 小时（43200 秒）**
- CLI：`ossutil`（默认 `~/.local/bin/ossutil`），凭证 `~/.ossutilconfig`
- 脚本：
  - 上传并签名：`bash scripts/oss-upload.sh <local> [remote-key]`（**存图前自动清理 >14h 旧对象**）
  - 封面永久：`bash scripts/oss-upload.sh --cover <cover.png>`（或文件名 `cover*.png` 自动加 `__cover_keep__`）
  - 仅清理：`bash scripts/oss-cleanup-expired.sh`（或 `--dry-run`；跳过 `__cover_keep__`）
  - 仅重签：`bash scripts/oss-upload.sh --sign <object-key>`
  - 目录：`bash scripts/oss-upload.sh --dir <dir> [prefix]`
  - HTML 多图：`node scripts/oss-rewrite-html.mjs <index.html>`（只替换图片 URL 为签名/封面永久链接）

### Skill 发图硬性要求

1. 导出/渲染后必须上传 OSS；对用户预览走入库自建站或 HTML 预览页，**禁止**对话框直发 OSS 图链。
2. **封面图**必须带 `__cover_keep__`（脚本对 `cover.png` / `cover-*.png` 自动处理），公共读、查看无过期；写入社媒库封面字段时用此永久 URL。
3. 临时多图确认：`make-oss-preview-html.mjs`，只发 HTML URL。
4. 普通图签名过期后可用 `--sign` 重新生成；不要把非封面对象改成 public-read。
5. 不要绕过 `oss-upload.sh` 直接 `ossutil cp`，否则会漏掉 14 小时过期清理与封面标记。

### 过期清理（省存储费）

签名 12h 过期后对象仍计费。每次 `oss-upload.sh` 存图前会删除 `era/assets/` 下 LastModified **超过 14 小时**的对象；**含 `__cover_keep__` 的封面永不删**。详见 `docs/cloud-hosting.md`。

### Cloud Agent 注意

出口常在美西、Bucket 在北京：约 3MB 图单次需 2–3 分钟。脚本已加长 `read-timeout`；超时后会 `stat` 兜底。批量连传用 `OSS_SKIP_CLEANUP=1`。详见 `.agents/skills/oss-upload/SKILL.md`。

## 前端 → 阿里云轻量自建站

- 固定 URL：`http://39.106.179.17/`
- 发布：`npm run deploy:swas`（push `main` 后服务器 git pull + build → `/opt/era-web`；见 skill **swas-deploy**）
- 配置：`deploy/swas/`
- 图文最终交付只发该预览链接（可带 `?tab=data`），不要逐张发各页图。

更多说明：`docs/cloud-hosting.md`。全局规则：`.cursor/rules/oss-image-delivery.mdc`。
