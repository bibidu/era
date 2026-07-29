# 云发布配置（示例，勿提交真实密钥）

## 全局约定：凡发图必走 OSS

本仓库**任何**交付给用户的图片（图文页、封面、拼图、截图、生成图等）：

1. 必须经 `bash scripts/oss-upload.sh` 上传到 **阿里云 OSS 私有桶**
2. 必须在**对话框直接发送**返回的 **12 小时签名 URL**
3. 禁止本地路径、裸 OSS URL、用 HTML 嵌入代替对话框发图

Cursor 全局规则：`.cursor/rules/oss-image-delivery.mdc`（`alwaysApply`）。

## 阿里云 OSS（图片：私有读 + 12h 签名）

- Bucket: `agent-17718139319`
- Region: `oss-cn-beijing`
- ACL: **private**（禁止公共读）
- 前缀: `era/assets/`（默认）
- 交付: `ossutil sign oss://bucket/key --timeout 43200`  
  URL 带 `Expires` / `OSSAccessKeyId` / `Signature` 临时通行证参数

### 过期对象自动清理（省存储费）

签名 URL 有效期 12 小时；对象在签名过期后仍占存储会继续计费。因此：

- **每次存图前**，`oss-upload.sh` 会自动调用 `scripts/oss-cleanup-expired.sh`
- 默认删除 `era/assets/` 下 **LastModified 超过 14 小时**的对象（比签名多留约 2 小时缓冲）
- 也可手动：`npm run oss:cleanup` 或 `bash scripts/oss-cleanup-expired.sh --dry-run`
- 紧急跳过清理：`OSS_SKIP_CLEANUP=1 bash scripts/oss-upload.sh ...`

凭证写入 `~/.ossutilconfig`（勿提交仓库）：

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
npm run oss:cleanup
npm run oss:rewrite-html -- <index.html>
bash scripts/oss-upload.sh --sign <object-key>
```

## 腾讯云 EdgeOne Makers（前端）

- 项目名: `bibidu-era`
- CLI: `edgeone makers deploy ./dist -n bibidu-era`
- GitHub Actions Secret: `EDGEONE_API_TOKEN`
- 本地: `npm run deploy:edgeone`
