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

## Session Update — Fixtures, Matches, League Foundation

### Schema decisions made
- NPC clubs: `clubs.owner_id` is now nullable, added `is_npc` boolean.
  A check constraint enforces: NPC clubs always have owner_id=null,
  human clubs always have an owner. Partial unique index keeps "one
  club per real owner" without blocking multiple NPC clubs.
- Leagues are personal-per-player, not shared/global. Each player's
  league = their club + all current NPC clubs, generated once at
  onboarding. `leagues.owner_profile_id` enforces one league per
  player via a partial unique index.

### New tables (all RLS-enabled, public read-only)
leagues, league_members, fixtures, matches, league_standings,
league_creation_log (service_role-only, no public read — internal
idempotency ledger).

fixtures/matches/league_standings added to supabase_realtime
publication with REPLICA IDENTITY FULL.

### New RPCs (all service_role-only, SECURITY DEFINER)
- generate_starter_squad_for_club(club_id) — extracted helper, used
  by both human and NPC club creation
- create_npc_club(name, abbreviation, stadium_name)
- create_league_with_fixtures(owner_profile_id, name, club_ids[],
  idempotency_key) — round-robin fixture generator
- onboard_new_manager(owner_id, club_name, abbreviation,
  stadium_name, idempotency_key) — the one the frontend calls:
  creates club + squad + personal league + fixtures atomically

### Seeded data
7 NPC clubs, 19 players each: Riverside Athletic, Ironbridge FC,
Harbour City, Vale Rangers, Northgate United, Castlefield Town,
Summit Rovers.

### Bugs caught during testing (fixed same session)
1. Column ambiguity: RPC output column `league_id` collided with a
   table column reference inside the function body.
2. matches.fixture_id was missing ON DELETE CASCADE to fixtures.

### Next up
Design match simulation engine (Master Brief section 13-14):
player/team/tactical/match factors, controlled randomness, weaker
team can occasionally win but not too often.

## Session Update — Match Simulation Engine

### New functions (all service_role-only, SECURITY DEFINER)
- generate_default_squad_selection_for_club(club_id, formation,
  mentality) — auto-picks best 11 by overall (always includes exactly
  1 GK). Wired into create_npc_club and onboard_new_manager so every
  club always has a valid squad_selections row from creation.
- get_club_match_ratings(club_id) — reads starting XI + mentality,
  returns attack/defense/midfield numbers. Mentality modifiers baked
  in here (attacking: +8% attack/-6% defense, defensive: reverse,
  balanced: no change).
- simulate_match(fixture_id, idempotency_key) — the engine. 18 x
  5-minute segments, weighted chance-of-chance per segment based on
  relative attack+midfield strength with per-segment random noise
  (0.75-1.25x) for controlled variance. Home advantage: +4% to home
  attack/midfield only. Goal conversion probability =
  0.15 + 0.35 * (attacker_strength / (attacker+defender_strength)).
  Also generates yellow cards (flavor, ~4%/segment), half-time/
  full-time markers. Updates matches, fixtures.status, and both
  clubs' league_standings atomically in one transaction.

### Statistical validation (900 trials via a temporary test function)
- Big favorite (88 vs 42 overall) at home: 69% win / 21% draw / 10%
  upset for the underdog.
- Same favorite away from home: still ~68% win — confirms home
  advantage is a nudge, not a game-changer.
- Evenly matched clubs: 42% home win / 24% draw / 34% away win,
  ~3.3 total goals/match — realistic spread for "medium variance."

### End-to-end test (real fixture through the real RPC)
Happy path, replay safety (same idempotency key = same result, no
double-counted standings), duplicate-completion rejection (different
key on an already-completed fixture correctly errors), unauthorized
caller rejection all confirmed. Test league/fixtures/matches cleaned
up afterward — no test data left in the database.

