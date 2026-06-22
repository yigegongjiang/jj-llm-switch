```When Editing
本文档作用: 工程工作流程 (可用工具 / 调试 / 发布); MUST NOT 写工程说明 (→ README.md) / LLM 约束 (→ AGENTS.md)
遵循 AGENTS.md 文档编写规范
- 所有段落均为条件段, 根据工程实际决定保留或删除; 存在即为明确流程, MUST NOT 附加强度标记
- 发布内按顺序编号步骤; 顶部 TL;DR ≤ 5 行; 删除子段后重编号保持连续
- 风险点 / 不可逆操作用 `>` 引用块; 高危操作 MUST 标禁用条件
```

# 可用工具

- `gh`: 已登录
- `bun`: 已安装

# 调试

本机 Keychain 可读, 支持真实 E2E. 验证 = 类型检查 + 编译 + 真实运行:

```sh
bunx tsc --noEmit                 # 类型检查
bun run build                     # 编译 macOS arm64 + x64 双 binary 到 dist/
bun run src/cli.ts                # cc + cx 当前账号 + 备份列表 (读真实 Keychain)
bun run src/cli.ts cc <email>     # 验证切换 (email 模糊匹配)
bun run src/cli.ts cc backup      # 验证备份 (/login 后跑一次)
```

> 切换 / 备份会改写真实 Keychain 与配置; 验证后确认账号状态正确, 必要时切回原账号.

# 发布

代码变更完成后立即执行（= 需求交付的最后环节）。推 `v*` tag → GitHub Actions 自动编译 macOS arm64 binary 并附到 Release.

## TL;DR

依序执行：

1. 验证：`bunx tsc --noEmit` + `bun run build`
2. 写版本：`package.json#version` + `CHANGELOG.md` + `CHANGELOG.dev.md` 同步编辑 (与 tag 一致)
3. 发布：commit + push main + annotated tag (`-a -m`) + push tag → CI 出 binary
4. 修上版 bug：amend + 删远程 tag + 重打 + force push

## 1. 验证

```sh
bunx tsc --noEmit
bun run build
```

## 2. 写版本

- 版本号: 默认递增 PATCH (第三位); 新功能 → MINOR; 不兼容改动 → MAJOR.
- `package.json#version` + `CHANGELOG.md` + `CHANGELOG.dev.md` 同步编辑 (与 tag 一致).

## 3. 发布

tag 名 = `v` + `package.json` 的 version.

```sh
git add package.json CHANGELOG.md CHANGELOG.dev.md <其他改动>
git commit -m "X.Y.Z: <一句话>"
git push origin main
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

> NEVER 用 `workflow_dispatch`; 发布唯一触发 = 推 `v*` tag.

## 4. 修上版 bug

上版存在明显 bug 时, amend 修复后重发, 而非新增 commit.

```sh
git commit --amend --no-edit
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main --force-with-lease
git push origin vX.Y.Z
```
