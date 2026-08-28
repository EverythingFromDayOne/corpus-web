#!/usr/bin/env node
/**
 * verify-submodules.mjs
 *
 * Fails if any content submodule is missing, dirty, or not at the SHA the
 * parent repo's gitlink records. The parent-pinned SHA is the source of
 * truth: it is what `actions/checkout@v4` with `submodules: recursive`
 * honors in CI (the submodule init step does `git -c protocol.version=2
 * submodule update --init --force --depth=1 --recursive` per GitHub's
 * actions/checkout@v4 source — depth=1, no tags), and what `git submodule
 * update --init` honors locally. The script reports the tag name
 * (e.g. `v0.6.0`) for human-readable confirmation when run locally with
 * tags fetched, but does NOT fail when the tag object is missing — that
 * is the CI-shallow-clone state, not a real drift.
 *
 * Also fails if .gitmodules lists nothing — a gate that returns 0 on an
 * empty input set is broken.
 *
 * Session 2: also fails unless there are EXACTLY four — `nextjs`, `react`,
 * `angular`, `nestjs`. The session 1 audit found `auth`, `authz`, and
 * `websec` were mounted as submodules despite being demo apps with no
 * frontmatter (docs/adr/0002-demo-labs.md); this check is what stops that
 * mistake from landing again, silently or otherwise.
 *
 * Complements submodule.<name>.ignore = none, which makes `git status` surface
 * dirty submodule content instead of hiding it.
 *
 * D37 history: prior to 2026-08-28 this script used `git describe
 * --exact-match --tags HEAD` as the primary check, which fails on CI's
 * shallow submodule clones because `--depth=1` does not fetch tag
 * objects. The check still ran cleanly locally (full clones DO have
 * tags) so local verification passed while CI ran red. Switched to
 * "submodule HEAD == parent gitlink" as the primary invariant, with
 * tag reporting as a best-effort informational line. See docs/DEBT.md
 * row D37.
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

  // Primary check: the submodule HEAD must match the SHA the parent repo's
  // gitlink records. This is what `actions/checkout@v4` with
  // `submodules: recursive` honors in CI (D37), and what `git submodule
  // update --init` honors locally — so it is the source of truth for
  // "is the submodule in sync with the parent repo". The gitlink is read
  // from the parent's index at the recorded path.
  let pinned;
  try {
    pinned = git(['ls-files', '--stage', mod.path], ROOT);
  } catch {
    errors.push(`${mod.path}: cannot read parent gitlink`);
    continue;
  }
  // `git ls-files --stage <path>` prints one line:
  //   <mode> <sha> <stage>\t<path>
  const gitlinkMatch = /^\d+ ([0-9a-f]{40}) \d+\t/.exec(pinned);
  if (!gitlinkMatch) {
    errors.push(`${mod.path}: parent gitlink not found`);
    continue;
  }
  const pinnedSha = gitlinkMatch[1];
  if (head !== pinnedSha) {
    const short = git(['rev-parse', '--short', 'HEAD'], abs);
    const shortPinned = pinnedSha.slice(0, 7);
    errors.push(
      `${mod.path}: HEAD ${short} does not match parent gitlink ${shortPinned}. ` +
        `Run \`git submodule update --init ${mod.path}\` to sync.`,
    );
  }

  // Secondary check: a tag should point at the pinned SHA. This is the
  // belt-and-suspenders guarantee for humans running the script locally
  // with full tag fetches, where `git describe --exact-match` succeeds.
  // CI's `actions/checkout@v4` uses `--depth=1 --no-tags` for submodules
  // (verified from CI logs of D37), so tag objects are NOT fetched and
  // this check would fail there. The parent-pinned-SHA check above is
  // the authoritative one — this tag check is informational and runs
  // best-effort: a missing tag (because tags weren't fetched) does NOT
  // fail the gate, but is reported so humans can see it locally.
  let tag = '(unknown — tags not fetched)';
  try {
    tag = git(['describe', '--exact-match', '--tags', 'HEAD'], abs);
  } catch {
    // CI shallow-clone does not fetch tags. Local tag check is best-effort.
  }
  console.log(`verify-submodules: ${mod.path} at ${head.slice(0, 7)} (${tag})`);
}

if (errors.length > 0) {
  console.error(`verify-submodules: FAIL (${errors.length})`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-submodules: ${modules.length} submodule(s) pinned to parent gitlinks and clean`);

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
