```When Editing
本文档作用: 面向开发者的发版记录; CHANGELOG.md 的超集, 1:1 镜像 + 技术变更子项
遵循 AGENTS.md 文档编写规范
- 每条主项 = CHANGELOG.md 对应条目 (原文), 下方缩进子项承载技术变更
- 子项 MAY 写路径 / 函数 / 机制; ≤ 1 行
```

# Changelog (developer, follow [CHANGELOG.md](./CHANGELOG.md))

## [0.2.0] - 2026-06-22

### Added

- 支持 macOS Intel (x64): 安装 / 自更新自动按 CPU 架构取对应 binary.
  - `build.ts` 循环 `bun-darwin-arm64` + `bun-darwin-x64` 双 target 编译 (minify, 清 `.bun-build` 中间产物); asset 命名 `jjllmuse-macos-<arch>`. `update.ts` `assetName()` 按 `process.arch` 拼 URL; install.sh `uname -m` 映射 arm64/x64. CI 上传双 binary + tag↔version 校验 + typecheck.
- 下载后校验 sha256, 损坏即中止, 不写入损坏文件.
  - CI `sha256sum` 生成 `checksums.txt` 一并发布; install.sh (`shasum -a 256`) / `update.ts` (`createHash`) best-effort 校验, 仅真实 mismatch 时 fail, 缺失/网络异常静默跳过.

### Changed

- `jjllmuse update` 下载时显示实时进度条 (百分比 + 已下载/总大小).
  - `update.ts` 改 `res.body` 流式读取累计字节, 按整数百分比节流刷新进度条至 stderr (非 TTY / `NO_COLOR` 时静默), 取代原 `res.arrayBuffer()` 静默下载.

## [0.1.9] - 2026-06-22

### Fixed

- 修复切回某账号后 Claude Code 无法认证的问题: 切换前备份现合并保留当前有效凭据, 不再用残缺旧备份覆盖.
  - live 凭据缺 `refreshToken` 时, re-backup 改为合并: 用 live 新 `accessToken` 更新备份并保留已有 `refreshToken`, 不再整体保留含过期 accessToken + 已撤销 refreshToken 的旧备份.

## [0.1.8] - 2026-06-22

### Fixed

- 新版 Claude Code 凭据下 `cc <email>` 无法识别当前账号 — 现回退官方途径取邮箱.
  - live Keychain 缺 `refreshToken` 且 `/api/oauth/profile` 返回 `401 authentication_error` 时, 回退 `claude auth status --json` 取 email.
- 切换前备份不再被残缺凭据降级覆盖.
  - `cc backup` / switch 前 re-backup 遇 live 缺 `refreshToken` 时, 不覆盖已有完整备份.

## [0.1.7] - 2026-05-16

### Fixed

- 修复 `cc <email>` 切换后 Claude Code 报 `Not logged in · Please run /login`.
  - 根因: payload 末尾残留 `\n` → `security add-generic-password -w` 以 binary blob 存入 (读出变 hex), Claude Code 不做 hex 解码 → `JSON.parse` 失败. 修复: `readKeychain` hex 解码后 strip trailing whitespace, `writeKeychain` 写入前防御性 strip.

## [0.1.6] - 2026-05-16

### Changed

- `jjllmuse update` 输出版本号变化 `<旧> -> <新>`, 版本未变追加 `(no change)`.
  - 新版本号经 spawn 替换后 binary `-v` 取得, 旧版本号取编译期 `VERSION`.

## [0.1.5] - 2026-05-16

### Fixed

- 修复 `cc` 在特定 Keychain 内容下崩溃; 状态查询全程兜底, 绝不崩溃.
  - `security -w` 在数据非纯 ASCII 时输出连续 hex dump; `readKeychain` 检测 `/^[0-9a-fA-F]+$/` 且偶数长度时 hex 解码回 JSON. `ccCurrent` / `cxCurrent` 全程 try/catch 只 warn 不退出.

## [0.1.4] - 2026-05-16

### Fixed

- 切换账号后 `/usage` 不再显示前账号的过期状态.
  - `cc switch` 额外清理 `~/.claude.json` 的 `cachedExtraUsageDisabledReason` (镜像 `/api/oauth/usage` 的 `disabled_reason`, 与上一账号 org 绑定).

## [0.1.3] - 2026-05-16

### Added

- `jjllmuse update`: 拉 GitHub Releases latest binary 原子替换自身.

## [0.1.2] - 2026-05-16

### Changed

- 当前账号显示精简为仅邮箱.

### Removed

- 移除 cc/cx 的过期时间 / org / plan 展示 (误导, 与实际可用性无关).
  - cx 过期读自 id_token `exp` (TTL 1h), 实际由 refresh_token 续期, 过期与可用性无关. 内部删 `expiry()` / `IdPayload` / `fields()` 等无引用代码.

## [0.1.1] - 2026-05-16

### Added

- 首版: `cc` / `cx` 切 Claude Code / Codex 账号, 邮箱前缀模糊匹配.
  - 邮箱前缀/子串模糊匹配 (`cc ali` ≡ `cc alice@example.com`).
- 切换前自动备份当前账号; 备份存 `~/.config/jjllmuse` (0600).
  - cc 切换同时清 `~/.claude.json` 身份缓存.
- macOS arm64 单文件 binary, 一行 `curl` 安装.

[0.2.0]: https://github.com/yigegongjiang/jj-llm-switch/releases/tag/v0.2.0
[0.1.9]: https://github.com/yigegongjiang/jj-llm-switch/releases/tag/v0.1.9
[0.1.8]: https://github.com/yigegongjiang/jj-llm-switch/releases/tag/v0.1.8
[0.1.7]: https://github.com/yigegongjiang/jj-llm-switch/releases/tag/v0.1.7
[0.1.6]: https://github.com/yigegongjiang/jj-llm-switch/releases/tag/v0.1.6
[0.1.5]: https://github.com/yigegongjiang/jj-llm-switch/releases/tag/v0.1.5
[0.1.4]: https://github.com/yigegongjiang/jj-llm-switch/releases/tag/v0.1.4
[0.1.3]: https://github.com/yigegongjiang/jj-llm-switch/releases/tag/v0.1.3
[0.1.2]: https://github.com/yigegongjiang/jj-llm-switch/releases/tag/v0.1.2
[0.1.1]: https://github.com/yigegongjiang/jj-llm-switch/releases/tag/v0.1.1
