// Codex: file ~/.codex/auth.json, identity via id_token JWT.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CX_DIR, cyan, gray, info, warn, fail, decodeJwt, listEmails, resolveEmail, writeSecret, backupPath, readBackup } from "./shared.ts";

const AUTH = process.env.CODEX_AUTH_FILE || join(process.env.HOME ?? "", ".codex/auth.json");

interface Auth { tokens: { id_token: string; access_token: string; refresh_token?: string; account_id?: string } }

function parse(s: string): Auth {
  const d = JSON.parse(s) as Auth;
  if (!d?.tokens?.id_token || !d?.tokens?.access_token) fail("invalid cx credential");
  return d;
}

function emailOf(a: Auth): string {
  return decodeJwt<{ email?: string }>(a.tokens.id_token).email ?? "";
}

function findEmailByRefresh(refresh: string, exclude?: string): string | null {
  for (const { email } of listEmails(CX_DIR)) {
    if (email === exclude) continue;
    try {
      if (parse(readFileSync(backupPath(CX_DIR, email), "utf8")).tokens.refresh_token === refresh) return email;
    } catch {}
  }
  return null;
}

export function cxCurrent() {
  if (!existsSync(AUTH)) { warn(`no cx auth at ${AUTH} (run 'codex login' first)`); return; }
  // Status query must never crash: any unexpected payload → warn and return.
  try {
    const d = JSON.parse(readFileSync(AUTH, "utf8")) as Partial<Auth>;
    const idToken = d?.tokens?.id_token;
    if (!idToken) { warn("cx auth format unexpected (missing tokens.id_token)"); return; }
    const email = decodeJwt<{ email?: string }>(idToken).email ?? "";
    console.log(`cx  ${cyan(email || "?")}`);
  } catch (e) {
    warn(`cx status unavailable: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function cxBackup() {
  if (!existsSync(AUTH)) fail(`no cx auth at ${AUTH}`);
  const raw = readFileSync(AUTH, "utf8");
  const e = emailOf(parse(raw));
  if (!e) fail("id_token has no email field");
  writeSecret(backupPath(CX_DIR, e), raw);
  info(`backed up cx → ${cyan(e)}`);
}

export function cxList() {
  const all = listEmails(CX_DIR);
  if (all.length === 0) { console.log(gray("  (no cx backups)")); return; }
  for (const { email, mtime } of all) {
    console.log(`  ${cyan(email)}  ${gray(mtime.toISOString().slice(0, 16).replace("T", " "))}`);
  }
}

export function cxSwitch(query: string, rebackup = true) {
  const email = resolveEmail(query, listEmails(CX_DIR).map(b => b.email));
  const targetRaw = readBackup(CX_DIR, email);
  const target = parse(targetRaw);

  if (existsSync(AUTH)) {
    const currentRaw = readFileSync(AUTH, "utf8");
    const cur = parse(currentRaw);
    if (cur.tokens.refresh_token && cur.tokens.refresh_token === target.tokens.refresh_token) {
      warn(`cx already on ${email}`); return;
    }
    if (rebackup) {
      const rt = cur.tokens.refresh_token;
      if (!rt) fail("live cx auth has no refresh_token");
      const curEmail = findEmailByRefresh(rt, email);
      if (!curEmail) fail("current cx account not previously backed up. Run: jjllmuse cx backup");
      writeSecret(backupPath(CX_DIR, curEmail), currentRaw);
      info(`re-backed up cx → ${cyan(curEmail)}`);
    }
  }

  writeSecret(AUTH, targetRaw);
  const verify = readFileSync(AUTH, "utf8");
  if (verify !== targetRaw) fail(`verification mismatch: ${AUTH} read-back ≠ written`);
  info(`switched cx → ${cyan(email)}`);
  console.log(gray("  restart any running 'codex' process"));
}
