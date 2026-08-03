---
name: swas-deploy
description: >-
  【自建站部署skill】把 Era 前端发布到阿里云轻量 39.106.179.17：先 push main，再 SSH
  到服务器 git pull + npm ci + build，同步到 /opt/era-web 并 reload Caddy。
  当用户说部署/上线/deploy/swas/同步到自建站，或 PR 合入 main 后需要回传线上 URL 时必须使用本 skill。
---

# 自建站部署 Skill（SWAS）

交付站：`http://39.106.179.17/`（可带 `?tab=data` / `highlight` / `title` / `stitch`）。

## 何时执行

- 用户要求部署 / 上线 / `deploy:swas`
- 功能改动已合入 `main`（见 `.cursor/rules/auto-merge-pr.mdc`）后**必须**部署并回传 URL

## 标准流程（更快，默认）

**不要**再本机 `npm run build` 后跨境 rsync 大包（Cloud Agent 美西 → 北京很慢）。

1. 确保改动已在 `origin/main`（commit → push → merge）
2. 若本地有 `deploy/swas/server.secrets.env`（gitignore）则自动加载；否则依赖环境变量里的 `ALIYUN_*`
3. 执行：

```bash
npm run deploy:swas
```

脚本会：

1. `git fetch` 确认 `origin/main`
2. SSH 登录服务器（密钥 `deploy/swas/id_rsa`）
3. 在 `/opt/era`：`git fetch` + `reset --hard origin/main`
4. `npm ci` → `ERA_BASE=/ npm run build`
5. 同步 `dist/` → `/opt/era-web`
6. reload / restart `era-gateway`
7. curl 验收首页

4. 对话框直接发：`http://39.106.179.17/`（按需带 `?tab=`）

## 配置文件

| 文件 | 是否进 Git | 内容 |
| --- | --- | --- |
| `deploy/swas/server.env` | 是 | Host / InstanceId / 路径 / Git / OSS 非密钥 |
| `deploy/swas/server.secrets.env` | **否**（gitignore） | `ALIYUN_ACCESS_KEY_ID/SECRET`（从 example 复制） |
| `deploy/swas/server.secrets.env.example` | 是 | 密钥模板 |
| `deploy/swas/id_rsa` (+ `.pub`) | 是 | root SSH 密钥 |

> GitHub Push Protection 会拦截阿里云 AccessKey 明文；故 AK 放 `server.secrets.env`，不进远端。SSH 私钥可进仓供 Agent 部署。

首次 / 新机器：

```bash
cp deploy/swas/server.secrets.env.example deploy/swas/server.secrets.env
# 填入 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET
```

## 无 SSH 时的兜底

若私钥失效：用 `server.secrets.env` 里的 AK + `swas-open` 云助手，把 `id_rsa.pub` 写回 `/root/.ssh/authorized_keys`，再跑 `npm run deploy:swas`。

## 验收

- `curl -I http://39.106.179.17/` → 200
- 新功能深链可开（如 `?tab=stitch`）
- **禁止**只发 GitHub Actions 链接代替站点 URL

## 安全

- AccessKey 若曾在聊天中明文发送，提醒在阿里云控制台**轮换**
- 不要把 `server.secrets.env` 推到 GitHub 或发到公开渠道
