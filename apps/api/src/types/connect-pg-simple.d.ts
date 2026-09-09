/**
 * Ambient module declaration for `connect-pg-simple`.
 *
 * The package itself is CJS without a `.d.ts`. We only use the
 * default export as a factory taking the `express-session`
 * constructor and returning a `Store` class. The minimal shape
 * below is sufficient for `apps/api/src/config/session.ts`.
 */
declare module 'connect-pg-simple' {
  import type { Store } from 'express-session';

  interface PgSimpleOptions {
    pool: unknown;
    tableName?: string;
    createTableIfMissing?: boolean;
    schemaName?: string;
    pruneSessionInterval?: number;
    errorLog?: (...args: unknown[]) => void;
  }

  /**
   * The exported function takes the `express-session` constructor
   * and returns the `Store` class.
   */
  function connectPgSimple(session: unknown): new (options: PgSimpleOptions) => Store;

  export default connectPgSimple;
}
