# jjllmuse agent rules

## 目标

本仓库用于开发 `jjllmuse`：一个极稳定的 Claude Code / Codex CLI 多账号一键切换工具。

工程目标不是构建复杂项目管理工具，而是保证 Claude Code / Codex CLI 多账号一键切换工具的稳定性。

稳定性优先级高于功能扩展、UI 质量、架构抽象和代码重构。

## 开发方式

- 优先修正缺陷和边界条件，而不是扩展产品形态。
- 只做必要改动；直接实现优先于新抽象。

### For AI/LLM/Claude code /Codex

- 用户如果不明说不允许 push，那么可以参考 deploy.md 中的流程完成 tag 的创建 和 push 操作。
- 版本号的修改尽量使用 3 位小版本调整。重大功能改造才允许修改 2 位版本号。
- 有时候是对上一个功能调整的不满意，这个时候应该使用 git amend，然后 force push 并打 tag。

## 文本内容要求

所有文本内容的查阅，不是人类，都是 AI/LLM。所以不需要兼容人类的阅读体验，能够让 AI/LLM 高质量理解即可。
