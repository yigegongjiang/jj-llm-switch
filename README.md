```When Editing
本文档作用: 工程总览 (价值主张 / 使用 / 架构 / 结构); MUST NOT 写发布流程 (→ workflow.md) / LLM 约束 (→ AGENTS.md)
遵循 AGENTS.md 文档编写规范
- 章节按需增删, 只留项目真有的; 首行一行价值主张, MUST NOT 带 LLM 提示
- 短并列项用表格; 可执行步骤 fenced + `#` 注释同行
- NEVER 写「开发」段 (VibeCoding 不向人类解释 dev 命令)
```

# jjllmuse

本机 **Claude Code** 与 **Codex** CLI 多账号一键切换 (macOS arm64 / x64).

## 使用

```sh
# 安装 / 卸载
curl -fsSL https://raw.githubusercontent.com/yigegongjiang/jj-llm-switch/main/install.sh | bash
curl -fsSL https://raw.githubusercontent.com/yigegongjiang/jj-llm-switch/main/install.sh | bash -s uninstall
```

```sh
jjllmuse                       # 当前账号 + 备份列表
jjllmuse cc <email|prefix>     # 切 Claude Code 账号 (模糊匹配)
jjllmuse cx <email|prefix>     # 切 Codex 账号
jjllmuse cc backup             # 新账号 /login 后首次必跑
jjllmuse update                # 自更新到 GitHub Releases latest
jjllmuse -h
```

> 备份: `~/.config/jjllmuse/{cc,cx}/auth-backup-<email>.json` (0600). 含 refresh token, NEVER 提交 git.

## 架构

Bun + TypeScript 编译为 macOS arm64 + x64 单文件 binary. 凭据切换直接读写 macOS Keychain (`security`) + 备份至 `~/.config/jjllmuse`; cc 切换同步清 `~/.claude.json` 身份缓存. 安装 / 自更新按 arch 取对应 binary, 附 sha256 校验. 发布走 GitHub Actions tag push 自动编译上传 (见 [workflow.md](./workflow.md)).

## 项目结构

```
src/cli.ts      # 入口 + 参数分发
src/cc.ts       # Claude Code 账号读写 / 切换 / 备份
src/cx.ts       # Codex 账号读写 / 切换 / 备份
src/shared.ts   # Keychain / 文件 / 模糊匹配公共逻辑
src/update.ts   # 自更新 (按 arch 拉 Releases binary, 进度条 + sha256 校验, 原子替换)
build.ts        # 编译 macOS arm64 + x64 双 binary 到 dist/
```
