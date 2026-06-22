#!/usr/bin/env bash
set -euo pipefail

REPO="yigegongjiang/jj-llm-switch"
BIN="${HOME}/.local/bin/jjllmuse"

if [ "${1:-}" = "uninstall" ]; then
  rm -f "$BIN" && echo "removed: $BIN"
  exit 0
fi

[ "$(uname -s)" = "Darwin" ] || { echo "unsupported OS: $(uname -s) (macOS only)" >&2; exit 1; }
case "$(uname -m)" in
  arm64)  arch="arm64" ;;
  x86_64) arch="x64" ;;
  *)      echo "unsupported arch: $(uname -m)" >&2; exit 1 ;;
esac

asset="jjllmuse-macos-${arch}"
base="https://github.com/${REPO}/releases/latest/download"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
tmp="${tmpdir}/${asset}"

curl -fL --progress-bar --retry 3 -o "$tmp" "${base}/${asset}"

# Best-effort sha256 verification; fail only on a real mismatch.
if line="$(curl -fsSL --retry 3 "${base}/checksums.txt" 2>/dev/null | grep " ${asset}\$" || true)"; then
  if [ -n "$line" ]; then
    expected="${line%% *}"
    actual="$(shasum -a 256 "$tmp" | awk '{print $1}')"
    [ "$expected" = "$actual" ] || { echo "checksum mismatch" >&2; exit 1; }
  fi
fi

mkdir -p "$(dirname "$BIN")"
chmod +x "$tmp"
mv -f "$tmp" "$BIN"
echo "installed: $BIN"
"$BIN" -v

case ":$PATH:" in
  *":${HOME}/.local/bin:"*) ;;
  *) echo "warning: $HOME/.local/bin is not in your PATH" >&2 ;;
esac
