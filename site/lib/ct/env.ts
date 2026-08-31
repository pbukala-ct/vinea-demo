import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * commercetools connection config, with `.env.local` authoritative for CTP_* in development.
 *
 * Next resolves .env.local ONLY for keys absent from process.env, so any CTP_* exported in the
 * shell silently wins. With a sibling commercetools project's env loaded (direnv, dotenv, a stray
 * `export`), this app came up pointed at the wrong project: it rendered that project's stores and
 * every lookup by our own keys 404'd as "not trading". direnv is not a fix — its hook does not run
 * in non-interactive shells, so `next build` inherited the wrong project too.
 *
 * So: if a local .env.local exists, it wins for CTP_* (it is the repo's own declaration of intent).
 * Otherwise fall back to the real environment, which is how hosted deployments supply these.
 */
function readEnvFile(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const path of [join(process.cwd(), '.env.local'), join(process.cwd(), 'site', '.env.local')]) {
    try {
      for (let line of readFileSync(path, 'utf8').split('\n')) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        if (line.startsWith('export ')) line = line.slice(7);
        const i = line.indexOf('=');
        if (i < 0) continue;
        out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
      }
      return out;
    } catch { /* try the next candidate */ }
  }
  return out;
}

const fileEnv = readEnvFile();

/** CTP_* comes from .env.local when present, else the process environment. */
export function ctpEnv(name: string): string | undefined {
  return fileEnv[name] ?? process.env[name];
}

export function requireCtpEnv(name: string): string {
  const v = ctpEnv(name);
  if (!v) throw new Error(`${name} is not set — see site/.env.example`);
  return v;
}
