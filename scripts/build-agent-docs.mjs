#!/usr/bin/env node
/**
 * build-agent-docs.mjs
 *
 * Single source of truth for agent context is `.cursor/rules/*.mdc`.
 * This script projects those rules into the tool-neutral formats other agents read:
 *
 *   AGENTS.md   — Codex, Copilot, Jules, Amp, and anything following the AGENTS.md convention
 *   CLAUDE.md   — Claude Code
 *
 * It also indexes `.claude/skills/*\/SKILL.md` into AGENTS.md and validates their
 * frontmatter, so agents without native skill support can still discover them.
 *
 * Both generated files are wrapped in markers so hand-written preamble survives regeneration.
 *
 * Usage:
 *   node scripts/build-agent-docs.mjs           write the generated files
 *   node scripts/build-agent-docs.mjs --check   exit 1 if the files are out of date (CI gate)
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const RULES_DIR = join(ROOT, '.cursor', 'rules');
const SKILLS_DIR = join(ROOT, '.claude', 'skills');
const BEGIN = '<!-- BEGIN GENERATED: do not edit below. Source: .cursor/rules/*.mdc -->';
/** Emitted BY this script into the rules dir, so it must never be read back as a source rule. */
const GENERATED_RULE = '60-skills.mdc';
const END = '<!-- END GENERATED -->';

const check = process.argv.includes('--check');

/** Minimal frontmatter parser — enough for the fields .mdc actually uses. */
function parseRule(raw, filename) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${filename}: missing frontmatter block`);

  const [, frontmatter, body] = match;
  const meta = { description: '', globs: [], alwaysApply: false };

  for (const line of frontmatter.split(/\r?\n/)) {
    const kv = /^(\w+):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();
    if (key === 'alwaysApply') meta.alwaysApply = value === 'true';
    else if (key === 'globs') {
      meta.globs = value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((g) => g.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else if (key === 'description') {
      meta.description = value.replace(/^["']|["']$/g, '');
    }
  }

  return { filename, ...meta, body: body.trim() };
}

async function loadRules() {
  if (!existsSync(RULES_DIR)) throw new Error(`missing ${RULES_DIR}`);
  const files = (await readdir(RULES_DIR))
    .filter((f) => f.endsWith('.mdc') && f !== GENERATED_RULE)
    .sort();
  if (files.length === 0) throw new Error('no .mdc rule files found');
  return Promise.all(
    files.map(async (f) => parseRule(await readFile(join(RULES_DIR, f), 'utf8'), f)),
  );
}

/**
 * Skills are task-triggered procedures; rules are always-on constraints. Only the
 * name and description are indexed — the body is loaded by the agent on demand,
 * which is the whole point of progressive disclosure.
 */
async function loadSkills() {
  if (!existsSync(SKILLS_DIR)) return [];
  const dirs = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const skills = [];
  const problems = [];

  for (const dir of dirs) {
    const file = join(SKILLS_DIR, dir, 'SKILL.md');
    if (!existsSync(file)) {
      problems.push(`${dir}/ has no SKILL.md`);
      continue;
    }
    const { description, body } = parseRule(await readFile(file, 'utf8'), `${dir}/SKILL.md`);
    const name = /^name:\s*(.+)$/m.exec(
      /^---\r?\n([\s\S]*?)\r?\n---/.exec(await readFile(file, 'utf8'))?.[1] ?? '',
    )?.[1]?.trim();

    if (!name) problems.push(`${dir}: missing 'name'`);
    else if (name !== dir) problems.push(`${dir}: name '${name}' must match the directory`);
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) problems.push(`${dir}: name must be lowercase-hyphenated`);
    else if (name.length > 64) problems.push(`${dir}: name exceeds 64 chars`);

    if (!description) problems.push(`${dir}: missing 'description'`);
    else if (description.length > 1024) problems.push(`${dir}: description exceeds 1024 chars`);
    else if (!/\bUse\s+(when|whenever|before|after|at|during|for)\b/i.test(description)) {
      problems.push(
        `${dir}: description must state a trigger ("Use when …", "Use before …", etc.)`,
      );
    }

    skills.push({ dir, name: name ?? dir, description, body });
  }

  if (problems.length) {
    console.error('✗ skill frontmatter problems:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  return skills;
}

function renderAgents(rules, skills) {
  const always = rules.filter((r) => r.alwaysApply);
  const scoped = rules.filter((r) => !r.alwaysApply);

  const lines = [
    '# AGENTS.md',
    '',
    '> **Generated file.** Do not edit. Source of truth is `.cursor/rules/*.mdc`.',
    '> Regenerate with `pnpm agents:build`. CI enforces this via `pnpm agents:check`.',
    '',
    'This file exists so the project is portable across coding agents. Cursor reads',
    '`.cursor/rules/`; most other agents read this file. Both are the same rules.',
    '',
    '---',
    '',
    '## Always-applied rules',
    '',
  ];

  for (const rule of always) {
    lines.push(`<!-- source: .cursor/rules/${rule.filename} -->`, '', rule.body, '', '---', '');
  }

  lines.push(
    '## Path-scoped rules',
    '',
    'Load the rule whose globs match the files you are editing.',
    '',
  );

  for (const rule of scoped) {
    lines.push(
      `### \`${rule.filename}\` — ${rule.description}`,
      '',
      `**Applies to:** ${rule.globs.map((g) => `\`${g}\``).join(', ') || '(unscoped)'}`,
      '',
      rule.body,
      '',
      '---',
      '',
    );
  }

  if (skills.length) {
    lines.push(
      '## Skills',
      '',
      'Task-triggered procedures in `.claude/skills/`. Rules above are always-on',
      'constraints; skills are how-to, loaded when the task matches. Read the full',
      '`SKILL.md` before acting on the matching task.',
      '',
    );
    for (const s of skills) {
      lines.push(`- **\`${s.name}\`** — ${s.description}`, `  → \`.claude/skills/${s.dir}/SKILL.md\``, '');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Cursor does not load `.claude/skills/` natively — it loads `.cursor/rules/`.
 * Emitting the skill index as an always-applied rule is what makes the same eight
 * skills reachable from Cursor without duplicating a single line of their content:
 * the index is always in context, and Cursor opens the SKILL.md on demand.
 *
 * Generated, never hand-edited. Adding a skill and running `pnpm agents:build`
 * updates Cursor and every AGENTS.md-reading agent in one step.
 */
