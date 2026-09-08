-- Cardenveil schema for Supabase (run once in the Supabase SQL Editor)

create table if not exists sessions (
  id serial primary key,
  discord_event_id text,
  forum_thread_id text,
  announcement_message_id text,
  announcement_channel_id text,

  mj_id text not null,
  system text,
  format text,
  date_timestamp bigint,
  date_text text,
  duration text,
  type text,
  level text,
  platform text,
  warnings text,
  tags text,
  game_type text,
  max_players integer,
  status text not null default 'recrutement',
  description text,
  comments text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists registrations (
  id serial primary key,
  session_id integer not null references sessions(id) on delete cascade,
  user_id text not null,
  status text not null default 'confirmed',
  registered_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists reminders (
  id serial primary key,
  session_id integer not null references sessions(id) on delete cascade,
  reminder_type text not null,
  scheduled_at bigint not null,
  sent_at bigint
);

create index if not exists idx_registrations_session on registrations(session_id);
create index if not exists idx_registrations_user on registrations(user_id);
create index if not exists idx_sessions_timestamp on sessions(date_timestamp);
create index if not exists idx_reminders_scheduled on reminders(scheduled_at, sent_at);
