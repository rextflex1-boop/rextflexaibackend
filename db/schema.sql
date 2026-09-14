create table if not exists app_users(
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists chat_sessions(
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  title text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists chat_messages(
  id text primary key,
  session_id text not null references chat_sessions(id) on delete cascade,
  role text not null,
  message jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists personas(
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  name text not null,
  instructions text not null,
  created_at timestamptz not null default now()
);
create table if not exists user_settings(
  user_id text primary key references app_users(id) on delete cascade,
  tone text,
  active_persona_id text references personas(id) on delete set null,
  model_tier text not null default 'titan',
  theme text not null default 'dark',
  updated_at timestamptz not null default now()
);
create table if not exists generated_files(
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  session_id text references chat_sessions(id) on delete cascade,
  file_name text not null,
  mime_type text not null default 'application/zip',
  size_bytes integer not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
create table if not exists agent_tasks(
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  session_id text,
  prompt text not null,
  mode text not null,
  status text not null,
  requires_confirmation boolean not null default false,
  plan jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists agent_events(
  id text primary key,
  task_id text not null references agent_tasks(id) on delete cascade,
  type text not null,
  message text not null,
  data jsonb,
  created_at timestamptz not null default now()
);
