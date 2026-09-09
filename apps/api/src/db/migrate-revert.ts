/**
 * migration:revert — programmatic wrapper. See migrate-run.ts for why this
 * is not the TypeORM CLI.
 *
 * Usage: pnpm --filter @corpus/api migration:revert
 */
import { buildDataSource } from './data-source.js';

async function main() {
  const dataSource = await buildDataSource();
  await dataSource.initialize();
  try {
    // Revert the most-recently-applied migration.
    await dataSource.undoLastMigration({ transaction: 'each' });
    console.log('migration:revert — last migration reverted');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(String(err?.stack ?? err));
  process.exit(1);
});
