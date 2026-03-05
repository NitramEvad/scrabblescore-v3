-- Create the games table
create table if not exists public.games (
  id               uuid primary key default gen_random_uuid(),
  game_date        timestamptz not null default now(),
  player1          text not null,
  player2          text not null,
  player1_score    integer not null,
  player2_score    integer not null,
  winner           text,
  turns            jsonb not null default '[]',
  duration_minutes integer not null default 0
);

-- Enable Row Level Security
alter table public.games enable row level security;

-- Allow anonymous users to insert new game records.
-- The app does not use Supabase Auth, so all writes come in under the
-- built-in `anon` role (i.e. the public API key).
create policy "anon can insert games"
  on public.games
  for insert
  to anon
  with check (true);

-- Allow anonymous users to read all game records (needed for game history
-- and head-to-head stats, and for the .select() that follows each insert).
create policy "anon can select games"
  on public.games
  for select
  to anon
  using (true);
