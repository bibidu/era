## 我的代码是怎么丢的

以前我图快，开三个终端，让三个 Agent 都在同一个项目文件夹里跑。

它们改的是同一份文件。A 刚写完，B 按旧版本又存一遍，A 那段就没了。

Git 也救不了：三个 Agent 共用一个工作区，冲突没机会出现，后写的直接盖掉前面的。

问题不在 Agent 笨，在它们没有各自的地盘。

<!-- era:page-break -->

## 一条命令，各拿一份

Git 自带一个 worktree，意思是「工作区副本」：同一个仓库签出到多个文件夹，每个文件夹各占一条分支。

```
git worktree add -b feat-a ../proj-a
git worktree add -b feat-b ../proj-b
git worktree add -b feat-c ../proj-c
```

三个独立目录，让三个 Agent 分别进 proj-a、proj-b、proj-c 干活。

它们看到的文件互不相同，物理上没法互相覆盖。

用完执行 git worktree remove，分支还留着。

<!-- era:page-break -->

## 分活按目录，不按功能

我第一次按功能分活：A 登录、B 支付、C 埋点。结果三个都要改 router.ts，一样打架。

现在我只按目录分，写死在 Agent 的任务描述里：

- A 只碰 src/pages/
- B 只碰 src/api/
- C 只碰 src/components/

越界就打回重做。

还有个坑：worktree 不会复制依赖目录和环境变量文件，每个新目录得自己装一次。

<!-- era:page-break -->

## 合回去要一条一条来

三条分支千万别一起合，我固定这个顺序：

- 第一步：先合改动最少的那条
- 第二步：立刻把新的 main 拉回另外两个目录
- 第三步：再合下一条

跳过第二步，另外两条就在拿过期的 main 改。

冲突会攒到最后一次全爆出来。

我把踩过的坑做成能直接抄的规则，一天一个。

你现在同时开几个 Agent？评论区回个数字。

每天一个提效实操·第16期

下期：Agent 干到一半跑偏，怎么拽回来
