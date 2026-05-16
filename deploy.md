# deploy

发版 = 改 `package.json` 的 `version` + 改 `CHANGELOG.md` → commit → push → 打 tag → push tag.

```sh
git add package.json CHANGELOG.md <其他改动>
git commit -m "X.Y.Z: <一句话>"
git push
git tag vX.Y.Z && git push origin vX.Y.Z
```

tag 名 = `v` + `package.json` 的 version. 推 tag 后 CI 自动编译 macOS arm64 binary 并附到 GitHub Release. 不要用 workflow_dispatch.
