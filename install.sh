#!/usr/bin/env bash
set -euo pipefail

REPO="yigegongjiang/jj-llm-switch"
BIN="${HOME}/.local/bin/jjllmuse"

if [ "${1:-}" = "uninstall" ]; then
  rm -f "$BIN" && echo "removed: $BIN"
  exit 0
fi

if [ "$(uname -sm)" != "Darwin arm64" ]; then
  echo "unsupported platform; only macOS arm64 binaries are published" >&2
  exit 1
fi

mkdir -p "$(dirname "$BIN")"
curl -fL --progress-bar \
  "https://github.com/${REPO}/releases/latest/download/jjllmuse-macos-arm64" \
  -o "$BIN"
chmod +x "$BIN"
echo "installed: $BIN"
"$BIN" -v

case ":$PATH:" in
  *":${HOME}/.local/bin:"*) ;;
  *) echo "warning: $HOME/.local/bin is not in your PATH" >&2 ;;
esac
