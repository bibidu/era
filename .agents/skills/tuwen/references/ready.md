# Era 服务就绪检查

供 **图文skill** 调用：确保依赖安装、Agent REST 与前端 Bridge 可用。

```bash
bash scripts/ensure-era-ready.sh
```

成功时打印 `ERA_READY=1` 并以 0 退出。
