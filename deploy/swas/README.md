# 阿里云轻量自建站（39.106.179.17）

- **前端**：Caddy 托管 `/opt/era-web`（`npm run deploy:swas`：服务器 `git pull` + 构建）
- **源码目录**：`/opt/era`
- **业务 REST**：PostgREST，路径 `/rest/v1/*`
- **Postgres**：仅监听 `127.0.0.1:5432`
- **交付 URL**：`http://39.106.179.17/`（可带 `?tab=data` / `highlight` / `title` / `stitch`）

## 配置

| 文件 | 说明 |
| --- | --- |
| `server.env` | Host、InstanceId、路径、Git（可提交） |
| `server.secrets.env` | AccessKey（**gitignore**；从 example 复制） |
| `server.secrets.env.example` | 密钥模板 |
| `id_rsa` / `id_rsa.pub` | root SSH 密钥 |
| `Caddyfile` / `docker-compose.yml` | 网关与容器栈 |

Agent 约定见 `.agents/skills/swas-deploy/SKILL.md`。

```bash
cp deploy/swas/server.secrets.env.example deploy/swas/server.secrets.env
# 编辑填入 ALIYUN_ACCESS_KEY_*
```

## 发布前端

```bash
# 1) 改动已在 origin/main
# 2) 部署（SSH → 服务器 git pull + build）
npm run deploy:swas
```

## 更新网关配置

```bash
scp -i deploy/swas/id_rsa deploy/swas/Caddyfile root@39.106.179.17:/opt/era-db/Caddyfile
ssh -i deploy/swas/id_rsa root@39.106.179.17 'docker restart era-gateway'
```
