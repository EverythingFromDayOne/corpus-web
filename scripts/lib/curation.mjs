/**
 * curation.mjs
 *
 * Loads hand-authored curation from `curation/` in THIS repo — never from
 * `content/`. Paths are a thin ordered-list-of-existing-articles layer; they
 * own no content. See `packages/content-schema/src/curation.ts`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { PathDefinition } from '../../packages/content-schema/src/index.ts';

/**
 * @param {string} curationDir absolute path to `curation/`
 * @returns {import('../../packages/content-schema/src/index.ts').PathDefinition[]}
 */
export function loadPathDefinitions(curationDir) {
  const pathsDir = join(curationDir, 'paths');
  if (!existsSync(pathsDir)) return [];

  const files = readdirSync(pathsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  return files.map((file) => {
    const raw = readFileSync(join(pathsDir, file), 'utf8');
    let data;
    try {
      data = YAML.parse(raw);
    } catch (err) {
      throw new Error(`curation/paths/${file}: YAML parse error: ${err.message}`);
    }
    const parsed = PathDefinition.safeParse(data);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'} ${i.message}`).join('; ');
      throw new Error(`curation/paths/${file}: ${issues}`);
    }
    return parsed.data;
  });
}
