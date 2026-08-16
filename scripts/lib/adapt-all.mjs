/**
 * adapt-all.mjs
 *
 * Shared "walk the four submodules and adapt every selected file" loop, used
 * by both `build-catalog.mjs` and `verify-frontmatter.mjs` so the two gates
 * can never quietly drift apart on what counts as an article.
 */
import matter from 'gray-matter';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, readGitmodules, selectArticleFiles, sha256, submoduleRef } from './corpus-fs.mjs';
import {
  ADAPTERS,
  AdapterError,
  extractSections,
  isIndexFile,
  parseArticleBody,
  RepoId,
} from '../../packages/content-schema/src/index.ts';

/**
 * @returns {{
 *   sources: Record<string, { tag: string, commit: string }>,
 *   articlesByUid: Map<string, object>,
 *   failures: Array<{ repo: string, sourcePath: string, reason: string }>,
 * }}
 */
export function adaptAllArticles() {
  const mountedRepos = RepoId.options;
  const modules = readGitmodules();

  if (modules.length !== mountedRepos.length) {
    throw new SubmoduleCountError(mountedRepos.length, modules.length);
  }

  /** @type {Record<string, { tag: string, commit: string }>} */
  const sources = {};
  /** @type {Map<string, object>} */
  const articlesByUid = new Map();
  /** @type {Array<{ repo: string, sourcePath: string, reason: string }>} */
  const failures = [];

  for (const repo of mountedRepos) {
    const mod = modules.find((m) => m.path === `content/${repo}`);
    if (!mod) throw new Error(`no .gitmodules entry for content/${repo}`);

    const repoDir = join(CONTENT_DIR, repo);
    if (!existsSync(repoDir)) {
      throw new Error(`content/${repo} is missing on disk — run \`pnpm sync:content\` first`);
    }

    sources[repo] = submoduleRef(repoDir);

    const adapter = ADAPTERS[repo];
    const { all } = selectArticleFiles(repoDir, adapter, isIndexFile);

    for (const relPath of all) {
      const raw = readFileSync(join(repoDir, relPath), 'utf8');
      const parsed = matter(raw);
      const contentHash = sha256(parsed.content);
      // One parse per file. Section anchors and the H1 title are two questions
      // about the same tree, and the adapter takes it rather than re-parsing.
      const tree = parseArticleBody(parsed.content);
      const sections = extractSections(tree);

      let article;
      try {
        article = adapter.toArticle({
          frontmatter: parsed.data ?? {},
          sourcePath: relPath,
          body: parsed.content,
          tree,
          contentHash,
          sections,
        });
      } catch (err) {
        if (!(err instanceof AdapterError)) throw err;
        failures.push({ repo, sourcePath: relPath, reason: normaliseReason(err.message) });
        continue;
      }

      if (articlesByUid.has(article.uid)) {
        const dupe = articlesByUid.get(article.uid);
        failures.push({
          repo,
          sourcePath: relPath,
          reason: `duplicate uid \`${article.uid}\` — already produced by \`${dupe.sourcePath}\``,
        });
        continue;
      }

      articlesByUid.set(article.uid, { ...article, sections });
    }
  }

  return { sources, articlesByUid, failures };
}

export class SubmoduleCountError extends Error {
  constructor(expected, actual) {
    super(`expected exactly ${expected} submodules, .gitmodules lists ${actual}`);
    this.name = 'SubmoduleCountError';
  }
}

/** Collapse a per-file source path out of an AdapterError message so identical failure types group together. */
function normaliseReason(message) {
  return message.replace(/^\[[^\]]+\]\s*[^:]+:\s*/, '').trim();
}
