import {nanoid} from 'nanoid';
import {MODEL_TIERS} from './models.js';
import {webSearch} from './search.js';
import {finishBuild,writeFile} from './sandbox.js';
import {getActivePrompt,saveFile} from './db.js';

const base=`You are the assistant inside RextFlex Ai — a helpful, direct AI chat assistant. Give clear, well-structured answers and match the user's tone. Use web search for current or uncertain information. For anything the user wants to actually run or download, write it into the build sandbox one file at a time and finish the build at the end.`;

function authHeaders(){return {'Content-Type':'application/json','Authorization':`Bearer ${process.env.GROQ_API_KEY}`};}

export async function streamChat(opts:{res:any;userId:string;sessionId:string;message:string;modelTier:string;thinkingEnabled:boolean;webSearchEnabled:boolean}){
 const info=MODEL_TIERS[opts.modelTier]||MODEL_TIERS.titan; const extra=await getActivePrompt(opts.userId); const system=[base,extra?`Tone/style: ${extra}`:''].filter(Boolean).join(' ');
 const messages=[{role:'system',content:system},{role:'user',content:opts.message}];
 const r=await fetch(`${process.env.GROQ_BASE_URL||'https://api.groq.com/openai/v1'}/chat/completions`,{method:'POST',headers:authHeaders(),body:JSON.stringify({model:info.groqModelId,messages,stream:true,max_tokens:Number(process.env.MAX_OUTPUT_TOKENS||4096),temperature:.5,reasoning_effort:info.supportsReasoningEffort?(opts.thinkingEnabled?'medium':'low'):undefined})});
 if(!r.ok)throw new Error(`Groq ${r.status}: ${await r.text()}`);
 opts.res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','Transfer-Encoding':'chunked','X-Accel-Buffering':'no'});
 const reader=r.body!.getReader(); const dec=new TextDecoder(); let buf='';
 while(true){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const rows=buf.split('\\n');buf=rows.pop()||'';for(const line of rows){if(!line.startsWith('data:'))continue;const raw=line.slice(5).trim();if(raw==='[DONE]')continue;try{const d:any=JSON.parse(raw);const delta=d.choices?.[0]?.delta?.content;if(delta)opts.res.write(`data: ${JSON.stringify({type:'text_delta',delta})}\\n\\n`);}catch{}}}
 opts.res.end();
}

// The mobile build path uses explicit agent/tool endpoints rather than trying to
// safely encode arbitrary shell/tool execution inside the public chat endpoint.
export {webSearch,writeFile,finishBuild,nanoid};
