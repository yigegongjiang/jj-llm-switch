// Self-update: download latest binary, atomic-replace own file.
import { writeFileSync, chmodSync, renameSync } from "node:fs";
import { basename } from "node:path";
import { info, fail } from "./shared.ts";

const URL = "https://github.com/yigegongjiang/jj-llm-switch/releases/latest/download/jjllmuse-macos-arm64";

export async function update() {
  const dest = process.execPath;
  if (!basename(dest).startsWith("jjllmuse")) fail(`not a jjllmuse binary: ${dest}`);
  const res = await fetch(URL, { redirect: "follow" });
  if (!res.ok) fail(`download failed: ${res.status}`);
  const tmp = `${dest}.tmp.${process.pid}`;
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  chmodSync(tmp, 0o755);
  renameSync(tmp, dest);
  info("updated");
}
