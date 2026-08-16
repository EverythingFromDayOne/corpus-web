#!/usr/bin/env node
/**
 * verify-submodules.mjs
 *
 * Fails if any content submodule is missing, dirty, or on a floating ref
 * rather than an exact tag. Also fails if .gitmodules lists nothing — a gate
 * that returns 0 on an empty input set is broken.
 *
 * Session 2: also fails unless there are EXACTLY four — `nextjs`, `react`,
 * `angular`, `nestjs`. The session 1 audit found `auth`, `authz`, and
 * `websec` were mounted as submodules despite being demo apps with no
 * frontmatter (docs/adr/0002-demo-labs.md); this check is what stops that
 * mistake from landing again, silently or otherwise.
 *
 * Complements submodule.<name>.ignore = none, which makes `git status` surface
 * dirty submodule content instead of hiding it.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const gitmodulesPath = join(ROOT, '.gitmodules');

function git(args, cwd = ROOT) {
  // Git hooks export GIT_DIR pointing at the parent repo. Submodule commands
  // must not inherit that or they open the parent's index and fail.
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_PREFIX;
  return execFileSync('git', args, { cwd, encoding: 'utf8', env }).trim();
}

if (!existsSync(gitmodulesPath)) {
  console.error('verify-submodules: FAIL — .gitmodules is missing');
  process.exit(1);
}

const modules = parseGitmodules(readFileSync(gitmodulesPath, 'utf8'));

if (modules.length === 0) {
  console.error('verify-submodules: FAIL — .gitmodules lists no submodules');
  process.exit(1);
}

/**
 * Kept as a plain literal, not imported from `packages/content-schema`'s
 * `RepoId`: this script runs from the pre-commit hook via plain `node`, with
 * no TypeScript loader, so it must stay dependency-free. `RepoId` is the
 * canonical source of truth for meaning; keep the two in sync by hand.
 */
const EXPECTED_MOUNTS = ['content/nextjs', 'content/react', 'content/angular', 'content/nestjs'];

const errors = [];

const mountPaths = modules.map((m) => m.path).sort();
const expectedSorted = [...EXPECTED_MOUNTS].sort();
if (JSON.stringify(mountPaths) !== JSON.stringify(expectedSorted)) {
  errors.push(
    `expected exactly these submodules: ${expectedSorted.join(', ')} — got: ${mountPaths.join(', ') || '(none)'}`,
  );
}

for (const mod of modules) {
  if (mod.ignore !== 'none') {
    errors.push(
      `${mod.path}: submodule ignore must be "none" (got ${JSON.stringify(mod.ignore || '(unset)')}) so git status surfaces dirty corpus files`,
    );
  }

  const abs = join(ROOT, mod.path);
  if (!existsSync(abs)) {
    errors.push(`${mod.path}: missing on disk`);
    continue;
  }

  let head;
  try {
    head = git(['rev-parse', 'HEAD'], abs);
  } catch {
    errors.push(`${mod.path}: not initialised`);
    continue;
  }

  const dirty = git(['status', '--porcelain'], abs);
  if (dirty.length > 0) {
    errors.push(`${mod.path}: dirty working tree\n${indent(dirty)}`);
  }

  try {
    git(['describe', '--exact-match', '--tags', 'HEAD'], abs);
  } catch {
    const short = git(['rev-parse', '--short', 'HEAD'], abs);
    errors.push(`${mod.path}: HEAD ${short} (${head}) is not an exact tag`);
  }
}

if (errors.length > 0) {
  console.error(`verify-submodules: FAIL (${errors.length})`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-submodules: ${modules.length} submodule(s) pinned to a tag and clean`);

/**
 * @param {string} raw
 * @returns {Array<{ name: string, path: string, url: string, ignore: string }>}
 */
function parseGitmodules(raw) {
  /** @type {Array<{ name: string, path: string, url: string, ignore: string }>} */
  const out = [];
  /** @type {{ name: string, path: string, url: string, ignore: string } | null} */
  let current = null;

  for (const line of raw.split(/\r?\n/)) {
    const header = /^\[submodule "(.+)"\]/.exec(line);
    if (header) {
      current = { name: header[1], path: '', url: '', ignore: '' };
      out.push(current);
      continue;
    }
    if (!current) continue;
    const kv = /^\s*([A-Za-z][A-Za-z0-9-]*)\s*=\s*(.+?)\s*$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    const value = kv[2];
    if (key === 'path' || key === 'url' || key === 'ignore') {
      current[key] = value;
    }
  }

  return out;
}

/** @param {string} text */
function indent(text) {
  return text
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}
