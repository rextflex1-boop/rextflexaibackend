create table if not exists app_users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists auth_sessions (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists auth_sessions_user_idx on auth_sessions(user_id);
create table if not exists chat_sessions (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  title text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_sessions_user_idx on chat_sessions(user_id);
create table if not exists chat_messages (
  id text primary key,
  session_id text not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  message jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_session_idx on chat_messages(session_id);
create table if not exists personas (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  name text not null,
  instructions text not null,
  created_at timestamptz not null default now()
);
create index if not exists personas_user_idx on personas(user_id);
create table if not exists user_settings (
  user_id text primary key references app_users(id) on delete cascade,
  tone text default '',
  active_persona_id text references personas(id) on delete set null,
  model_tier text not null default 'titan',
  updated_at timestamptz not null default now()
);
create table if not exists generated_files (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  session_id text references chat_sessions(id) on delete cascade,
  file_name text not null,
  mime_type text not null default 'application/zip',
  size_bytes integer not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists generated_files_user_idx on generated_files(user_id);
