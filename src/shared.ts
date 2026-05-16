import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, chmodSync, renameSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import pkg from "../package.json" with { type: "json" };

export const VERSION = pkg.version;
const HOME = join(process.env.HOME ?? "", ".config/jjllmuse");
export const CC_DIR = join(HOME, "cc");
export const CX_DIR = join(HOME, "cx");

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code: string, s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
export const red   = (s: string) => c("31", s);
export const green = (s: string) => c("32", s);
export const cyan  = (s: string) => c("36", s);
export const gray  = (s: string) => c("90", s);

export function info(m: string) { console.log(`${green("✓")} ${m}`); }
export function warn(m: string) { console.error(`⚠ ${m}`); }
export function fail(m: string): never { console.error(`${red("✗")} ${m}`); process.exit(1); }

export function decodeJwt<T>(token: string): T {
  const seg = token.split(".")[1];
  if (!seg) throw new Error("not a JWT");
  const b64 = seg.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((seg.length + 3) % 4);
  return JSON.parse(Buffer.from(b64, "base64").toString());
}

export function writeSecret(path: string, data: string) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, data, { mode: 0o600 });
  chmodSync(tmp, 0o600);
  renameSync(tmp, path);
}

export function listEmails(dir: string): { email: string; mtime: Date }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(n => n.startsWith("auth-backup-") && n.endsWith(".json"))
    .map(n => ({
      email: n.slice("auth-backup-".length, -".json".length),
      mtime: statSync(join(dir, n)).mtime,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export function resolveEmail(query: string, emails: string[]): string {
  if (emails.includes(query)) return query;
  const m = emails.filter(e => e.toLowerCase().includes(query.toLowerCase()));
  if (m.length === 1) return m[0]!;
  if (m.length === 0) fail(`no backup matches '${query}'. Available: ${emails.join(", ") || "(none)"}`);
  fail(`ambiguous '${query}' — matches: ${m.join(", ")}`);
}

export function backupPath(dir: string, email: string): string {
  return join(dir, `auth-backup-${email}.json`);
}

export function readBackup(dir: string, email: string): string {
  const p = backupPath(dir, email);
  if (!existsSync(p)) fail(`backup not found: ${p}`);
  return readFileSync(p, "utf8");
}

