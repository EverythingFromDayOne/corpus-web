export const REPOS = ['nextjs', 'react', 'angular', 'nestjs'] as const;
export type RepoId = (typeof REPOS)[number];

export function isRepoId(value: string): value is RepoId {
  return (REPOS as readonly string[]).includes(value);
}
