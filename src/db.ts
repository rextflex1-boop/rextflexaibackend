import { neon, Pool } from '@neondatabase/serverless';

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export async function migrate(){
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const statements = [
      `create extension if not exists pgcrypto`,
      `create table if not exists app_users(id text primary key,name text not null,email text not null unique,password_hash text not null,created_at timestamptz not null default now())`,
      `create table if not exists chat_sessions(id text primary key,user_id text not null references app_users(id) on delete cascade,title text,is_public boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`,
      `create table if not exists chat_messages(id text primary key,session_id text not null references chat_sessions(id) on delete cascade,role text not null,message jsonb not null,created_at timestamptz not null default now())`,
      `create table if not exists personas(id text primary key,user_id text not null references app_users(id) on delete cascade,name text not null,instructions text not null,created_at timestamptz not null default now())`,
      `create table if not exists user_settings(user_id text primary key references app_users(id) on delete cascade,tone text,active_persona_id text references personas(id) on delete set null,model_tier text not null default 'titan',theme text not null default 'dark',updated_at timestamptz not null default now())`,
      `create table if not exists generated_files(id text primary key,user_id text not null references app_users(id) on delete cascade,session_id text references chat_sessions(id) on delete cascade,file_name text not null,mime_type text not null,size_bytes integer not null,data bytea not null,created_at timestamptz not null default now())`,
      `create table if not exists agent_tasks(id text primary key,user_id text not null references app_users(id) on delete cascade,session_id text,prompt text not null,mode text not null,status text not null,requires_confirmation boolean not null default false,plan jsonb not null default '[]',created_at timestamptz not null default now(),updated_at timestamptz not null default now())`,
      `create table if not exists agent_events(id text primary key,task_id text not null references agent_tasks(id) on delete cascade,type text not null,message text not null,data jsonb,created_at timestamptz not null default now())`
    ];
    for (const statement of statements) await pool.query(statement);
  } finally {
    await pool.end();
  }
}

export async function userByEmail(email:string){ if(!sql)return null; const r=await sql`select * from app_users where lower(email)=lower(${email}) limit 1`; return r[0]||null; }
export async function userById(id:string){ if(!sql)return null; const r=await sql`select id,name,email from app_users where id=${id} limit 1`; return r[0]||null; }
export async function createUser(id:string,name:string,email:string,passwordHash:string){if(!sql)throw new Error('DATABASE_URL missing');await sql`insert into app_users(id,name,email,password_hash) values(${id},${name},${email},${passwordHash})`;}
export async function ensureSession(id:string,userId:string){if(!sql)throw new Error('DATABASE_URL missing');await sql`insert into chat_sessions(id,user_id) values(${id},${userId}) on conflict(id) do nothing`;}
export async function sessionOwner(id:string){if(!sql)return null;const r=await sql`select user_id from chat_sessions where id=${id}`;return r[0]?.user_id||null;}
export async function saveMessage(id:string,sessionId:string,role:string,message:any){if(!sql)throw new Error('DATABASE_URL missing');await sql`insert into chat_messages(id,session_id,role,message) values(${id},${sessionId},${role},${JSON.stringify(message)}) on conflict(id) do nothing`;await sql`update chat_sessions set updated_at=now() where id=${sessionId}`;}
export async function sessionMessages(id:string,userId:string){if(!sql)return [];const r=await sql`select m.message from chat_messages m join chat_sessions s on s.id=m.session_id where m.session_id=${id} and s.user_id=${userId} order by m.created_at asc,m.id asc`;return r.map(x=>x.message);}
export async function listSessions(userId:string){if(!sql)return [];return await sql`select id,title,is_public as "isPublic",updated_at as "updatedAt" from chat_sessions where user_id=${userId} order by updated_at desc limit 100`;}
export async function createSession(id:string,userId:string){if(!sql)throw new Error('DATABASE_URL missing');await sql`insert into chat_sessions(id,user_id) values(${id},${userId})`;return {id,title:null};}
export async function renameSession(id:string,userId:string,title:string){if(!sql)throw new Error('DATABASE_URL missing'); await sql`update chat_sessions set title=${title.slice(0,60)} where id=${id} and user_id=${userId}`;}
export async function deleteSession(id:string,userId:string){if(!sql)throw new Error('DATABASE_URL missing'); await sql`delete from chat_sessions where id=${id} and user_id=${userId}`;}
export async function setSessionPublic(id:string,userId:string,isPublic:boolean){if(!sql)throw new Error('DATABASE_URL missing'); await sql`update chat_sessions set is_public=${isPublic} where id=${id} and user_id=${userId}`;}
export async function publicSession(id:string){if(!sql)return null;const s=await sql`select title from chat_sessions where id=${id} and is_public=true`;if(!s[0])return null;const m=await sql`select message from chat_messages where session_id=${id} order by created_at asc,id asc`;return {title:s[0].title,messages:m.map(x=>x.message)};}
export async function getSettings(userId:string){if(!sql)return null;const r=await sql`select model_tier as "modelTier",tone,theme,active_persona_id as "activePersonaId" from user_settings where user_id=${userId}`;return r[0]||{modelTier:'titan',tone:'',theme:'dark',activePersonaId:null};}
export async function updateSettings(userId:string,body:any){if(!sql)return;const current=await getSettings(userId);await sql`insert into user_settings(user_id,tone,model_tier,theme,active_persona_id) values(${userId},${body.tone??current?.tone??''},${body.modelTier??current?.modelTier??'titan'},${body.theme??current?.theme??'dark'},${body.activePersonaId??current?.activePersonaId??null}) on conflict(user_id) do update set tone=excluded.tone,model_tier=excluded.model_tier,theme=excluded.theme,active_persona_id=excluded.active_persona_id,updated_at=now()`;}
export async function personas(userId:string){if(!sql)return [];return await sql`select id,name,instructions from personas where user_id=${userId} order by created_at asc`;}
export async function createPersonaDb(id:string,userId:string,name:string,instructions:string){if(!sql)throw new Error('DATABASE_URL missing'); await sql`insert into personas(id,user_id,name,instructions) values(${id},${userId},${name.slice(0,60)},${instructions})`;}
export async function deletePersonaDb(id:string,userId:string){if(!sql)throw new Error('DATABASE_URL missing'); await sql`delete from personas where id=${id} and user_id=${userId}`;}
export async function saveFile(id:string,userId:string,sessionId:string|null,fileName:string,mimeType:string,data:Uint8Array){if(!sql)throw new Error('DATABASE_URL missing'); await sql`insert into generated_files(id,user_id,session_id,file_name,mime_type,size_bytes,data) values(${id},${userId},${sessionId},${fileName},${mimeType},${data.length},${Buffer.from(data)})`;}
export async function getFile(id:string,userId:string){if(!sql)return null;const r=await sql`select file_name as "fileName",mime_type as "mimeType",data from generated_files where id=${id} and user_id=${userId}`;return r[0]||null;}
export async function getActivePrompt(userId:string){if(!sql)return '';const r=await sql`select p.instructions,s.tone from user_settings s left join personas p on p.id=s.active_persona_id where s.user_id=${userId}`;return r[0]?.instructions||r[0]?.tone||'';}
