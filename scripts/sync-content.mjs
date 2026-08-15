#!/usr/bin/env node
/**
 * sync-content.mjs
 *
 * Initialise and update every content submodule to the commit recorded in
 * this repo. Does not float to latest remote — pins stay under human control.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

execFileSync('git', ['submodule', 'update', '--init', '--recursive'], {
  cwd: ROOT,
  stdio: 'inherit',
});
