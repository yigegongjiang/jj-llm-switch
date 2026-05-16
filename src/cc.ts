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
  if (code !== 0) return null;
  const trimmed = stdout.replace(/\n$/, "");
  if (!trimmed) return null;
  // `security -w` falls back to a continuous hex dump (no `0x` prefix, no quotes)
  // when the stored blob is not pure printable ASCII. Recent Claude Code writes
  // credentials this way, so we must decode hex back to the original JSON string.
  // JSON text always contains `{` / `"` / `:` which are not hex chars, so a stdout
  // that is /^[0-9a-fA-F]+$/ with even length is unambiguously a hex dump.
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    // Strip trailing whitespace from the decoded payload. Critical: a trailing
    // \n in the next writeKeychain forces `security` into binary-blob storage
    // (hex output on read), and Claude Code does not hex-decode reads → switch
    // succeeds but `claude` reports "Not logged in".
    return Buffer.from(trimmed, "hex").toString("utf8").replace(/\s+$/, "");
  }
  return trimmed;
}

async function writeKeychain(payload: string): Promise<string> {
  // Defensive trim: keep payload pure printable ASCII so `security` stores it
  // as text. See readKeychain for the binary-fallback failure mode.
  const clean = payload.replace(/\s+$/, "");
  await sh(["security", "add-generic-password", "-s", SERVICE, "-a", process.env.USER ?? "user", "-w", clean, "-U"]);
  return clean;
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

// Strip account-scoped cached state so Claude Code refetches it on next launch.
// cachedExtraUsageDisabledReason mirrors `disabled_reason` from /api/oauth/usage and is tied to
// the previous account's org; stale value misleads /usage and extra-usage UI after a switch.
function clearClaudeJsonIdentity() {
  if (!existsSync(CLAUDE_JSON)) return;
  let data: Record<string, unknown>;
  try { data = JSON.parse(readFileSync(CLAUDE_JSON, "utf8")); } catch { return; }
  const removed = ["oauthAccount", "userID", "cachedExtraUsageDisabledReason"].filter(k => k in data);
  if (removed.length === 0) return;
  for (const k of removed) delete data[k];
  const mode = statSync(CLAUDE_JSON).mode & 0o777;
  writeSecret(CLAUDE_JSON, JSON.stringify(data, null, 2));
  // writeSecret forces 0600; restore the original mode if it was less restrictive.
  if (mode !== 0o600) Bun.spawnSync(["chmod", mode.toString(8), CLAUDE_JSON]);
  info(`cleared ${CLAUDE_JSON}: ${removed.join(",")}`);
}

export async function ccCurrent() {
  // Status query must never crash: any unexpected payload → warn and return.
  try {
    const raw = await readKeychain();
    if (!raw) { warn(`no cc credential in Keychain (run 'claude' /login first)`); return; }
    const a = JSON.parse(raw) as Partial<Auth>;
    const token = a?.claudeAiOauth?.accessToken;
    if (!token) { warn("cc credential format unexpected (missing claudeAiOauth.accessToken)"); return; }
    const p = await fetchProfile(token);
    console.log(`cc  ${cyan(p?.account?.email ?? "?")}`);
  } catch (e) {
    warn(`cc status unavailable: ${e instanceof Error ? e.message : String(e)}`);
  }
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

  const wrote = await writeKeychain(targetRaw);
  const verify = await readKeychain();
  if (verify !== wrote) fail("verification mismatch: Keychain read-back ≠ written");
  clearClaudeJsonIdentity();
  info(`switched cc → ${cyan(email)}`);
  console.log(gray("  restart any running 'claude' process"));
}
