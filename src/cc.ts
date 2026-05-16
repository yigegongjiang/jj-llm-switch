// Claude Code: macOS Keychain (service "Claude Code-credentials"), identity via /api/oauth/profile.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { CC_DIR, cyan, gray, info, warn, fail, listEmails, resolveEmail, writeSecret, backupPath, readBackup } from "./shared.ts";

const SERVICE = "Claude Code-credentials";
const CLAUDE_JSON = join(process.env.HOME ?? "", ".claude.json");

interface Auth { claudeAiOauth: { accessToken: string; refreshToken?: string } }
interface Profile { account?: { email?: string } }

async function sh(cmd: string[], allowFail = false): Promise<{ stdout: string; code: number }> {
  const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(p.stdout).text();
  const code = await p.exited;
  if (code !== 0 && !allowFail) fail(`${cmd[0]} failed: ${await new Response(p.stderr).text()}`);
  return { stdout, code };
}

async function readKeychain(): Promise<string | null> {
  const { stdout, code } = await sh(["security", "find-generic-password", "-s", SERVICE, "-w"], true);
  return code === 0 ? stdout.replace(/\n$/, "") : null;
}

async function writeKeychain(payload: string) {
  await sh(["security", "add-generic-password", "-s", SERVICE, "-a", process.env.USER ?? "user", "-w", payload, "-U"]);
}

function parse(s: string): Auth {
  const d = JSON.parse(s) as Auth;
  if (!d?.claudeAiOauth?.accessToken) fail("invalid cc credential");
  return d;
}

async function fetchProfile(token: string): Promise<Profile | null> {
  try {
    const r = await fetch("https://api.anthropic.com/api/oauth/profile", {
      headers: { Authorization: `Bearer ${token}`, "anthropic-beta": "oauth-2025-04-20" },
      signal: AbortSignal.timeout(10_000),
    });
    return r.ok ? await r.json() as Profile : null;
  } catch { return null; }
}

function findEmailByRefresh(refresh: string, exclude?: string): string | null {
  for (const { email } of listEmails(CC_DIR)) {
    if (email === exclude) continue;
    try {
      if (parse(readFileSync(backupPath(CC_DIR, email), "utf8")).claudeAiOauth.refreshToken === refresh) return email;
    } catch {}
  }
  return null;
}

// Strip cached identity so Claude Code refetches it on next launch.
function clearClaudeJsonIdentity() {
  if (!existsSync(CLAUDE_JSON)) return;
  let data: Record<string, unknown>;
  try { data = JSON.parse(readFileSync(CLAUDE_JSON, "utf8")); } catch { return; }
  const removed = ["oauthAccount", "userID"].filter(k => k in data);
  if (removed.length === 0) return;
  for (const k of removed) delete data[k];
  const mode = statSync(CLAUDE_JSON).mode & 0o777;
  writeSecret(CLAUDE_JSON, JSON.stringify(data, null, 2));
  // writeSecret forces 0600; restore the original mode if it was less restrictive.
  if (mode !== 0o600) Bun.spawnSync(["chmod", mode.toString(8), CLAUDE_JSON]);
  info(`cleared ${CLAUDE_JSON}: ${removed.join(",")}`);
}

export async function ccCurrent() {
  const raw = await readKeychain();
  if (!raw) { warn(`no cc credential in Keychain (run 'claude' /login first)`); return; }
  const a = parse(raw);
  const p = await fetchProfile(a.claudeAiOauth.accessToken);
  console.log(`cc  ${cyan(p?.account?.email ?? "?")}`);
}

export async function ccBackup() {
  const raw = await readKeychain();
  if (!raw) fail("no cc credential in Keychain");
  const a = parse(raw);
  const p = await fetchProfile(a.claudeAiOauth.accessToken);
  const email = p?.account?.email;
  if (!email) fail("could not resolve cc email (token expired or network down)");
  writeSecret(backupPath(CC_DIR, email), raw);
  info(`backed up cc → ${cyan(email)}`);
}

export function ccList() {
  const all = listEmails(CC_DIR);
  if (all.length === 0) { console.log(gray("  (no cc backups)")); return; }
  for (const { email, mtime } of all) {
    console.log(`  ${cyan(email)}  ${gray(mtime.toISOString().slice(0, 16).replace("T", " "))}`);
  }
}

export async function ccSwitch(query: string, rebackup = true) {
  const email = resolveEmail(query, listEmails(CC_DIR).map(b => b.email));
  const targetRaw = readBackup(CC_DIR, email);
  const target = parse(targetRaw);

  const currentRaw = await readKeychain();
  if (currentRaw) {
    const cur = parse(currentRaw);
    if (cur.claudeAiOauth.refreshToken && cur.claudeAiOauth.refreshToken === target.claudeAiOauth.refreshToken) {
      warn(`cc already on ${email}`); return;
    }
    if (rebackup) {
      let curEmail = cur.claudeAiOauth.refreshToken ? findEmailByRefresh(cur.claudeAiOauth.refreshToken, email) : null;
      if (!curEmail) curEmail = (await fetchProfile(cur.claudeAiOauth.accessToken))?.account?.email ?? null;
      if (!curEmail) fail("cannot identify current cc account. Run: jjllmuse cc backup");
      writeSecret(backupPath(CC_DIR, curEmail), currentRaw);
      info(`re-backed up cc → ${cyan(curEmail)}`);
    }
  }

  await writeKeychain(targetRaw);
  const verify = await readKeychain();
  if (verify !== targetRaw) fail("verification mismatch: Keychain read-back ≠ written");
  clearClaudeJsonIdentity();
  info(`switched cc → ${cyan(email)}`);
  console.log(gray("  restart any running 'claude' process"));
}