function renderCursorSkillRule(skills) {
  const lines = [
    '---',
    'description: Index of task-triggered skills. Read the matching SKILL.md before acting.',
    'alwaysApply: true',
    '---',
    '',
    '# Skills',
    '',
    '> Generated from `.claude/skills/*/SKILL.md` by `pnpm agents:build`. Do not edit.',
    '',
    'Rules are always-on boundaries. Skills are task-triggered procedures. When a task',
    'matches a trigger below, **open and read that `SKILL.md` in full before acting**.',
    'A skill never restates a rule — it references one.',
    '',
  ];
  for (const s of skills) {
    lines.push(`## \`${s.name}\``, '', s.description, '', `Read: \`.claude/skills/${s.dir}/SKILL.md\``, '');
  }
  lines.push(
    '## Third-party skills',
    '',
    'Community skills may be installed alongside these. **Project skills win.** Where a',
    'third-party skill contradicts a `corpus-*` skill or a rule file, the project one is',
    'authoritative — report the conflict rather than silently picking one.',
    '',
  );
  return lines.join('\n');
}

function renderClaude() {
  return [
    '# CLAUDE.md',
    '',
    '> **Generated file.** Do not edit. Source of truth is `.cursor/rules/*.mdc`.',
    '> Regenerate with `pnpm agents:build`.',
    '',
    'All project rules live in [`AGENTS.md`](./AGENTS.md). Read it before doing anything else,',
    'then follow the FIRST ACTION section it contains.',
    '',
    'Task-triggered skills live in `.claude/skills/`. They are loaded automatically when a',
    'task matches; `AGENTS.md` carries an index of them for agents without skill support.',
    '',
    'Do not duplicate rules into this file. If a rule needs to change, change the matching',
    '`.cursor/rules/*.mdc` file and regenerate.',
    '',
  ].join('\n');
}

/** Replace the generated region, preserving anything above BEGIN and below END. */
function splice(existing, generated) {
  if (!existing) return `${BEGIN}\n${generated}${END}\n`;
  const b = existing.indexOf(BEGIN);
  const e = existing.indexOf(END);
  if (b === -1 || e === -1 || e < b) return `${BEGIN}\n${generated}${END}\n`;
  return existing.slice(0, b) + `${BEGIN}\n${generated}` + existing.slice(e);
}

async function emit(relPath, generated) {
  const abs = join(ROOT, relPath);
  const existing = existsSync(abs) ? await readFile(abs, 'utf8') : '';
  const next = splice(existing, generated);

  if (check) {
    if (existing !== next) {
      console.error(
        `✗ ${relPath} is out of date with .cursor/rules/. Run \`pnpm agents:build\` and commit.`,
      );
      return false;
    }
    console.log(`✓ ${relPath}`);
    return true;
  }

  if (existing !== next) {
    await writeFile(abs, next, 'utf8');
    console.log(`wrote ${relPath}`);
  } else {
    console.log(`unchanged ${relPath}`);
  }
  return true;
}

const rules = await loadRules();
const skills = await loadSkills();

/** Whole-file generated — no marker splice, since it has no hand-written preamble. */
async function emitWhole(relPath, content) {
  const abs = join(ROOT, relPath);
  const existing = existsSync(abs) ? await readFile(abs, 'utf8') : '';
  if (check) {
    if (existing !== content) {
      console.error(`✗ ${relPath} is out of date. Run \`pnpm agents:build\` and commit.`);
      return false;
    }
    console.log(`✓ ${relPath}`);
    return true;
  }
  if (existing !== content) {
    await writeFile(abs, content, 'utf8');
    console.log(`wrote ${relPath}`);
  } else {
    console.log(`unchanged ${relPath}`);
  }
  return true;
}

const results = await Promise.all([
  emit('AGENTS.md', renderAgents(rules, skills)),
  emit('CLAUDE.md', renderClaude()),
  emitWhole(join('.cursor', 'rules', GENERATED_RULE), renderCursorSkillRule(skills)),
]);

if (check && results.includes(false)) process.exit(1);
