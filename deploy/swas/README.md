# 阿里云轻量自建站（39.106.179.17）

- **前端**：Caddy 托管 `/opt/era-web`（`npm run deploy:swas`：服务器 `git pull` + 构建）
- **独立站 `/apt/*`**：宿主机 `/opt/apt-web` → 容器 `/srv/apt`（与 Era 发版目录分离；`rsync --delete` 不会清掉）
- **独立站 `/kuifou/*`**：宿主机 `/opt/kuifou-web` → 容器 `/srv/kuifou`（应用在 [bibidu/kuifou](https://github.com/bibidu/kuifou)；Era 发版须保留 Caddy `kuifou_routes` 与 compose 挂载）
- **源码目录**：`/opt/era`
- **业务 REST**：PostgREST，路径 `/rest/v1/*`
- **Postgres**：仅监听 `127.0.0.1:5432`
- **交付 URL（默认 HTTPS）**：`https://39.106.179.17.sslip.io/`（可带 `?tab=data` / `highlight` / `title` / `stitch`）；裸 IP HTTP 勿作社媒默认链

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
# Caddyfile 也可由 npm run deploy:swas 自动同步到 /opt/era-db/
scp -i deploy/swas/id_rsa deploy/swas/Caddyfile root@39.106.179.17:/opt/era-db/Caddyfile
ssh -i deploy/swas/id_rsa root@39.106.179.17 'docker restart era-gateway'
```
