import { defineDocs } from 'fumadocs-mdx/macro';
import { loader } from 'fumadocs-core/source';
import { z } from 'zod';

/**
 * Corpus articles put the title in the H1, not in frontmatter. Fumadocs'
 * default schema requires `title`; loosen it so a real nextjs-concepts file
 * can compile. Adapters in @corpus/content-schema remain the contract.
 */
const docs = defineDocs({
  dir: '../../content/nextjs/docs',
  docs: {
    files: ['concepts/caching/cache-components-model.md'],
    schema: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .passthrough(),
  },
});

export const source = loader({
  baseUrl: '/en/concepts/nextjs',
  source: docs.toFumadocsSource(),
});
