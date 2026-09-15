# Status Football — Architecture

Last updated: 2026-09-15

## Stack
- Next.js 16.3.4, TypeScript
- Supabase (Postgres 17, Auth, Realtime)
- Deployment target: Netlify (or similar) — TBD when we get there
- Dev environment: Android via Termux
  - Turbopack does NOT work on this Android ARM64 setup
  - `next dev` MUST run with `--webpack` — set in package.json's dev
    script, not passed manually each time

## Supabase Project
- Name: status-football
- Project ref: hmjsokalctyrquftyxob
- URL: https://hmjsokalctyrquftyxob.supabase.co
- Region: eu-west-1
- Fully separate from the existing StatusFlow platform project
  (gvnztolqefkfbcartlnr). No shared auth.users, no shared schema.
  If shared login is ever wanted, that is a deliberate future decision,
  not a default — see PROJECT_CONTEXT.md.

## Request Flow (Server Authority)
Per brief section 36: match results, currency changes, purchases, and
progression are NEVER trusted from the client. Concrete flow:

Browser (Next.js client component)
  calls Server Action, no user id passed manually
Next.js Server Action
  auth.getUser() on the user's own session — confirms WHO is calling
  then calls privileged RPC using a service-role client
lib/supabase/service.ts (server-only, service_role key)
  invokes Postgres function
Postgres function (SECURITY DEFINER)
  does the actual state change (currency, squad, match result)
  callable ONLY by service_role — verify with has_function_privilege,
  never assume; must NOT be callable by authenticated or anon
Response returns to Server Action, then back to client

Key rule: the client can say "I want to start this match" but never
"user X's coins are now Y." The server derives the user ID from the
verified session and the database function computes the result; the
client only ever receives outcomes, never dictates them.

## Two Supabase Clients
- lib/supabase/browser.ts — anon/publishable key, used in client
  components, respects RLS, safe to expose.
- lib/supabase/service.ts — service_role key, import 'server-only'
  at the top, NEVER imported into any client component, used only
  inside Server Actions / route handlers for privileged RPC calls.

## Idempotency
Every state-changing RPC (currency, squad state, match results) accepts
a client-generated idempotency key. The key is generated ONCE at the
point of user intent (e.g. the moment the Start Match button is
pressed) and reused on any retry of that same action — never
regenerated per network attempt, or a retry silently becomes a
duplicate action. Replay behavior (what the function returns on a
duplicate hit, not just whether it mutates data again) must be tested
explicitly.

## Realtime
Tables are NOT in the supabase_realtime publication by default.
Any table needing live updates (fixture results, league table changes,
match event streams) requires:

ALTER PUBLICATION supabase_realtime ADD TABLE table_name;

Filtered subscriptions (e.g. user_id=eq.X) additionally require
REPLICA IDENTITY FULL on that table, or filtered UPDATE/DELETE events
will silently never arrive. Both must be verified explicitly per table,
not assumed.

## Simulation Engine vs Renderer (brief section 14)
These are kept logically separate:
- Simulation engine: decides what happens (produces a match event
  timeline — goals, cards, substitutions, with minute markers).
- Match renderer: visually shows what happened, driven entirely by
  the event timeline the simulation engine produced.
The renderer must never independently decide match outcomes; it only
interprets and animates events already decided server-side.

## Conceptual Data Flow (brief section 28)
USER, then NEXT.JS UI, then GAME SERVICES, then MATCH SIMULATION ENGINE,
then MATCH EVENTS / RESULT, then DATABASE, then MATCH VIEWER.

## Rendering Approach (brief section 29)
First version: lightweight 2D, top-down pitch representation in-browser.
No 3D engine in the first pass. Visual quality improves after the
gameplay loop is solid — gameplay/simulation correctness comes first.
