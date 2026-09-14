import {nanoid} from 'nanoid';
import {sql} from './db.js';
import {MODEL_TIERS} from './models.js';

export type AgentStatus='queued'|'planning'|'running'|'needs_confirmation'|'completed'|'failed'|'cancelled';

export async function createTask(userId:string,prompt:string,sessionId:string|null,mode:string){
 if(!sql)throw new Error('DATABASE_URL missing'); const id=nanoid(16);
 const sensitive=/delete|purchase|buy|send message|post|install unknown|change password|permission/i.test(prompt);
 await sql`insert into agent_tasks(id,user_id,session_id,prompt,mode,status,requires_confirmation) values(${id},${userId},${sessionId},${prompt},${mode},'queued',${sensitive})`;
 await addEvent(id,'task','Task received');
 await addEvent(id,'planning','Planning actions...');
 if(sensitive){await sql`update agent_tasks set status='needs_confirmation',updated_at=now() where id=${id}`;await addEvent(id,'confirmation','User confirmation required before the sensitive action');}
 else {await sql`update agent_tasks set status='running',updated_at=now() where id=${id}`;await addEvent(id,'running','Agent ready to execute Android actions');}
 return getTask(id,userId);
}
export async function getTask(id:string,userId:string){if(!sql)return null;const t=await sql`select id,prompt,mode,status,requires_confirmation as "requiresConfirmation",plan,created_at as "createdAt",updated_at as "updatedAt" from agent_tasks where id=${id} and user_id=${userId}`;if(!t[0])return null;const e=await sql`select id,type,message,data,created_at as "createdAt" from agent_events where task_id=${id} order by created_at asc,id asc`;return {task:t[0],events:e};}
export async function addEvent(taskId:string,type:string,message:string,data:any=null){if(!sql)throw new Error('DATABASE_URL missing');await sql`insert into agent_events(id,task_id,type,message,data) values(${nanoid(16)},${taskId},${type},${message},${data?JSON.stringify(data):null})`;await sql`update agent_tasks set updated_at=now() where id=${taskId}`;}
export async function approve(id:string,userId:string){if(!sql)throw new Error('DATABASE_URL missing');const t=await sql`select * from agent_tasks where id=${id} and user_id=${userId}`;if(!t?.[0])throw new Error('Task not found');await sql`update agent_tasks set requires_confirmation=false,status='running',updated_at=now() where id=${id}`;await addEvent(id,'approved','Confirmation approved. Agent may continue.');return getTask(id,userId);}
export async function cancel(id:string,userId:string){if(!sql)throw new Error('DATABASE_URL missing');const t=await sql`select * from agent_tasks where id=${id} and user_id=${userId}`;if(!t?.[0])throw new Error('Task not found');await sql`update agent_tasks set status='cancelled',updated_at=now() where id=${id}`;await addEvent(id,'cancelled','Task cancelled by user');return getTask(id,userId);}
