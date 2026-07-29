# 云托管与发图回链（OSS 私有读签名 + EdgeOne）

本仓库所有 skill（图文 `tuwen` / 封面 `fengmian`）在**交付图片与前端预览**时，统一走下列托管。

## 图片 → 阿里云 OSS（私有读 + 12 小时签名 URL）

- Bucket：`agent-17718139319`（华北2 北京）
- **ACL：私有**（禁止公共读，防盗刷）
- 交付链接：`ossutil sign` 生成的临时 URL，带 `Expires` / `OSSAccessKeyId` / `Signature`，**默认有效期 12 小时（43200 秒）**
- CLI：`ossutil`（默认 `~/.local/bin/ossutil`），凭证 `~/.ossutilconfig`
- 脚本：
  - 上传并签名：`bash scripts/oss-upload.sh <local> [remote-key]`
  - 仅重签：`bash scripts/oss-upload.sh --sign <object-key>`
  - 目录：`bash scripts/oss-upload.sh --dir <dir> [prefix]`
  - HTML 内多图：`node scripts/oss-rewrite-html.mjs <index.html>`（只替换图片 URL 为签名链接）

### Skill 发图硬性要求

1. 导出/渲染后必须上传 OSS，再把**签名 URL**发给用户（不要发裸对象 URL / 本地路径）。
2. HTML 多图交付：只替换 `src` / `url(...)` 为签名 URL。
3. 签名过期后可用 `--sign` 重新生成；不要把对象改成 public-read。

## 前端 → 腾讯云 EdgeOne Makers

- 项目名：`bibidu-era`
- 推送 `main` → Actions 自动部署；本地：`npm run deploy:edgeone`
- 部署成功后回传 EdgeOne URL；正式预览以 EdgeOne 为准。

更多说明：`docs/cloud-hosting.md`。