### Known gap (not blocking, flagged for Phase 2)
Only "mentality" is wired into the match maths right now. Pressing,
tempo, and defensive line exist as brief concepts but aren't in the
simulation yet — intentional, per "balance the core loop first."

### Next up
Next.js server actions to call onboard_new_manager and
simulate_match. Frontend not started yet.

## Session: Frontend Build (Auth → Onboarding → Core Screens)

Built and verified end-to-end in the browser (Termux/Android, Next.js
App Router):

- Design system: dark green-tinted theme (`night`/`surface`/`pitch`/
  `gold`/`chalk`/`mist`/`alert` tokens in `app/globals.css`), Bebas Neue
  (display) + Inter (body) via `next/font/google`, shared primitives in
  `components/ui/` (Button, Badge, StatRow, SectionLabel).
- App shell: `app/(app)/` route group with a single `layout.tsx` doing
  the auth guard (redirect to /login) + Header + BottomNav (Home/Squad/
  Fixtures/Club/More), replacing the per-page auth checks.
- Onboarding: `components/OnboardingForm.tsx` calls the existing
  `onboardManager()` action → `onboard_new_manager` RPC. Idempotency key
  generated once via `useState(() => crypto.randomUUID())`, not
  regenerated per submit.
- Dashboard (`app/(app)/dashboard/page.tsx`): branches on whether the
  user owns a club (shows OnboardingForm if not). Shows club header,
  next-fixture hero card, league position/record/points, squad summary,
  last 3 results — all live Supabase reads, nothing fabricated.
- Fixtures (`app/(app)/fixtures/page.tsx`): upcoming/completed lists for
  the player's own 7 fixtures. Next scheduled fixture gets a real
  "Simulate Match" button wired to `components/PlayMatchButton.tsx` →
  `playMatch()` action.
- Club/League Table (`app/(app)/club/page.tsx`): full 8-club standings,
  sorted points → GD → goals for, own row highlighted.
- Squad (`app/(app)/squad/page.tsx`): Starting XI + Bench, grouped by
  position order (GK→CB/LB/RB→CDM/CM/CAM→LW/RW/ST), sorted by overall
  within group. No formation editor yet (Tactics screen, still to build).

### Bugs Found & Fixed This Session

1. **Supabase API key migration.** This project's `.env.local` had a
   `service_role` legacy JWT that no longer worked ("Invalid API key")
   because the Supabase project had migrated to the new key system
   (`sb_publishable_...` / `sb_secret_...`). Fix: replaced
   `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` with the `sb_secret_...`
   key from Dashboard → Project Settings → API Keys → Secret keys.
   LESSON: if "Invalid API key" recurs, check whether `.env.local`'s
   anon key matches the dashboard's current publishable key first —
   mismatch there means the whole file is stale from before a rotation.

2. **`clubs` table had no public-read RLS policy.** Only had
   `clubs_select_own` (`auth.uid() = owner_id`), meaning a player could
   read their own club but not opponents' names — silently broke
   fixture/dashboard opponent display (showed "TBD"). Fixed by dropping
   that policy and adding `clubs_public_read` (`using (true)`),
   consistent with the public-read pattern already used on fixtures/
   matches/league_standings/leagues. No sensitive data in this table;
   write access unaffected (still RPC-only).

3. **Onboarding form didn't trim whitespace.** Club name/abbreviation/
   stadium name saved with trailing spaces from the input fields. Fixed
   in `OnboardingForm.tsx` by calling `.trim()` on all three values at
   the `onboardManager()` call site. One already-created production club
   row was cleaned up directly via SQL `trim()` update.

### New RPC: simulate_matchday

Problem: personal leagues have exactly 1 human club + 7 NPCs, but only
the human's own fixtures ever got simulated (via button clicks) — the
21 NPC-vs-NPC fixtures per season never ran on their own, so the league
table looked frozen/lopsided for every club except the player's.

