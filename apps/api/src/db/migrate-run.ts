/**
 * migration:run — programmatic wrapper.
 *
 * Why not `typeorm-ts-node-esm`? It transitively requires `ts-node`. This
 * repo's standard for executing TypeScript is `tsx`, which is already a
 * devDependency at the workspace root. Pulling ts-node in just for the CLI
 * is needless; programmatic use of the DataSource API is the same shape
 * the framework already documents in its `data-source-options` example.
 *
 * Usage: pnpm --filter @corpus/api migration:run
 */
import { buildDataSource } from './data-source.js';

async function main() {
  const dataSource = await buildDataSource();
  await dataSource.initialize();
  try {
    const ran = await dataSource.runMigrations({ transaction: 'each' });
    if (ran.length === 0) {
      console.log('migration:run — no migrations pending');
    } else {
      for (const m of ran) console.log(`migration:run — applied ${m.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(String(err?.stack ?? err));
  process.exit(1);
});
