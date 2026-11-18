import M from '../dist/model.js';

const TTL = 24 * 60 * 60 * 1000;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const random = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => alphabet[b % alphabet.length]).join('');
const json = (data, status = 200) => Response.json(data, {status, headers:{'Cache-Control':'no-store'}});
const snapshot = row => ({state:JSON.parse(row.state), revision:row.revision, expiresAt:row.expires_at, paired:!!row.paired, now:Date.now()});

export function createWorker(assets = {}) {
 return {async fetch(request, env) {
  const url = new URL(request.url);
  try {
   if (!url.pathname.startsWith('/api/')) {
    const asset=assets[url.pathname === '/' ? '/index.html' : url.pathname];
    if(!asset)return new Response('Not found',{status:404});
    return new Response(asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
   }
   if(!env.DB)return json({error:'Pairing is unavailable. Please try again shortly.'},503);
   if(request.method !== 'GET' && request.headers.get('Origin') && request.headers.get('Origin') !== url.origin)return json({error:'Invalid origin'},403);
   const readBody=async()=>{const body=await request.text();if(body.length>16384)throw new Error('Request too large');return JSON.parse(body);};
   if(url.pathname==='/api/rooms'&&request.method==='POST') {
    const body=await readBody(), now=Date.now(), state=M.normalize(body.state);
    if(state.deadline!==null&&Number.isFinite(body.clientNow))state.deadline+=now-body.clientNow;
    const control=random(32), display=random(32);
    let code;
    for(let i=0;i<4;i++) {
     code=random(8);
     const result=await env.DB.prepare('INSERT OR IGNORE INTO rooms(code,control_token,display_token,state,revision,expires_at,paired,last_op) VALUES(?,?,?,?,0,?,0,?)').bind(code,control,display,JSON.stringify(state),now+TTL,'').run();
     if(result.meta.changes)break;
     code=null;
    }
    if(!code)return json({error:'Could not create a session. Try again.'},503);
    await env.DB.batch([env.DB.prepare('DELETE FROM rooms WHERE expires_at < ?').bind(now)]);
    return json({code,control,display,state,revision:0,expiresAt:now+TTL,now});
   }
   if(url.pathname==='/api/join'&&request.method==='POST') {
    const body=await readBody(),code=String(body.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    const row=await env.DB.prepare('SELECT * FROM rooms WHERE code=? AND expires_at>?').bind(code,Date.now()).first();
    if(!row)return json({error:'Session not found or expired. Check the eight-character code.'},404);
    const role=body.role==='display'?'display':'remote';
    await env.DB.prepare('UPDATE rooms SET paired=1 WHERE code=?').bind(code).run();
    return json({...snapshot(row),paired:true,code,role,token:role==='display'?row.display_token:row.control_token});
   }
   const match=url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{8})$/);
   if(!match)return json({error:'Not found'},404);
   const row=await env.DB.prepare('SELECT * FROM rooms WHERE code=? AND expires_at>?').bind(match[1],Date.now()).first();
   if(!row)return json({error:'This session ended or expired. Start a new session.'},410);
   const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
   const canControl=token===row.control_token;
   if(!token||(!canControl&&token!==row.display_token))return json({error:'Pair this device again.'},401);
   if(request.method==='GET')return json(snapshot(row));
   if(!canControl)return json({error:'The TV display is read-only.'},403);
   if(request.method==='DELETE') {await env.DB.prepare('DELETE FROM rooms WHERE code=?').bind(row.code).run();return json({ended:true});}
   if(request.method!=='PUT')return json({error:'Method not allowed'},405);
   const body=await readBody();
   if(!Number.isInteger(body.revision)||typeof body.op!=='string'||body.op.length>80||!body.op)return json({error:'Invalid update'},400);
   if(row.last_op===body.op)return json(snapshot(row));
   if(row.revision!==body.revision)return json({...snapshot(row),error:'Another remote changed the display. Scores refreshed; try your change again.'},409);
   const state=M.normalize(body.state);
   const result=await env.DB.prepare('UPDATE rooms SET state=?,revision=revision+1,last_op=? WHERE code=? AND revision=?').bind(JSON.stringify(state),body.op,row.code,body.revision).run();
   const updated=await env.DB.prepare('SELECT * FROM rooms WHERE code=?').bind(row.code).first();
   if(!updated)return json({error:'This session ended.'},410);
   if(!result.meta.changes)return json({...snapshot(updated),error:'Another remote changed the display. Scores refreshed; try your change again.'},409);
   return json(snapshot(updated));
  } catch(error) {
   if(error instanceof SyntaxError||error.message==='Request too large')return json({error:'Invalid request'},400);
   console.error('Courtside request failed',error.name);
   return json({error:'Connection unavailable. Your last confirmed scores are safe. Try again.'},503);
  }
 }};
}
export default createWorker();
