import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * D69 startup migrations — runs pending TypeORM migrations at app
 * boot, before `app.listen()` accepts traffic.
 *
 * Why `OnApplicationBootstrap` and not a `beforeListen` hook:
 *   - NestJS evaluates `OnApplicationBootstrap` after `app.init()`
 *     resolves all modules (so `DataSource` is injected and ready)
 *     but before `app.listen()` begins accepting HTTP traffic. The
 *     listener is established at `listen()` time, not at
 *     `app.init()` time, so this gives us the "before traffic" window
 *     without re-implementing the bootstrap sequence.
 *   - Lifecycle hooks are the canonical place for "after DI is ready
 *     but before the world touches me" code. The alternative
 *     (`app.use(...)` in `main.ts`) runs before NestJS initializes
 *     modules — too early, `DataSource` is not yet injectable.
 *
 * Failure mode: if a migration fails to apply, NestJS throws and
 * `app.listen()` never resolves. The orchestrator sees the boot
 * timeout and keeps the old pod running (or marks the new pod as
 * failed if it's the only one). Either way, no traffic is served
 * against an un-migrated schema. The error path is honest.
 *
 * Idempotency: `runMigrations({ transaction: 'each' })` only runs
 * migrations whose names aren't already in the `migrations` table.
 * A restart after a successful boot is a no-op.
 */
@Injectable()
export class MigrationOnBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(MigrationOnBootstrap.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    // `synchronize: true` is hard-banned (see .cursor/rules/50-api-nestjs.mdc
    // line 75). The schema is owned by the migrations directory, not by
    // a runtime "compare-entities-and-DDL" pass.
    const ran = await this.dataSource.runMigrations({ transaction: 'each' });
    if (ran.length === 0) {
      this.logger.log('migration:run on bootstrap — no migrations pending');
    } else {
      for (const m of ran) this.logger.log(`migration:run on bootstrap — applied ${m.name}`);
    }
  }
}
