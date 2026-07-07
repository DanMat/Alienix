-- Shared high-score backend for Dan's arcade games (Paddix, Nimix, …).
--
-- One `scores` table serves every game, namespaced by the `game` column.
-- Run this in the Supabase SQL editor once. Then copy your project URL and
-- the public "anon" key into js/config.js of each game.
--
-- Security model: the anon key is public and safe to embed. Row-level
-- security below allows anyone to READ scores and to INSERT a score only if it
-- passes basic sanity checks. Updates/deletes are not allowed for anon users.
-- (A client-side leaderboard can always be spoofed by a determined user; these
--  checks stop casual tampering, which is plenty for an arcade board.)

create table if not exists public.scores (
    id          bigint generated always as identity primary key,
    game        text        not null check (char_length(game) between 1 and 40),
    initials    text        not null check (char_length(initials) = 3),
    score       integer     not null check (score >= 0 and score < 100000000),
    stage       integer     check (stage >= 0 and stage < 1000),
    created_at  timestamptz not null default now()
);

-- Fast "top N for a game" lookups.
create index if not exists scores_game_score_idx
    on public.scores (game, score desc, created_at asc);

alter table public.scores enable row level security;

-- Anyone may read the leaderboard.
drop policy if exists "scores_public_read" on public.scores;
create policy "scores_public_read"
    on public.scores for select
    using (true);

-- Anyone may submit a score, as long as it passes the checks above
-- (the column CHECK constraints do the validation).
drop policy if exists "scores_public_insert" on public.scores;
create policy "scores_public_insert"
    on public.scores for insert
    with check (
        char_length(initials) = 3
        and score >= 0 and score < 100000000
    );
