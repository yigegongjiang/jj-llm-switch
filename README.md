# jjllmuse

本机 **Claude Code** 与 **Codex** CLI 多账号一键切换 (macOS arm64).

## 安装 / 更新 / 卸载

```sh
curl -fsSL https://raw.githubusercontent.com/yigegongjiang/jj-llm-switch/main/install.sh | bash
curl -fsSL https://raw.githubusercontent.com/yigegongjiang/jj-llm-switch/main/install.sh | bash -s uninstall
```

## 用

```sh
jjllmuse                       # 当前账号 + 备份列表
jjllmuse cc <email|prefix>     # 切 Claude Code 账号 (模糊匹配)
jjllmuse cx <email|prefix>     # 切 Codex 账号
jjllmuse cc backup             # 新账号 /login 后首次必跑
jjllmuse -h
```

备份: `~/.config/jjllmuse/{cc,cx}/auth-backup-<email>.json` (0600). 含 refresh token, **绝勿提交 git**.

## 发版

改 `package.json` 的 `version` → `git tag v$(node -p "require('./package.json').version")` → `git push --tags` → CI 编译并上传 binary.
