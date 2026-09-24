/**
 * Load a `.env` file from a list of candidate paths into `process.env`,
 * with priority `process.env` (do not override an already-exported var).
 *
 * Uses Node's native `--env-file` loader (available since 21.7) when
 * present, otherwise a tiny hand-rolled parser that handles `KEY=value`
 * lines. Comments (`#`) and blank lines are ignored. Quoted values have
 * their surrounding quotes stripped; this is enough for dev credentials.
 *
 * Why not `@nestjs/config`? `@nestjs/config` only loads .env during Nest
 * bootstrap. Migration CLI scripts run before Nest. We want one `loadEnv`
 * call everywhere — Dev, Nest boot, and CLI — without splitting config
 * between two loaders.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

async function parseEnvFile(filePath: string): Promise<void> {
  let contents: string;
  try {
    contents = await fs.readFile(filePath, 'utf8');
  } catch {
    return;
  }
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Do not override explicit process env.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export async function loadDotEnv(candidates: string[] = []): Promise<void> {
  if (typeof (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile === 'function') {
    for (const p of candidates) {
      if (await exists(p)) {
        (process as unknown as { loadEnvFile: (p?: string) => void }).loadEnvFile(p);
        return;
      }
    }
    return;
  }
  for (const p of candidates) {
    await parseEnvFile(p);
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Default candidate order: repo-root `.env`, then `apps/api/.env`. The first
 * existing file wins. `.env.example` is NEVER loaded (it's the doc, not
 * the config — `.env.example`'s placeholders are not real values).
 */
export const defaultEnvCandidates = () => {
  const cwd = process.cwd();
  // Search order: cwd/.env, cwd/../.env (parent), cwd/apps/api/.env.
  // The migration CLI runs with cwd = `apps/api`; the API itself runs
  // from anywhere; the repo-root `.env` is the canonical home.
  const repoRoot = path.resolve(cwd, '..', '..');
  return [
    path.join(cwd, '.env'),
    path.join(repoRoot, '.env'),
    path.join(cwd, 'apps', 'api', '.env'),
  ];
};
