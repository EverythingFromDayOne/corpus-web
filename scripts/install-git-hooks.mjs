#!/usr/bin/env node
/**
 * Copies scripts/git-hooks/pre-commit into .git/hooks/pre-commit.
 * No extra package (husky) — a missing hook is a missing gate.
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const src = join(ROOT, 'scripts', 'git-hooks', 'pre-commit');
const gitDir = join(ROOT, '.git');
const destDir = join(gitDir, 'hooks');
const dest = join(destDir, 'pre-commit');

if (!existsSync(src)) {
  console.error('install-git-hooks: missing scripts/git-hooks/pre-commit');
  process.exit(1);
}

if (!existsSync(gitDir)) {
  console.warn('install-git-hooks: no .git directory; skipping');
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
chmodSync(dest, 0o755);
console.log(`install-git-hooks: installed ${dest.replace(ROOT + '/', '')}`);
