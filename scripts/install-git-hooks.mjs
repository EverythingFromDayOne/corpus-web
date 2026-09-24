#!/usr/bin/env node
/**
 * Copies scripts/git-hooks/pre-commit into .git/hooks/pre-commit.
 * No extra package (husky) — a missing hook is a missing gate.
 *
 * Worktree-aware: resolves the real gitdir when `.git` is a worktree pointer
 * file (97-byte `gitdir: <path>` text). In that case hooks live in the parent
 * repo's shared `.git/hooks/`, not in the worktree's `.git/hooks/`. Without
 * this, mkdirSync('join(.git, "hooks")') raises ENOTDIR errno -20.
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const src = join(ROOT, 'scripts', 'git-hooks', 'pre-commit');
const gitEntry = join(ROOT, '.git');

if (!existsSync(src)) {
  console.error('install-git-hooks: missing scripts/git-hooks/pre-commit');
  process.exit(1);
}

let realGitDir;
try {
  const st = statSync(gitEntry);
  if (st.isDirectory()) {
    realGitDir = gitEntry;
  } else if (st.isFile()) {
    // Worktree pointer: `gitdir: /abs/path/to/.git/worktrees/<name>`
    const m = readFileSync(gitEntry, 'utf8').match(/^gitdir:\s*(.+)\s*$/m);
    if (!m) {
      console.warn(`install-git-hooks: ${gitEntry} is a regular file but not a gitdir pointer; skipping`);
      process.exit(0);
    }
    // The pointer points at `.git/worktrees/<name>`; the shared gitdir is its grandparent.
    realGitDir = dirname(dirname(resolve(ROOT, m[1])));
  } else {
    console.warn(`install-git-hooks: ${gitEntry} is neither directory nor file; skipping`);
    process.exit(0);
  }
} catch (err) {
  if (err.code === 'ENOENT') {
    console.warn('install-git-hooks: no .git directory; skipping');
    process.exit(0);
  }
  throw err;
}

const destDir = join(realGitDir, 'hooks');
const dest = join(destDir, 'pre-commit');

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
chmodSync(dest, 0o755);
console.log(`install-git-hooks: installed ${dest.replace(ROOT + '/', '')}`);