`simulate_matchday(p_fixture_id uuid, p_idempotency_key text)` —
SECURITY DEFINER, service_role-only, wraps the existing tested
`simulate_match()` without modifying it:
1. Simulates the given fixture using the passed idempotency key
   (unchanged behavior/replay-safety from `simulate_match`).
2. Loops over other `scheduled` fixtures in the same league+matchday
   where both clubs have `is_npc = true`, simulating each with a
   deterministic key (`'npc-auto-' || fixture_id`) — naturally
   replay-safe since already-completed siblings are excluded by the
   `status = 'scheduled'` filter before the key is ever checked again.
Returns the primary result plus `npc_fixtures_simulated` count.

Tested on isolated throwaway data (2 temp NPC clubs + 2 real NPCs, 4-club
league): happy path (sibling correctly simulated, count=1), matchday
isolation (other matchdays untouched), replay safety (was_replay=true,
count=0, no double-counted standings). All temp data cleaned up after
— confirmed back to 7 NPC clubs, 0 leftover test leagues.

`lib/actions/match.ts`'s `playMatch()` now calls `simulate_matchday`
instead of `simulate_match` directly — same return shape, so no other
frontend changes needed.

**Production backfill:** the real player's (Megamind FC) league had 21
already-scheduled NPC-vs-NPC fixtures left over from before this RPC
existed (matchdays 1-7 where only Megamind's own game had been played).
Ran a one-off `DO` block calling `simulate_match()` directly on all of
them with the same deterministic key scheme. Confirmed after: all 8
clubs at played=7, realistic varied standings, no impact on Megamind's
already-completed results.

### Backfilled Note: Earlier Simulation Validation (undocumented until now)

From the session that built the match engine, two validation results
were run but never written down:
- Mentality modifiers confirmed mathematically consistent: attacking/
  defensive/balanced attack-defense values all derive correctly from
  the same balanced base rating for a given club.
- 7-club/21-fixture mini-season simulated end-to-end via direct RPC
  calls: all standings reconciled exactly (wins+draws=total matches,
  each club's W/D/L/points arithmetic verified correct).

### Next Up
- Tactics/Formation editor (change starting XI, formation, mentality —
  currently only the auto-generated default from onboarding exists).
- Animated 2D match viewer (Simulate Match currently gives an instant
  result with no visual playback).
- Training/Facilities/Transfers placeholders (Phase 2, no backend yet).

## Session Update — Tactics Editor & Player Renaming

### New components
- `components/TacticsEditor.tsx` (154 lines) — formation/mentality editor
  and starting XI/bench toggle, writing directly to `squad_selections`
  (client-side write, permitted per the existing design: management
  decisions use RLS + trigger validation, not RPC-only).
- `components/PlayerNameEditor.tsx` — client component, inline rename
  UI (click name → input + Save/Cancel). Calls `renamePlayer()` from
  `lib/actions/player.ts`, which verifies the session via
  `auth.getUser()` first, then calls the `rename_player` RPC through
  `createServiceClient()`.

### New RPC
- `rename_player` (SECURITY DEFINER, service_role-only) — verifies
  club ownership server-side before renaming. Tested directly via SQL:
  happy path, wrong-owner rejection, empty-name rejection all passed.

### Integration
- `app/(app)/squad/page.tsx` patched: removed the local `PlayerRow`
  function, both Starting XI and Bench lists now render
  `PlayerNameEditor` per player instead.

### Live browser testing (first live test of squad_selections RLS write)
- `/squad`: rename flow tested — save persists after refresh, empty
  name correctly blocked with inline error.
- `/squad/edit` (Tactics editor): toggled starters/bench, changed
  formation and mentality, saved. Confirmed round-trip by navigating
  back to `/squad` and verifying the updated formation/mentality label
  and starting XI/bench lists reflected the change — this was the
  first live exercise of a direct client write to `squad_selections`
  and it worked as designed.

### Next up
Continue Phase 2 planning items (training, transfers, facilities) or
further Phase 1 polish — not yet decided.
