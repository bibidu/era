# 云托管与发图回链（OSS 私有读签名 + EdgeOne）

本仓库所有 skill（图文 `tuwen` / 封面 `fengmian`）以及**任何**需要把图片发给用户的场景，统一走下列托管。

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
  - HTML 内多图：`node scripts/oss-rewrite-html.mjs <index.html>`（只替换图片 URL 为签名/封面永久链接）

### Skill 发图硬性要求

1. 导出/渲染后必须上传 OSS，再把返回的 URL 直接发在对话框（不要发本地路径 / 用 HTML 嵌入代替）。
2. **封面图**必须带 `__cover_keep__`（脚本对 `cover.png` / `cover-*.png` 自动处理），公共读、查看无过期；写入社媒库封面字段时用此永久 URL。
3. HTML 多图交付：只替换 `src` / `url(...)`；确认与发图仍以对话框直发为准。
4. 普通图签名过期后可用 `--sign` 重新生成；不要把非封面对象改成 public-read。
5. 不要绕过 `oss-upload.sh` 直接 `ossutil cp`，否则会漏掉 14 小时过期清理与封面标记。

### 过期清理（省存储费）

签名 12h 过期后对象仍计费。每次 `oss-upload.sh` 存图前会删除 `era/assets/` 下 LastModified **超过 14 小时**的对象；**含 `__cover_keep__` 的封面永不删**。详见 `docs/cloud-hosting.md`。

## 前端 → 腾讯云 EdgeOne Makers

- 项目名：`bibidu-era`
- 推送 `main` → Actions 自动部署；本地：`npm run deploy:edgeone`
- 部署成功后回传 EdgeOne URL；正式预览以 EdgeOne 为准。

更多说明：`docs/cloud-hosting.md`。全局规则：`.cursor/rules/oss-image-delivery.mdc`。
