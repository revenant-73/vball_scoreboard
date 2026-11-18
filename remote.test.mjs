import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorker} from './worker/index.mjs';
import {localDB} from './scripts/local-db.mjs';
import M from './dist/model.js';
const worker=createWorker();
function harness(){
 const DB=localDB();
 return {DB,async request(path,method='GET',body,token){const response=await worker.fetch(new Request('https://courtside.test'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB});return {status:response.status,data:await response.json()};}};
}
test('paired TV reads scores and modes but cannot write; invalid tokens rejected',async()=>{
 const {DB,request}=harness();try{
 const room=(await request('/api/rooms','POST',{state:M.defaults()})).data;
 const remote=(await request('/api/join','POST',{code:room.code,role:'remote'})).data;
 const tv=(await request('/api/join','POST',{code:room.code,role:'display'})).data;
 assert.notEqual(tv.token,remote.token);
 const next=M.defaults();next.mode='dual';next.courts[1].teams[0].score=19;
 assert.equal((await request('/api/rooms/'+room.code,'PUT',{state:next,revision:0,op:'point-1'},remote.token)).status,200);
 const display=await request('/api/rooms/'+room.code,'GET',null,tv.token);assert.equal(display.data.state.mode,'dual');assert.equal(display.data.state.courts[1].teams[0].score,19);
 assert.equal((await request('/api/rooms/'+room.code,'PUT',{state:M.defaults(),revision:1,op:'unauthorized'},tv.token)).status,403);
 assert.equal((await request('/api/rooms/'+room.code,'GET',null,'bad')).status,401);
 }finally{DB.close();}
});
test('retries are idempotent and conflicting remotes cannot overwrite scores',async()=>{
 const {DB,request}=harness();try{
 const room=(await request('/api/rooms','POST',{state:M.defaults()})).data,path='/api/rooms/'+room.code;
 const s=M.defaults();s.courts[0].teams[0].score=1;
 const command={state:s,revision:0,op:'first'};
 assert.equal((await request(path,'PUT',command,room.control)).data.revision,1);
 assert.equal((await request(path,'PUT',command,room.control)).data.revision,1);
 const conflict=await request(path,'PUT',{state:M.defaults(),revision:0,op:'other'},room.control);
 assert.equal(conflict.status,409);assert.equal(conflict.data.state.courts[0].teams[0].score,1);
 }finally{DB.close();}
});
test('expired sessions reject pairing and commands; ending revokes display access',async()=>{
 const {DB,request}=harness();try{
 const first=(await request('/api/rooms','POST',{state:M.defaults()})).data;
 await DB.prepare('UPDATE rooms SET expires_at=0 WHERE code=?').bind(first.code).run();
 assert.equal((await request('/api/join','POST',{code:first.code})).status,404);
 assert.equal((await request('/api/rooms/'+first.code,'GET',null,first.control)).status,410);
 const second=(await request('/api/rooms','POST',{state:M.defaults()})).data;
 assert.equal((await request('/api/rooms/'+second.code,'DELETE',null,second.display)).status,403);
 assert.equal((await request('/api/rooms/'+second.code,'DELETE',null,second.control)).status,200);
 assert.equal((await request('/api/rooms/'+second.code,'GET',null,second.display)).status,410);
 }finally{DB.close();}
});
test('running timer is shared using server time and malformed updates fail safely',async()=>{
 const {DB,request}=harness();try{
 const s=M.defaults();s.deadline=10000;s.mode='timer';
 const before=Date.now();const room=(await request('/api/rooms','POST',{state:s,clientNow:5000})).data;
 assert.ok(room.state.deadline>=before+5000);assert.ok(room.state.deadline<=Date.now()+5000);
 assert.equal((await request('/api/rooms/'+room.code,'PUT',{state:s,revision:'0',op:'bad'},room.control)).status,400);
 }finally{DB.close();}
});
