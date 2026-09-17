import { Controller, Get, Inject, Injectable, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TerminusModule,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

/**
 * Liveness vs readiness — the explicit split the PR body refers to.
 *
 *   GET /healthz/live  — process is up. Touches nothing but the event loop.
 *                        Returns 200 even when the database is down, because
 *                        "the API process is fine" is the only honest answer
 *                        for "is this pod alive?".
 *
 *   GET /healthz/ready — process can serve traffic. Probes the DB connection
 *                        via Terminus + TypeOrmHealthIndicator.pingCheck. On DB
 *                        outage: 503. The orchestrator scales us out, the
 *                        load balancer marks us down, and the static site
 *                        keeps serving because content never lives here.
 *
 * The split exists for one reason: the API never sits in the read path for
 * an article body. Postgres holds state, not content. A DB outage degrades
 * the API without implying the site is down.
 *
 * Swagger: both endpoints are decorated `@ApiTags('health')` so the
 * generated client can find them.
 *
 * `@Inject(...)` is EXPLICIT on both controllers' constructors on purpose,
 * not stylistic. `tsx`/esbuild (the `start:dev` runtime) never implements
 * TypeScript's `emitDecoratorMetadata` — no type checker, so no
 * `design:paramtypes` for implicit constructor-type DI. `tsc` (the
 * production build path) does emit it. That split left both `LiveService`
 * and `HealthCheckService`/`TypeOrmHealthIndicator` `undefined` at
 * runtime under `pnpm start:dev` — both healthz endpoints 500'd — while
 * `pnpm build` + no guard-level spec existed to catch it either. Found
 * 2026-09-17 alongside the identical `SessionAuthGuard` bug (D26 A.3
 * follow-up). `@Inject()` sidesteps `design:paramtypes` entirely — safe
 * under both runtimes.
 */

@Injectable()
class LiveService {
  health(): { status: 'ok'; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }
}

@ApiTags('health')
@Controller('healthz/live')
class LiveController {
  constructor(@Inject(LiveService) private readonly live: LiveService) {}

  @Get()
  check(): { status: 'ok'; uptimeSeconds: number } {
    return this.live.health();
  }
}

@ApiTags('health')
@Controller('healthz/ready')
class ReadyController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(TypeOrmHealthIndicator) private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  // pingCheck runs a real `SELECT 1` — proves we are past connection
  // bootstrap. A successful `forRootAsync` does not prove we can talk
  // to Postgres; only a query does.
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
    ]);
  }
}

@Module({
  // `TerminusModule` ships `HealthCheckService` and the executor logger
  // providers globally within this module.
  imports: [TerminusModule],
  controllers: [LiveController, ReadyController],
  providers: [LiveService, TypeOrmHealthIndicator],
})
export class HealthModule {}

// Re-export the controllers and module under one barrel so AppModule
// only has to import the module.
export { HealthModule as default };
export const HealthModuleControllers = [LiveController, ReadyController];
export const HealthModuleProviders = [LiveService, TypeOrmHealthIndicator];
