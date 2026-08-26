import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  cacheComponents: true,
  transpilePackages: ['@corpus/mdx-components', '@corpus/ui'],
  // Dev server is sometimes reached via the 127.0.2.2 loopback alias (not
  // just localhost). Next 16 blocks cross-origin HMR/chunk requests from
  // origins not in this list, which silently prevents client components
  // (e.g. TocRail) from ever hydrating — see .agents/summary.md gotcha.
  allowedDevOrigins: ['127.0.2.2', 'localhost'],
  // Next 16.3 writes AGENTS.md / CLAUDE.md into the app. Ours are generated
  // from .cursor/rules by scripts/build-agent-docs.mjs; do not let Next clobber them.
  agentRules: false,
  async redirects() {
    return [{ source: '/', destination: '/en', permanent: true }];
  },
};

export default withMDX(config);
