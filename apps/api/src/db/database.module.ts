import { Module } from '@nestjs/common';
import { MigrationOnBootstrap } from './migration-on-bootstrap.js';

/**
 * Database module — owns the boot-time migration run (D69).
 *
 * Wraps `MigrationOnBootstrap` (which implements
 * `OnApplicationBootstrap`) in a NestJS module so NestJS instantiates
 * the service and fires the hook after `app.init()` resolves all
 * dependencies. `DataSource` is injectable here because
 * `TypeOrmModule.forRootAsync` is in `AppModule`'s `imports` — NestJS
 * hoists globally provided modules into every downstream module's
 * container.
 */
@Module({
  providers: [MigrationOnBootstrap],
})
export class DatabaseModule {}
