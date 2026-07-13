# 多 Agent 并行工作（Git Worktree）视觉资源

本资源包参考米白网格纸、黑黄红高对比、粗描边和像素化信息图风格制作。

## 封面

- `covers/cover-worktree-main.png`：主封面，强调 3X 并行效率
- `covers/cover-worktree-agents.png`：一个仓库、三个 Agent
- `covers/cover-worktree-speed.png`：单线程与并行效率对比

## PPT 页面

- `slides/slide-worktree-overview.png`：多 Agent + worktree 全景架构
- `slides/slide-worktree-flow.png`：从任务拆分到 PR 合并的五步流程
- `slides/slide-worktree-rules.png`：并行协作三条规则
- `multi-agent-worktree.pptx`：可直接演示的 PPT 文件，前三页为信息图，第四页汇总三套封面

## 重新生成 PPT

```bash
python3 -m pip install python-pptx
python3 scripts/generate-worktree-ppt.py
```

图片均为 PNG，可直接用于视频封面、文章头图、演示文稿或二次排版。
