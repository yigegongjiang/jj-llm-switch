// Self-update: stream-download latest binary with progress, verify checksum, atomic-replace own file.
import { createHash } from "node:crypto";
import { writeFileSync, chmodSync, renameSync } from "node:fs";
import { basename } from "node:path";
import { VERSION, info, fail, cyan } from "./shared.ts";

const BASE = "https://github.com/yigegongjiang/jj-llm-switch/releases/latest/download";

function assetName(): string {
  if (process.platform !== "darwin") fail(`unsupported OS: ${process.platform} (macOS only)`);
  const a = process.arch;
  if (a !== "arm64" && a !== "x64") fail(`unsupported arch: ${a}`);
  return `jjllmuse-macos-${a}`;
}

const tty = process.stderr.isTTY && !process.env.NO_COLOR;
const mb = (n: number) => (n / 1048576).toFixed(1);

function renderProgress(received: number, total: number) {
  if (total > 0) {
    const pct = received / total;
    const width = 24;
    const filled = Math.round(pct * width);
    const bar = "█".repeat(filled) + "░".repeat(width - filled);
    process.stderr.write(`\r  ${cyan(bar)} ${String(Math.round(pct * 100)).padStart(3)}%  ${mb(received)}/${mb(total)} MB\x1b[K`);
  } else {
    process.stderr.write(`\r  downloading… ${mb(received)} MB\x1b[K`);
  }
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) fail(`download failed: ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let lastPct = -1;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (tty) {
      const pct = total > 0 ? Math.round((received / total) * 100) : -1;
      if (pct !== lastPct) { renderProgress(received, total); lastPct = pct; }
    }
  }
  if (tty) { renderProgress(received, total); process.stderr.write("\n"); }
  return Buffer.concat(chunks);
}

// Best-effort: verify sha256 against checksums.txt if present; fail only on a real mismatch.
async function verifyChecksum(buf: Buffer, asset: string) {
  try {
    const res = await fetch(`${BASE}/checksums.txt`, { redirect: "follow" });
    if (!res.ok) return;
    const line = (await res.text()).split(/\r?\n/).find((l) => l.trim().endsWith(` ${asset}`));
    if (!line) return;
    const expected = line.trim().split(/\s+/)[0]!.toLowerCase();
    const actual = createHash("sha256").update(buf).digest("hex");
    if (expected !== actual) fail("checksum mismatch — download corrupted, aborting");
  } catch {
    // network / format issue → skip verification, never block update
  }
}

export async function update() {
  const dest = process.execPath;
  if (!basename(dest).startsWith("jjllmuse")) fail(`not a jjllmuse binary: ${dest}`);
  const asset = assetName();
  const buf = await download(`${BASE}/${asset}`);
  await verifyChecksum(buf, asset);
  const tmp = `${dest}.tmp.${process.pid}`;
  writeFileSync(tmp, buf);
  chmodSync(tmp, 0o755);
  renameSync(tmp, dest);
  const probe = Bun.spawnSync([dest, "-v"]);
  const latest = probe.stdout.toString().trim() || "unknown";
  info(`${VERSION} -> ${latest}${VERSION === latest ? " (no change)" : ""}`);
}
