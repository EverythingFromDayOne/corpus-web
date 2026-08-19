import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  cacheComponents: true,
  transpilePackages: ['@corpus/mdx-components', '@corpus/ui'],
  // Next 16.3 writes AGENTS.md / CLAUDE.md into the app. Ours are generated
  // from .cursor/rules by scripts/build-agent-docs.mjs; do not let Next clobber them.
  agentRules: false,
  async redirects() {
    return [{ source: '/', destination: '/en', permanent: true }];
  },
};

export default withMDX(config);
