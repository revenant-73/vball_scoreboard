import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {NetlifyDB} from '@netlify/database-dev';
import {getDatabase} from '@netlify/database';
import {createPostgresDB} from './server/postgres-db.mjs';
import {createWorker} from './worker/index.mjs';
import M from './dist/model.js';

let local,database,DB;
const api=createWorker();
before(async()=>{
 local=new NetlifyDB({logger:()=>{}});
 const connectionString=await local.start();
 await local.applyMigrations(fileURLToPath(new URL('./netlify/database/migrations/',import.meta.url)));
 database=getDatabase({connectionString});DB=createPostgresDB(database.pool);
});
after(async()=>{await database?.pool.end();await local?.stop();});
async function request(path,method='GET',body,token){
 const response=await api.fetch(new Request('https://test.netlify.app'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB});
 return {status:response.status,data:await response.json()};
}
test('Postgres migration and adapter support paired scoring and mode/timer updates',async()=>{
 const created=await request('/api/rooms','POST',{state:M.defaults()});assert.equal(created.status,200);
 const room=created.data,path='/api/rooms/'+room.code;
 assert.equal(typeof room.expiresAt,'number');
 const tv=await request('/api/join','POST',{code:room.code,role:'display'});assert.equal(tv.status,200);
 const remote=await request('/api/join','POST',{code:room.code,role:'remote'});assert.equal(remote.status,200);
 const next=M.defaults();next.mode='dual';next.courts[1].teams[1].score=24;
 const update=await request(path,'PUT',{state:next,revision:0,op:'score'},remote.data.token);assert.equal(update.status,200);
 const display=await request(path,'GET',null,tv.data.token);assert.equal(display.data.state.courts[1].teams[1].score,24);assert.equal(display.data.state.mode,'dual');assert.equal(typeof display.data.expiresAt,'number');
 next.mode='timer';next.deadline=Date.now()+60000;
 const timer=await request(path,'PUT',{state:next,revision:1,op:'timer'},remote.data.token);assert.equal(timer.status,200);
 assert.equal((await request(path,'GET',null,tv.data.token)).data.state.deadline,next.deadline);
 assert.equal((await request(path,'PUT',{state:next,revision:2,op:'readonly'},tv.data.token)).status,403);
 assert.equal((await request(path,'DELETE',null,room.control)).status,200);
 assert.equal((await request(path,'GET',null,tv.data.token)).status,410);
});
test('Postgres compare-and-swap rejects simultaneous stale updates and safely retries',async()=>{
 const room=(await request('/api/rooms','POST',{state:M.defaults()})).data,path='/api/rooms/'+room.code;
 const s=M.defaults();s.courts[0].teams[0].score=5;
 const commands=[{state:s,revision:0,op:'a'},{state:s,revision:0,op:'b'}];
 const results=await Promise.all(commands.map(c=>request(path,'PUT',c,room.control)));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const winner=commands[results.findIndex(r=>r.status===200)];
 const retry=await request(path,'PUT',winner,room.control);assert.equal(retry.status,200);assert.equal(retry.data.revision,1);
 assert.equal(retry.data.state.courts[0].teams[0].score,5);
});
test('Postgres conflict-safe insert and expired-room cleanup retain live sessions',async()=>{
 const room=(await request('/api/rooms','POST',{state:M.defaults()})).data;
 const collision=await DB.prepare('INSERT OR IGNORE INTO rooms(code,control_token,display_token,state,revision,expires_at,paired,last_op) VALUES(?,?,?,?,0,?,0,?)').bind(room.code,'new','new','{}',Date.now()+60000,'').run();
 assert.equal(collision.meta.changes,0);
 await DB.prepare('UPDATE rooms SET expires_at=0 WHERE code=?').bind(room.code).run();
 const next=await request('/api/rooms','POST',{state:M.defaults()});assert.equal(next.status,200);
 assert.equal(await DB.prepare('SELECT * FROM rooms WHERE code=?').bind(room.code).first(),null);
 assert.equal((await request('/api/rooms/'+next.data.code,'GET',null,next.data.control)).status,200);
});
