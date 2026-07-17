# 本机安装 Dify

Era 工作流里的 LLM 步骤（扩写正文、生成标题、生成高亮方案）建议在**你自己的电脑**上用 Docker 运行 Dify，不依赖云服务器。

## 前置

- Docker Desktop（或 Docker Engine + Compose）
- 可用的 DeepSeek API Key（写入 Dify 模型供应商，不要写进 Era 仓库）

## 安装（官方 Docker Compose）

```bash
git clone https://github.com/langgenius/dify.git
cd dify/docker
cp .env.example .env
docker compose up -d
```

浏览器打开：`http://localhost/install` 完成初始化。

常用地址：

- 控制台：`http://localhost`
- API：`http://localhost/v1`

## 配置 DeepSeek

1. 进入 Dify **设置 → 模型供应商**
2. 添加 DeepSeek，填入 API Key
3. 在应用/工作流节点中选择该模型

## 与 Era 联通

1. 本机先启动 Era Agent：

```bash
cd /path/to/era
npm install
npm run agent
```

2. 再启动前端并打开浏览器（方案 B 必需）：

```bash
npm run dev
# 浏览器打开终端提示的 localhost 地址，确认右上角出现 Agent 指示
```

3. Dify 工作流里用 **HTTP 请求** 节点调用：

`http://host.docker.internal:3847/...`

> Linux 若 `host.docker.internal` 不可用，可在 compose 里加 `extra_hosts: ["host.docker.internal:host-gateway"]`，或把 Era Agent 绑到局域网 IP。

节点说明见 [dify-workflow.md](./dify-workflow.md)。

## 编排建议（已确认）

- **Agent 主导**（WorkBuddy / OpenClaw）：人机确认走 IM
- Dify 只负责 LLM 子步骤（内容扩写、标题、高亮 JSON）
- 内容、标题：IM 人工确认
- 高亮：默认自动；出图后 IM 抽检
