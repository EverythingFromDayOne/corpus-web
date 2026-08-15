#!/usr/bin/env node
/**
 * build-catalog.mjs
 *
 * Session 1 cut: verify every mounted submodule is present, count markdown
 * files, record tag + commit. Refuses to emit catalog.json until adapters are
 * reality-checked (session 2) — an empty article list is not a catalog.
 *
 * A missing or empty content set exits 1. A gate that passes on nothing is
 * broken.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const gitmodulesPath = join(ROOT, '.gitmodules');

if (!existsSync(gitmodulesPath)) {
  console.error('build-catalog: FAIL — .gitmodules is missing');
  process.exit(1);
}

const modules = parseGitmodules(readFileSync(gitmodulesPath, 'utf8'));
if (modules.length === 0) {
  console.error('build-catalog: FAIL — no submodules configured');
  process.exit(1);
}

/** @type {Record<string, { tag: string, commit: string, markdownFiles: number }>} */
const sources = {};
let totalMd = 0;

for (const mod of modules) {
  const abs = join(ROOT, mod.path);
  if (!existsSync(abs)) {
    console.error(`build-catalog: FAIL — ${mod.path} is missing`);
    process.exit(1);
  }

  const commit = git(['rev-parse', 'HEAD'], abs);
  let tag;
  try {
    tag = git(['describe', '--exact-match', '--tags', 'HEAD'], abs);
  } catch {
    console.error(`build-catalog: FAIL — ${mod.path} is not pinned to a tag`);
    process.exit(1);
  }

  const markdownFiles = countMarkdown(abs);
  totalMd += markdownFiles;
  const mount = mod.path.replace(/^content\//, '');
  sources[mount] = { tag, commit, markdownFiles };
}

if (totalMd === 0) {
  console.error('build-catalog: FAIL — no markdown files in any submodule');
  process.exit(1);
}

console.log(`build-catalog: ${totalMd} markdown file(s) across ${modules.length} submodule(s)`);
console.log(JSON.stringify({ sources }, null, 2));
console.error(
  'build-catalog: not emitting catalog.json — article adaptation is session 2. Refusing an empty article list.',
);
process.exit(1);

/**
 * @param {string} raw
 * @returns {Array<{ name: string, path: string }>}
 */
function parseGitmodules(raw) {
  /** @type {Array<{ name: string, path: string }>} */
  const out = [];
  /** @type {{ name: string, path: string } | null} */
  let current = null;
  for (const line of raw.split(/\r?\n/)) {
    const header = /^\[submodule "(.+)"\]/.exec(line);
    if (header) {
      current = { name: header[1], path: '' };
      out.push(current);
      continue;
    }
    if (!current) continue;
    const kv = /^\s*path\s*=\s*(.+?)\s*$/.exec(line);
    if (kv) current.path = kv[1];
  }
  return out;
}

/** @param {string[]} args @param {string} cwd */
function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/** @param {string} dir */
function countMarkdown(dir) {
  let n = 0;
  /** @param {string} current */
  function walk(current) {
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === '.git' || name === 'node_modules') continue;
      const full = join(current, name);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(full);
      else if (name.endsWith('.md') || name.endsWith('.mdx')) n += 1;
    }
  }
  walk(dir);
  return n;
}
