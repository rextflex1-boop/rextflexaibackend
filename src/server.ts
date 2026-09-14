import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {nanoid} from 'nanoid';
import {signup,login,verify} from './auth.js';
import {migrate,userById,ensureSession,sessionOwner,saveMessage,sessionMessages,listSessions,createSession,renameSession,deleteSession,setSessionPublic,publicSession,getSettings,updateSettings,personas,createPersonaDb,deletePersonaDb,getFile,saveFile} from './db.js';
import {MODEL_TIERS} from './models.js';
import {streamChat} from './ai.js';
import {createTask,getTask,approve,cancel} from './agent.js';
import {finishBuild,writeFile} from './sandbox.js';
import {webSearch} from './search.js';

const app=express();
app.use(cors({origin:process.env.ALLOWED_ORIGINS==='*'||!process.env.ALLOWED_ORIGINS?true:process.env.ALLOWED_ORIGINS.split(',')}));app.use(express.json({limit:'12mb'}));

const auth: express.RequestHandler = async (req, res, next) => {
  const u = await verify(req);
  if (!u) { res.status(401).json({ error: 'Unauthorized' }); return; }
  req.user = u;
  next();
};
app.get('/health',(_req,res)=>res.json({ok:true,service:'rextflexai-backend',models:Object.keys(MODEL_TIERS)}));

app.post('/v1/auth/signup',async(req,res)=>{try{const {name,email,password}=req.body;res.json(await signup(name,email,password));}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/v1/auth/login',async(req,res)=>{try{res.json(await login(req.body.email,req.body.password));}catch(e:any){res.status(401).json({error:e.message})}});
app.get('/v1/auth/me',auth,(req,res)=>res.json({user:req.user}));

app.get('/v1/sessions',auth,async(req,res)=>res.json({sessions:await listSessions(req.user.id)}));
app.post('/v1/sessions',auth,async(req,res)=>res.json({session:await createSession(nanoid(16),req.user.id)}));
app.get('/v1/sessions/:id',auth,async(req,res)=>{const owner=await sessionOwner(String(req.params.id));if(owner!==req.user.id)return res.status(404).json({error:'Not found'});res.json({messages:await sessionMessages(String(req.params.id),req.user.id)})});
app.patch('/v1/sessions/:id',auth,async(req,res)=>{if(req.body.title)await renameSession(String(req.params.id),req.user.id,req.body.title);if(typeof req.body.isPublic==='boolean')await setSessionPublic(String(req.params.id),req.user.id,req.body.isPublic);res.json({ok:true})});
app.delete('/v1/sessions/:id',auth,async(req,res)=>{await deleteSession(String(req.params.id),req.user.id);res.json({ok:true})});
app.get('/v1/share/:id',async(req,res)=>{const x=await publicSession(String(req.params.id));if(!x)return res.status(404).json({error:'Not found'});res.json(x)});

app.get('/v1/settings',auth,async(req,res)=>res.json(await getSettings(req.user.id)));
app.put('/v1/settings',auth,async(req,res)=>{await updateSettings(req.user.id,req.body);res.json({ok:true})});
app.get('/v1/personas',auth,async(req,res)=>{const s=await getSettings(req.user.id);res.json({activePersonaId:s?.activePersonaId||null,personas:await personas(req.user.id)})});
app.post('/v1/personas',auth,async(req,res)=>{const id=nanoid(10);await createPersonaDb(id,req.user.id,req.body.name,req.body.instructions);await updateSettings(req.user.id,{activePersonaId:id});res.json({id})});
app.delete('/v1/personas/:id',auth,async(req,res)=>{await deletePersonaDb(String(req.params.id),req.user.id);res.json({ok:true})});
app.put('/v1/personas/active',auth,async(req,res)=>{await updateSettings(req.user.id,{activePersonaId:req.body.personaId||null});res.json({ok:true})});

app.post('/v1/chat',auth,async(req,res)=>{const {sessionId,message,modelTier='titan',thinkingEnabled=true,webSearchEnabled=true}=req.body;const owner=await sessionOwner(sessionId);if(owner&&owner!==req.user.id)return res.status(403).json({error:'Forbidden'});await ensureSession(sessionId,req.user.id);const userMsg={id:nanoid(16),role:'user',text:message,parts:[{type:'text',text:message}]};await saveMessage(userMsg.id,sessionId,'user',userMsg);try{await streamChat({res,userId:req.user.id,sessionId,message,modelTier,thinkingEnabled,webSearchEnabled});}catch(e:any){if(!res.headersSent)res.status(500).json({error:e.message});else{res.write(`data: ${JSON.stringify({type:'error',message:e.message})}\\n\\n`);res.end();}}});

app.get('/v1/files/:id',auth,async(req,res)=>{const f=await getFile(String(req.params.id),req.user.id);if(!f)return res.status(404).json({error:'Not found'});res.setHeader('Content-Type',f.mimeType);res.setHeader('Content-Disposition',`attachment; filename="${String(f.fileName).replace(/"/g,'')}"`);res.send(f.data)});

// Explicit project builder endpoints for mobile/agent integrations.
app.post('/v1/builder/write-file',auth,async(req,res)=>{try{res.json(await writeFile(req.body.buildId,req.body.path,req.body.content));}catch(e:any){res.status(500).json({error:e.message})}});
app.post('/v1/builder/finish',auth,async(req,res)=>{try{const r:any=await finishBuild(req.body.buildId,req.body.setupCommands||[],req.body.zipName||'project.zip');if(!r.ok)return res.status(400).json(r);const fileId=nanoid(16);await saveFile(fileId,req.user.id,req.body.sessionId||null,r.fileName,'application/zip',r.zipBytes);res.json({ok:true,fileId,fileName:r.fileName,sizeBytes:r.sizeBytes,downloadUrl:`/v1/files/${fileId}`,log:r.log});}catch(e:any){res.status(500).json({error:e.message})}});
app.post('/v1/search',auth,async(req,res)=>{try{res.json({results:await webSearch(req.body.query)});}catch(e:any){res.status(500).json({error:e.message})}});

// Agent Control
app.post('/v1/agent/tasks',auth,async(req,res)=>{try{res.json(await createTask(req.user.id,req.body.prompt,req.body.sessionId||null,req.body.mode||'android'));}catch(e:any){res.status(500).json({error:e.message})}});
app.get('/v1/agent/tasks/:id',auth,async(req,res)=>{const x=await getTask(String(req.params.id),req.user.id);if(!x)return res.status(404).json({error:'Not found'});res.json(x)});
app.post('/v1/agent/tasks/:id/approve',auth,async(req,res)=>{try{res.json(await approve(String(req.params.id),req.user.id));}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/v1/agent/tasks/:id/cancel',auth,async(req,res)=>{try{res.json(await cancel(String(req.params.id),req.user.id));}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/v1/agent/events',auth,async(req,res)=>{const {taskId,type,message,data}=req.body;const {addEvent}=await import('./agent.js');await addEvent(taskId,type,message,data);res.json({ok:true})});

const port=Number(process.env.PORT||3000);migrate().then(()=>app.listen(port,()=>console.log(`RextFlex AI backend listening on ${port}`))).catch(e=>{console.error(e);process.exit(1)});
