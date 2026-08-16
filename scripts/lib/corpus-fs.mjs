/**
 * corpus-fs.mjs
 *
 * Shared file-system helpers for the content-pipeline scripts (audit, catalog
 * builder, verify gates). One place so the four scripts never re-implement
 * submodule parsing or markdown walking slightly differently.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, posix, relative, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..', '..');
export const CONTENT_DIR = join(ROOT, 'content');

/**
 * @param {string} raw contents of .gitmodules
 * @returns {Array<{ name: string, path: string, url: string, ignore: string }>}
 */
export function parseGitmodules(raw) {
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
    const [, key, value] = kv;
    if (key === 'path' || key === 'url' || key === 'ignore') current[key] = value;
  }

  return out;
}

export function readGitmodules() {
  const gitmodulesPath = join(ROOT, '.gitmodules');
  if (!existsSync(gitmodulesPath)) {
    throw new Error('.gitmodules is missing');
  }
  return parseGitmodules(readFileSync(gitmodulesPath, 'utf8'));
}

/** @param {string[]} args @param {string} cwd */
export function git(args, cwd) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_PREFIX;
  return execFileSync('git', args, { cwd, encoding: 'utf8', env }).trim();
}

/** Submodule tag + commit, as recorded on disk. Throws if not pinned to a tag. */
export function submoduleRef(absPath) {
  const commit = git(['rev-parse', 'HEAD'], absPath);
  const tag = git(['describe', '--exact-match', '--tags', 'HEAD'], absPath);
  return { tag, commit };
}

/**
 * Recursively list every `.md`/`.mdx` file under `dir`, returning paths relative
 * to `dir` in posix form (`docs/concepts/foo/bar.md`). Skips `.git`.
 *
 * @param {string} dir absolute path
 * @returns {string[]}
 */
export function listAllMarkdownFiles(dir) {
  /** @type {string[]} */
  const out = [];

  /** @param {string} current */
  function walk(current) {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
        out.push(toPosix(relative(dir, full)));
      }
    }
  }

  walk(dir);
  return out.sort();
}

/**
 * Recursively list every `.md`/`.mdx` file under `${dir}/${subdir}`, returning
 * paths relative to `dir` (not `subdir`) in posix form. Returns `[]` if the
 * subdirectory does not exist — an empty category is not an error.
 *
 * @param {string} dir absolute repo root
 * @param {string} subdir root-relative subdirectory, e.g. `docs/concepts`
 */
export function listAllMarkdownFilesUnder(dir, subdir) {
  const abs = join(dir, subdir);
  if (!existsSync(abs)) return [];
  return listAllMarkdownFiles(abs).map((f) => toPosix(posix.join(subdir, f)));
}

/**
 * Select the concept and recipe article files for one adapter, applying the
 * `conceptsRoot` / `recipesRoot` / `excludeDirs` rules from
 * `packages/content-schema/src/adapters/types.ts`, plus the universal
 * `index.md` exclusion (a listing page, never an article — see
 * `isIndexFile` in `adapters/shared.ts`).
 *
 * @param {string} repoAbsDir absolute path to the submodule root
 * @param {{ conceptsRoot: string | null, recipesRoot: string, excludeDirs: string[] }} adapter
 * @param {(sourcePath: string) => boolean} isIndexFile
 */
export function selectArticleFiles(repoAbsDir, adapter, isIndexFile) {
  /** @type {string[]} */
  let concepts;

  if (adapter.conceptsRoot !== null) {
    concepts = listAllMarkdownFilesUnder(repoAbsDir, adapter.conceptsRoot);
  } else {
    const skip = new Set([adapter.recipesRoot, ...adapter.excludeDirs]);
    const topDirs = listTopLevelDirs(repoAbsDir).filter((d) => !skip.has(d));
    concepts = topDirs.flatMap((dir) => listAllMarkdownFilesUnder(repoAbsDir, dir));
  }

  const recipes = listAllMarkdownFilesUnder(repoAbsDir, adapter.recipesRoot);

  const filterIndex = (files) => files.filter((f) => !isIndexFile(f));
  const conceptFiles = filterIndex(concepts).sort();
  const recipeFiles = filterIndex(recipes).sort();

  return { concepts: conceptFiles, recipes: recipeFiles, all: [...conceptFiles, ...recipeFiles].sort() };
}

/** List the immediate subdirectory names of `dir` (one level), excluding dotfiles. */
export function listTopLevelDirs(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
}

/** @param {string} p */
function toPosix(p) {
  return p.split('\\').join('/');
}

/** sha256 of `text`, hex-encoded. */
export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Strip the frontmatter delimiter noise from a gray-matter body for hashing/heading extraction. */
export function firstHeading(body) {
  const match = /^#\s+(.+)$/m.exec(body);
  return match ? match[1].trim() : null;
}

export const posixJoin = posix.join;

/**
 * Group a flat list of `{ reason, ... }` failures by their `reason` string,
 * the same shape the audit report and `build-catalog` both print. Keeps every
 * caller's "collect everything, don't stop at the first failure" report
 * formatted identically.
 *
 * @template {{ reason: string }} T
 * @param {T[]} failures
 * @returns {Map<string, T[]>}
 */
export function groupByReason(failures) {
  /** @type {Map<string, T[]>} */
  const groups = new Map();
  for (const failure of failures) {
    const list = groups.get(failure.reason) ?? [];
    list.push(failure);
    groups.set(failure.reason, list);
  }
  return groups;
}

/**
 * @param {string} label
 * @param {Array<{ repo?: string, sourcePath: string, reason: string }>} failures
 * @param {number} maxExamples
 */
export function printGroupedFailures(label, failures, maxExamples = 8) {
  console.error(`${label}: ${failures.length} failure(s)`);
  const groups = groupByReason(failures);
  for (const [reason, entries] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.error(`- ${entries.length}× ${reason}`);
    for (const entry of entries.slice(0, maxExamples)) {
      console.error(`    ${entry.repo ? `[${entry.repo}] ` : ''}${entry.sourcePath}`);
    }
    if (entries.length > maxExamples) {
      console.error(`    ... and ${entries.length - maxExamples} more`);
    }
  }
}
