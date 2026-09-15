Long-autonomy run. Work end to end, stop only on the triggers below.

Build apps/api from the current 15-line scaffold (D26) into a
service with Google OAuth login.

Foundation: TypeORM + Postgres via Docker Compose (local only, no
hosted DB). Migrations generate/run/revert. Config validated at
boot, not first request. Health endpoint reporting service-up and
db-reachable as distinct states.

Auth: Google OAuth via Passport. users table per the architecture
doc in prompts/ — own uuid PK, google_sub unique index, not PK.
Postgres-backed session store. Cookie httpOnly, secure,
sameSite=lax, domain configurable by env. CORS credentialled with
an origin allowlist. One protected route, GET /me. Every error
path redirects with a query flag — never JSON at a browser.

Out of scope, each its own story: refresh-token rotation, RBAC,
roles, linking progress data to users, any frontend beyond a
login button.

New npm deps expected — list each with a one-line reason in the
PR body rather than stopping on each.

Stop and ask: anything needing the Google Cloud console, a DNS
record, a hosting choice, a secret in the repo, or a schema
decision beyond the users table.

Do not touch apps/web beyond a login button, the content
submodules, or CI config.

Normal session protocol. PR against develop, don't merge.

Report: what runs, what's tested, what a fresh clone must do to
get it running, and what you had to invent rather than take from
the rules.