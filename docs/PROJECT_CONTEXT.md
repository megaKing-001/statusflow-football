# Status Football — Project Context

## What This Is
Status Football is a football club-management and automatic simulation
game. The player is the manager/owner of a club — not a footballer.
There is no direct/manual control of players on the pitch (no joystick,
no manual passing/shooting/dribbling). The player makes management
decisions (squad, tactics, training, transfers, facilities) and watches
an automated match simulation play out.

Core loop:
create club → manage squad/tactics → play match → watch simulation →
receive result → earn virtual rewards → improve club → repeat.

## What This Is NOT
- NOT a betting or wagering product. No real-money stakes against a
  chance outcome, ever. This is a hard legal/regulatory boundary, not a
  style choice.
- NOT a direct-control football game (no PES/Dream League-style play).
- NOT themed around restaurants/banking/real companies — "Cooking
  Fever" is referenced ONLY for its progression/upgrade/reward
  philosophy, not its theme.
- NOT a continuation of the old StatusFlow Gaming wager-based football
  module. That codebase's wallet-ledger / PvP-stake-escrow schema and
  economic model do not apply here and must not be assumed to carry
  over.

## Relationship to StatusFlow
Status Football is the football gaming project associated with the
larger StatusFlow ecosystem, but should be referred to as "Status
Football," not "StatusFlow Gaming," except when specifically discussing
that relationship.

Decision made 2026-09-15: Status Football uses its OWN, fully separate
Supabase project — not the existing StatusFlow Auth/user base. See
ARCHITECTURE.md for the reasoning and DATABASE.md for connection
details. Shared login between StatusFlow products is a possible future
feature, not a current dependency.

## Source of Truth
The Master Project Brief (sections 1–40, in Project Knowledge) defines
the full intended game concept, phases, and long-term scope. This file
is the short orientation summary; the brief is authoritative for detail.
If code and brief conflict, the conflict must be identified and
discussed — not silently resolved by rewriting either one.

## Current Phase
Phase 0 → Phase 1 transition: no application code has been written yet.
A new, empty Supabase project has just been created. The immediate
target is the Phase 1 loop only:

create club → starter squad → select starting XI → formation/tactics →
start match → watch simulation → result → coins + league points →
league table update.

Everything else in the brief (transfers, training depth, facilities,
social/PvP, monetization) is explicitly deferred — see brief sections
31 and 38.

## Non-Negotiable Constraints (see DEVELOPMENT_RULES.md for detail)
- No real-money wagering, ever.
- Server authority: match results, currency, and progression are never
  trusted from the client.
- Every state-changing function needs an idempotency key and replay
  safety.
- Development happens on Android via Termux; Turbopack does not work on
  this hardware — Next.js runs with `next dev --webpack`.
