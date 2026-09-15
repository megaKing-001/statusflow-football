# Status Football — Current Status

Last updated: 2026-09-15

## Where We Are
Phase 0 (setup) → Phase 1 (playable foundation) transition.

- [x] Master Project Brief established (Project Knowledge)
- [x] Decision made: new, fully separate Supabase project (not shared
      with existing StatusFlow Auth/user base)
- [x] Supabase project created: `status-football`
      - Project ref: hmjsokalctyrquftyxob
      - Region: eu-west-1
      - Confirmed empty (no tables) as of creation
- [x] Local project folder created: ~/status-football (separate from
      ~/statusflow-gaming and ~/statusflow-gaming-old — those are NOT
      touched or reused)
- [x] docs/ folder created, documentation in progress
- [x] .env.local created with Supabase URL + keys
- [x] Next.js project scaffolded (next dev --webpack, per environment
      constraints)
- [x] Git repo initialized, .gitignore confirmed to exclude .env.local
- [x] profiles + clubs tables created with RLS, tested (see below)
      once drafted)
- [x] players table created with RLS + check constraints, tested
- [x] create_club_with_starter_squad RPC written, tested, working —
      Phase 1 vertical slice in progress: create club → starter squad → select XI →
      formation/tactics → start match → simulate → result → coins/
      league points → league table update

## No Code Written Yet
This is a genuine reset. Nothing from ~/statusflow-gaming should be
copied in by assumption — if something from that codebase turns out to
be reusable (a UI component, a utility function), that must be a
deliberate, discussed decision, not a default.

## Immediate Next Steps (in order)
1. Finish remaining docs: ARCHITECTURE.md, DATABASE.md,
   DEVELOPMENT_RULES.md
2. Scaffold Next.js app in ~/status-football
3. Wire up Supabase client (anon/publishable key for browser,
   service_role key for server-only code, per ARCHITECTURE.md)
4. Design and migrate the first minimal schema (clubs + players +
   squads) directly in Supabase, test via SQL before any UI
5. Build Phase 1 loop end to end, one step at a time

## Open Questions / Not Yet Decided
- Exact starter squad size/composition and attribute ranges
- Match simulation engine's first-pass algorithm (see brief section 13)
- Whether league table MVP uses 8 fictional clubs as suggested in brief
  section 20, or fewer for the very first playable slice

## Tested: profiles + clubs RLS (2026-09-15)
Verified directly via SQL against the live Supabase project:
- RLS enabled on both tables
- A user can SELECT only their own club (rival club invisible)
- Direct INSERT into clubs from an authenticated role is blocked
- Direct UPDATE of a user's own club (e.g. coins) is silently blocked —
  zero rows affected, confirming the anti-pay-to-win / server-authority
  rule holds even for a legitimately authenticated attacker
- Test data created and cleaned up afterward; clubs table confirmed
  empty again post-test

players, squad_selections, fixtures, matches, league_table tables are
not yet created — next up.

## Tested: players table (2026-09-15)
Verified directly via SQL against the live Supabase project:
- RLS enabled, one SELECT policy (own club's players only)
- Cross-club isolation confirmed: user 1 cannot see user 2's player
- No insert/update/delete policies for client roles — player creation
  and attribute changes happen only via service-role RPCs
- Check constraint rejects invalid position values (e.g. "QUARTERBACK")
- Check constraint rejects out-of-range attributes (e.g. pace = 150)
- Test data created and cleaned up afterward

squad_selections, fixtures, matches, league_table tables not yet
created — next up is either those, or the first SECURITY DEFINER RPC
(create_club_with_starter_squad) that will use profiles/clubs/players
together.

## Tested: create_club_with_starter_squad RPC (2026-09-15)
SECURITY DEFINER function, callable only by service_role (verified via
has_function_privilege AND a direct denied-call test as authenticated).

Bug caught and fixed during testing: initial version had a column name
collision (`club_id` used as both the RETURNS TABLE output name and a
column reference inside the function body), causing "ambiguous column"
errors. Fixed by qualifying table references with an alias. This is
exactly the kind of bug the "test at SQL level before frontend" rule
exists to catch.

Verified via direct SQL testing:
- Happy path: creates 1 club + 19 starter players in the correct
  position distribution (2 GK, 3 CB, 2 LB, 2 RB, 2 CDM, 2 CM, 2 CAM,
  1 LW, 1 RW, 2 ST)
- Idempotent replay: calling again with the SAME idempotency key
  returns the same club_id and player_count with was_replay=true,
  confirmed no duplicate club or players were created underneath
- Second attempt with a DIFFERENT idempotency key for a user who
  already has a club is correctly rejected, and confirmed to leave
  zero partial/orphaned rows (transaction rolled back cleanly)
- Direct call as `authenticated` role is rejected with "permission
  denied" — confirms the function is truly service_role-only, not
  just documented as such
- Test data created and cleaned up afterward

## Fixed: GK Overall Rating (2026-09-15)
Replaced the flat 6-attribute average with a position-weighted formula.
GK now weights defending (30%), physical (25%), passing (20%), pace
(10%), dribbling (10%), shooting (5%) — de-emphasizing attributes
irrelevant to a keeper's role. Outfield positions similarly weighted
toward their relevant attributes (e.g. attackers weight shooting/pace/
dribbling highest, defenders weight defending highest).

Retested: GK overall now averages ~44, in line with outfield range of
~48-54 (was ~35 before the fix, a clear outlier). Privilege lockdown
(anon/authenticated denied, service_role only) reverified after the
function was recreated. Full happy-path + position-distribution test
rerun successfully, test data cleaned up afterward.
Flagging now rather than letting it silently skew squad balance later.

## Tested: squad_selections table (2026-09-15)
Design choice: unlike clubs/players, this table allows direct client
writes (not RPC-only) since it's a management decision, not a
currency/progression change. Integrity is enforced by RLS (ownership)
plus a BEFORE INSERT/UPDATE trigger (validate_squad_selection) that
checks real football rules at the database level.

Verified via direct SQL testing:
- Happy path: user creates own squad selection (11 starters, 8 bench,
  valid formation/mentality) successfully
- Wrong starter count (10 instead of 11) rejected by the trigger
- Invalid formation (not in the allowed list) rejected by check
  constraint
- Cross-club player theft blocked on TWO independent layers:
  1. RLS on players table means a user cannot even read another
     user's player IDs to begin with
  2. Even with a hardcoded/leaked foreign player ID (fetched via
     elevated access to simulate this), the validation trigger
     independently rejects it — genuine defense in depth, not reliant
     on a single layer
- Cross-user read isolation confirmed: user 2 cannot see user 1's
  squad selection
- Test data created and cleaned up afterward

squad_selections is the last table needed before fixtures/matches.
Next: fixtures + matches tables, then the match simulation engine
itself (brief sections 13-14) — the biggest remaining piece of Phase 1.
