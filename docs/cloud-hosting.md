# 云发布配置（示例，勿提交真实密钥）

## 阿里云 OSS（图片：私有读 + 12h 签名）

- Bucket: `agent-17718139319`
- Region: `oss-cn-beijing`
- ACL: **private**（禁止公共读）
- 交付: `ossutil sign oss://bucket/key --timeout 43200`  
  URL 带 `Expires` / `OSSAccessKeyId` / `Signature` 临时通行证参数

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
npm run oss:rewrite-html -- <index.html>
bash scripts/oss-upload.sh --sign <object-key>
```

## 腾讯云 EdgeOne Makers（前端）

- 项目名: `bibidu-era`
- CLI: `edgeone makers deploy ./dist -n bibidu-era`
- GitHub Actions Secret: `EDGEONE_API_TOKEN`
- 本地: `npm run deploy:edgeone`
