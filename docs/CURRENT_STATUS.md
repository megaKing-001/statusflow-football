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
- [ ] First database schema: clubs, players, squads (see DATABASE.md
      once drafted)
- [ ] First SECURITY DEFINER RPC written and tested at SQL level
- [ ] Phase 1 vertical slice: create club → starter squad → select XI →
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
