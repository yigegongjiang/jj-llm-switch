#!/usr/bin/env bun
import { VERSION, fail } from "./shared.ts";
import { ccCurrent, ccBackup, ccList, ccSwitch } from "./cc.ts";
import { cxCurrent, cxBackup, cxList, cxSwitch } from "./cx.ts";

const HELP = `jjllmuse v${VERSION} — Claude Code / Codex account switcher

USAGE
  jjllmuse                       status of both + backup lists
  jjllmuse <cc|cx>               status + backups of one tool
  jjllmuse <cc|cx> <email>       switch (fuzzy match on email)
  jjllmuse <cc|cx> backup        backup current account (run once after /login)
  jjllmuse -h | -v
`;

type Tool = "cc" | "cx";
const current = { cc: ccCurrent, cx: cxCurrent };
const backup  = { cc: ccBackup,  cx: cxBackup  };
const list    = { cc: ccList,    cx: cxList    };
const swit    = { cc: ccSwitch,  cx: cxSwitch  };

async function run(tool: Tool, arg?: string) {
  if (!arg) { await current[tool](); console.log(); list[tool](); return; }
  if (arg === "backup") return backup[tool]();
  return swit[tool](arg);
}

const [first, second] = process.argv.slice(2);

if (!first) {
  await ccCurrent(); cxCurrent();
  console.log("\ncc backups:"); ccList();
  console.log("\ncx backups:"); cxList();
} else if (first === "-h" || first === "--help") {
  console.log(HELP);
} else if (first === "-v" || first === "--version") {
  console.log(VERSION);
} else if (first === "cc" || first === "cx") {
  await run(first, second);
} else {
  fail(`unknown command '${first}'. Run 'jjllmuse -h'`);
}
