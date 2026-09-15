# Status Football — Development Rules

Last updated: 2026-09-15

## Non-Negotiables
1. No real-money wagering, ever. Virtual currency is never staked
   against a chance outcome for real-money payout. This keeps the
   project outside gambling regulation entirely.
2. Server authority. Match results, currency changes, purchases, and
   progression are never trusted from the client. All state-changing
   logic lives in SECURITY DEFINER Postgres functions, callable only
   by service_role.
3. Idempotency. Every state-changing function accepts a client-
   generated idempotency key, created once at the point of user intent
   and reused on retry. Replay behavior is tested explicitly.
4. Test at the database level first. Write the RPC, test it directly
   via SQL with real test data (happy path, insufficient-resource
   rejection, wrong-caller rejection, replay safety), only then write
   the frontend code that calls it.

## Workflow for Every New Feature (brief section 37)
Step 1: Inspect the current implementation.
Step 2: Explain what already exists.
Step 3: Identify what needs to be added or changed.
Step 4: Implement the smallest clean change that achieves the goal.
Step 5: Check for regressions.
Step 6: Test the feature.
Step 7: Report exactly what was changed.
Do not make large unrelated changes in the same pass.

## Before Creating Anything New
Before creating a new table, component, service, function, API, or
database structure: check whether an existing implementation already
serves the purpose. Do not duplicate.

## Termux / Android Environment
- next dev runs with --webpack (set in package.json, Turbopack doesn't
  work on this ARM64 setup).
- Use heredoc (cat > file << 'EOF' ... EOF) for any file write longer
  than one or two lines — nano has silently failed to save on long
  files before. Keep heredoc chunks short enough to fit one screen.
- After every file write, verify with wc -l / head / grep before moving
  on. Never assume a paste landed correctly.
- Confirm pwd before any multi-step or destructive command sequence.

## Git Hygiene
- .env.local is never committed. Run git status before every commit,
  not just the first.
- Personal Access Tokens, not passwords, for git push over HTTPS.
- Never edit .env.local or any secret-bearing file through GitHub's web
  interface — it must only exist locally, untracked.

## Realtime
Tables are not in the supabase_realtime publication by default. Add
explicitly per table that needs live updates, and add REPLICA IDENTITY
FULL for any filtered subscription. Verify both, don't assume.

## Source of Truth
The Master Project Brief is authoritative for game concept and scope.
If code and brief conflict: identify the conflict, explain it, decide
together whether to adapt the code or the understanding — don't
silently resolve it by rewriting either one.

## Documentation
Keep these five docs updated as architecture decisions are made:
PROJECT_CONTEXT.md, CURRENT_STATUS.md, ARCHITECTURE.md, DATABASE.md,
DEVELOPMENT_RULES.md (this file).
