# 封面渲染脚本

供 **封面skill** 调用：用 HTML 瑞士/技术编辑风模板 + Playwright 截出 `1080×1920`（9:16）PNG。

```bash
node scripts/generate-cover.mjs --help
node scripts/generate-cover.mjs --input cover.json
```

首次环境若缺浏览器：

```bash
npx playwright install chromium
```
