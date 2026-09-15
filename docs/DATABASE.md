# Status Football — Database

Last updated: 2026-09-15

## Status
No tables exist yet. This document describes the planned MVP schema for
the Phase 1 vertical slice only (create club through league table
update). It will expand as later phases are built — see brief sections
17-18 for transfers/facilities schema, deferred for now.

## Design Principles
- Every state-changing operation goes through a SECURITY DEFINER
  Postgres function, never direct table writes from the client.
- Every such function takes a client-generated idempotency key.
- RLS is enabled on every table; policies are written and tested
  before any frontend code touches that table.
- No table is added "just in case" — see brief section 32, don't
  create duplicate or speculative structures.

## Core Entities (Phase 1 MVP)

### profiles
One row per authenticated user. Mirrors auth.users, holds app-specific
fields that don't belong in Supabase's own auth schema.
- id (uuid, PK, references auth.users.id)
- display_name (text)
- created_at (timestamptz)

### clubs
One row per club. A user owns exactly one club in the MVP (multi-club
per user is not in scope yet).
- id (uuid, PK)
- owner_id (uuid, references profiles.id, unique — one club per user
  for now)
- name (text)
- abbreviation (text)
- primary_color (text)
- secondary_color (text)
- stadium_name (text)
- coins (integer, not null, default starting value TBD)
- reputation (integer, not null, default 0)
- created_at (timestamptz)

### players
One row per football player. Belongs to exactly one club at a time in
the MVP (no free agents / transfer market yet — deferred to Phase 2).
- id (uuid, PK)
- club_id (uuid, references clubs.id)
- name (text)
- position (text — GK/CB/LB/RB/CDM/CM/CAM/LM/RM/LW/RW/ST)
- age (integer)
- pace (integer)
- shooting (integer)
- passing (integer)
- dribbling (integer)
- defending (integer)
- physical (integer)
- overall (integer — derived/cached from the above, recomputed
  server-side on change, never client-supplied directly)
- created_at (timestamptz)

### squad_selections
Holds the current starting XI + bench + formation for a club. One
active selection per club (overwritten each time the manager changes
it, not versioned in the MVP).
- id (uuid, PK)
- club_id (uuid, references clubs.id, unique)
- formation (text — e.g. "4-4-2")
- starting_player_ids (uuid[], exactly 11 entries, validated server-side)
- bench_player_ids (uuid[])
- mentality (text — defensive/balanced/attacking)
- updated_at (timestamptz)

### fixtures
A scheduled match between two clubs (or a club and an AI opponent) in
the MVP league.
- id (uuid, PK)
- home_club_id (uuid, references clubs.id)
- away_club_id (uuid, references clubs.id, nullable if AI opponent)
- scheduled_at (timestamptz)
- status (text — scheduled/completed)
- created_at (timestamptz)

### matches
The result of a completed fixture, produced by the simulation engine.
- id (uuid, PK)
- fixture_id (uuid, references fixtures.id, unique)
- home_score (integer)
- away_score (integer)
- events (jsonb — the event timeline: minute, type, description)
- statistics (jsonb — possession, shots, cards, etc.)
- simulated_at (timestamptz)
- idempotency_key (text, unique — prevents the sim from running twice
  for the same fixture on retry)

### league_table
Either a materialized table kept in sync by the match-result function,
or a view computed from matches — decide when we get there. Columns
match brief section 21: club, played, wins, draws, losses, goals_for,
goals_against, goal_difference, points.

## Deferred (not in Phase 1 MVP)
- transfers / transfer_listings (brief section 17)
- facilities (brief section 18)
- training sessions (brief section 9-10)
- club_finances detail (brief section 26)
These will get their own DATABASE.md additions when their phase starts,
not built speculatively now.

## leagues
id, name, season_number (default 1), status (active/completed),
owner_profile_id (nullable FK -> profiles, unique when not null —
one personal league per player), created_at.

## league_members
league_id, club_id (composite PK). Which clubs belong to a league.

## fixtures
id, league_id, matchday, home_club_id, away_club_id,
status (scheduled/completed), created_at.
Check constraint: home_club_id <> away_club_id.

## matches
id, fixture_id (unique FK -> fixtures, ON DELETE CASCADE),
home_score, away_score, status, events (jsonb array),
home_stats/away_stats (jsonb), idempotency_key (unique), played_at.

## league_standings
league_id, club_id (composite PK), played, won, drawn, lost,
goals_for, goals_against, points, updated_at.

## league_creation_log
idempotency_key (PK), league_id, created_at.
Internal only — no public RLS read policy.
