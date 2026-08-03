# 阿里云轻量自建站（39.106.179.17）

- **前端**：Caddy 托管 `/opt/era-web`（`npm run deploy:swas` 同步 `dist`）
- **业务 REST**：PostgREST，路径 `/rest/v1/*`
- **Postgres**：仅监听 `127.0.0.1:5432`
- **交付 URL**：`http://39.106.179.17/`（可带 `?tab=data` / `highlight` / `title`）

## 更新网关配置

```bash
scp deploy/swas/Caddyfile root@39.106.179.17:/opt/era-db/Caddyfile
ssh root@39.106.179.17 'docker restart era-gateway'
# 若需挂载 /opt/era-web，按 docker-compose.yml 重建 gateway
```

## 发布前端

```bash
npm run deploy:swas
```
