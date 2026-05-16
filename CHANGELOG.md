# Changelog

## 0.1.6 — 2026-05-16

- `jjllmuse update` 输出版本号变化: `<旧> -> <新>`, 版本未变追加 `(no change)`. 新版本号通过 spawn 替换后 binary `-v` 取得, 旧版本号取当前进程编译期 `VERSION`. 原先只输出 `updated` 不提示版本差异.

## 0.1.5 — 2026-05-16

- 修复 `cc` 在 Keychain 内容含非可打印字节时崩溃 (`SyntaxError: JSON Parse error` at `JSON.parse(s)`). 根因: macOS `security find-generic-password -w` 在数据非纯 ASCII 时自动以连续 hex dump (无 `0x` 前缀) 输出, 旧实现把 hex 直接喂给 `JSON.parse`. 现在 `readKeychain` 检测 `/^[0-9a-fA-F]+$/` 且偶数长度时 hex 解码回原 JSON. 该路径影响 `jjllmuse` / `jjllmuse cc` / `jjllmuse cc backup` / `jjllmuse cc <email>` 全部命令.
- `ccCurrent` / `cxCurrent` 状态查询全程 try/catch 兜底, 任何意外 payload 只 warn 不退出. 状态命令绝不 crash 是硬性约束.

## 0.1.4 — 2026-05-16

- `cc switch` 额外清理 `~/.claude.json` 的 `cachedExtraUsageDisabledReason` 字段. 该字段镜像 `/api/oauth/usage` 的 `disabled_reason`, 与上一个账号的 org 绑定, 不清理会导致切换后 `/usage` / extra-usage UI 显示前账号的过期状态.

## 0.1.3 — 2026-05-16

- 新增 `jjllmuse update`: 拉 GitHub Releases latest binary 原子替换自身.

## 0.1.2 — 2026-05-16

- `cc` / `cx` 当前账号显示精简为仅邮箱 (例: `cc  alice@example.com`).
- 移除 cx 的过期时间显示: 该字段读自 id_token `exp`, TTL 仅 1h, codex 实际由 refresh_token 自动续期, id_token 过期与可用性无关, 长期显示 `expired` 属于误导.
- 同步移除 cc 的 org / plan / expiry 展示, 与 cx 对称.
- 内部清理: 删 `expiry()`, `IdPayload`, `fields()` 等无引用代码.

## 0.1.1 — 2026-05-16

首版.

- 全局命令 `jjllmuse`, 子命令 `cc` / `cx` 分别切 Claude Code / Codex 账号.
- 邮箱前缀/子串模糊匹配 (`jjllmuse cc ali` ≡ `jjllmuse cc alice@example.com`).
- 切换前自动 re-backup 当前账号; cc 同时清 `~/.claude.json` 身份缓存.
- 备份存 `~/.config/jjllmuse/{cc,cx}/auth-backup-<email>.json`, mode 0600.
- macOS arm64 单文件 binary, 一行 `curl` 安装.
