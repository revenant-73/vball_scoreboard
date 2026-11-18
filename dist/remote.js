'use strict';
// A room has one shared revision. Unacknowledged changes stay visibly pending.
window.GymRemote={active:false,canEdit:false,offset:0,now(){return Date.now()+this.offset;}};
const remote=window.GymRemote;
let session=null,serverRevision=0,queue=[],sending=false,generation=0,polling=false,lastContact=0,stopped=false,confirmedState=null;
const storageKey='courtside-session-v1';
const connection=document.createElement('section');
connection.id='connection';connection.hidden=true;
connection.innerHTML='<span id="connection-status" role="status" aria-live="polite"></span><button id="session-info">Session</button><button id="leave-session">Disconnect</button>';
document.querySelector('main').prepend(connection);
const pads=document.createElement('section');pads.id='remote-pads';pads.setAttribute('aria-label','Touch scoring');screen.after(pads);
const settings=document.createElement('details');settings.id='remote-settings';settings.open=true;settings.innerHTML='<summary>Team names, sets & court settings</summary>';controls.before(settings);settings.append(controls);
const badge=document.createElement('div');badge.id='tv-connection';badge.hidden=true;document.body.append(badge);
const connectButton=document.createElement('button');connectButton.id='connect-devices';connectButton.textContent='Connect TV & phone';document.querySelector('.header-actions').prepend(connectButton);
const dialog=document.createElement('dialog');dialog.id='connect-dialog';
dialog.innerHTML=`<div class="dialog-top"><h2>Connect your court</h2><button id="close-connect" aria-label="Close connection setup">Close</button></div>
 <p>The TV opens its own display page. Your phone stays on the remote.</p>
 <div id="connect-setup"><div class="connect-start"><button id="start-phone" class="primary">Start on this phone</button><button id="start-tv">Start on the TV / laptop</button></div>
 <form id="join-session"><label for="pair-code">Already have a session code?</label><input id="pair-code" maxlength="9" placeholder="ABCD EFGH" autocapitalize="characters" autocomplete="off" spellcheck="false" required><label for="join-role">Use this device as</label><select id="join-role"><option value="remote">Phone remote</option><option value="display">TV display</option></select><button class="primary" type="submit">Connect</button></form></div>
 <div id="connect-sharing" hidden><p>Session code <strong id="session-code"></strong></p><p>On the other device, open Courtside, choose <strong>Connect TV & phone</strong>, and enter this code.</p><button id="copy-tv">Copy TV display link</button><p id="tv-link-note"></p><button id="end-session">End session for all devices</button></div>
 <p id="connect-error" role="alert"></p><p class="help-note">Use the TV’s browser, a laptop connected by HDMI, or cast the laptop’s display tab. Phone screen mirroring also mirrors phone controls. Sessions last 24 hours. Treat the code as a remote key: anyone with it and Site access can control this court.</p>`;
document.body.append(dialog);
const status=document.querySelector('#connection-status');
function setStatus(message,problem=false){status.textContent=message;connection.classList.toggle('connection-problem',problem);badge.textContent=message;badge.hidden=!document.body.classList.contains('display-only')||!problem;}
function headers(){return {'Content-Type':'application/json',Authorization:'Bearer '+session.token};}
async function api(path,options={}){
 const started=Date.now();
 const response=await fetch(path,{...options,cache:'no-store',signal:AbortSignal.timeout(7000)});
 const result=await response.json();
 if(Number.isFinite(result.now))remote.offset=result.now-(started+Date.now())/2;
 if(!response.ok){const error=new Error(result.error||'Connection failed.');error.status=response.status;error.data=result;throw error;}
 lastContact=Date.now();return result;
}
function applySnapshot(data){confirmedState=JSON.parse(JSON.stringify(data.state));serverRevision=data.revision;state=M.normalize(data.state);undo=[];render();}
function connectedLabel(){return (session.role==='display'?'TV connected':'Remote connected')+' · '+session.code.match(/.{1,4}/g).join(' ');}
function persistSession(){try{sessionStorage.setItem(storageKey,JSON.stringify(session));}catch{}}
function shareInfo(){
 document.querySelector('#connect-setup').hidden=!!session;
 document.querySelector('#connect-sharing').hidden=!session;
 document.querySelector('#end-session').hidden=session?.role!=='remote';
 if(session)document.querySelector('#session-code').textContent=session.code.match(/.{1,4}/g).join(' ');
 document.querySelector('#copy-tv').hidden=!session?.displayToken;
 document.querySelector('#tv-link-note').textContent=session?.displayToken?'Open this link on the TV or on a laptop’s cast tab.':'Enter the code on the TV and choose TV display.';
}
async function activate(value,data){
 session=value;remote.active=true;remote.canEdit=session.role==='remote';stopped=false;queue=[];generation++;serverRevision=data.revision;persistSession();
 document.body.classList.toggle('phone-remote',session.role==='remote');connection.hidden=false;
 const pageURL=new URL(location.href);if(session.role==='display')pageURL.searchParams.set('display','1');else pageURL.searchParams.delete('display');history.replaceState(null,'',pageURL.pathname+pageURL.search);
 if(session.role==='display')setDisplay(true);else setDisplay(false);
 applySnapshot(data);setStatus(connectedLabel());shareInfo();dialog.close();
}
async function createSession(role){
 await withSetup(async()=>{const data=await api('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,clientNow:Date.now(),role})});
 await activate({code:data.code,token:role==='display'?data.display:data.control,displayToken:data.display,role},data);
 if(role==='display'){badge.hidden=false;badge.textContent='Pair phone: open Courtside · Connect TV & phone · '+data.code.match(/.{1,4}/g).join(' ');}else{shareInfo();dialog.showModal();}
 });
}
async function withSetup(fn){
 document.querySelector('#connect-error').textContent='';dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{await fn();}catch(e){document.querySelector('#connect-error').textContent=e.message;}finally{dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
function openSetup(){shareInfo();dialog.showModal();}
connectButton.onclick=openSetup;document.querySelector('#session-info').onclick=openSetup;
document.querySelector('#close-connect').onclick=()=>dialog.close();
document.querySelector('#start-phone').onclick=()=>createSession('remote');document.querySelector('#start-tv').onclick=()=>createSession('display');
document.querySelector('#join-session').onsubmit=e=>{e.preventDefault();withSetup(async()=>{const code=document.querySelector('#pair-code').value,role=document.querySelector('#join-role').value;const data=await api('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,role})});await activate({code:data.code,token:data.token,role},data);});};
document.querySelector('#copy-tv').onclick=async()=>{
 const link=new URL(location.origin+'/');link.searchParams.set('display','1');link.hash=new URLSearchParams({room:session.code,token:session.displayToken,role:'display'}).toString();
 try{await navigator.clipboard.writeText(link.href);notify('TV display link copied.');}catch{document.querySelector('#tv-link-note').textContent=link.href;}
};
function disconnect(){
 generation++;queue=[];if(confirmedState)state=M.normalize(confirmedState);session=null;remote.active=false;remote.offset=0;stopped=false;
 try{sessionStorage.removeItem(storageKey);}catch{}
 document.body.classList.remove('phone-remote');connection.hidden=true;badge.hidden=true;setDisplay(false);render();save();
}
document.querySelector('#leave-session').onclick=()=>{if(queue.length&&!confirm('Some changes are not confirmed. Disconnect and return to the last confirmed scores?'))return;if(queue.length){queue=[];}disconnect();};
document.querySelector('#end-session').onclick=async()=>{if(!confirm('End this session on every connected device?'))return;await withSetup(async()=>{await api('/api/rooms/'+session.code,{method:'DELETE',headers:headers()});disconnect();dialog.close();});};
remote.push=function(value){
 if(!session||session.role!=='remote'||stopped){notify('This display is read-only. Use the paired phone remote.');return;}
 queue.push({state:JSON.parse(JSON.stringify(value)),op:crypto.randomUUID(),generation:++generation});
 setStatus('Sending changes…');flush();
};
async function flush(){
 if(sending||!session||!queue.length||stopped)return;sending=true;
 const item=queue[0],activeSession=session,baseRevision=serverRevision;
 try{
  const data=await api('/api/rooms/'+session.code,{method:'PUT',headers:headers(),body:JSON.stringify({state:item.state,revision:baseRevision,op:item.op})});
  if(session!==activeSession)return;
  serverRevision=data.revision;confirmedState=JSON.parse(JSON.stringify(data.state));queue.shift();
  if(!queue.length){state=M.normalize(data.state);render();setStatus(connectedLabel());}
 }catch(error){
  if(session!==activeSession)return;
  if(error.status===409){queue=[];applySnapshot(error.data);notify(error.message);setStatus(connectedLabel());}
  else if(error.status===401||error.status===410){queue=[];stopped=true;remote.canEdit=false;setStatus(error.message,true);notify(error.message);}
  else{setStatus('Not confirmed · reconnecting…',true);}
 }finally{sending=false;if(queue.length&&!stopped)setTimeout(flush,800);}
}
async function poll(){
 if(!session||polling||sending||queue.length||stopped||document.hidden)return;
 polling=true;const activeSession=session,version=generation;
 try{
  const data=await api('/api/rooms/'+session.code,{headers:headers()});
  if(session!==activeSession||version!==generation||sending||queue.length)return;
  if(data.revision!==serverRevision&&!controls.contains(document.activeElement))applySnapshot(data);
  setStatus(connectedLabel());
  if(session.role==='display'&&!data.paired){badge.hidden=false;badge.textContent='Pair phone: '+session.code.match(/.{1,4}/g).join(' ')+' · Courtside → Connect TV & phone';}
 }catch(error){if(session!==activeSession)return;if(error.status===401||error.status===410){stopped=true;remote.canEdit=false;}setStatus(error.status===410?'Session ended · showing last scores':error.status===401?'Pair this display again':'Connection lost · showing last scores',true);}
 finally{polling=false;}
}
function renderPads(){
 if(!session||session.role!=='remote'){pads.innerHTML='';settings.open=true;return;}
 const isScore=['score','dual'].includes(state.mode);
 settings.open=!isScore;settings.classList.toggle('timer-settings',!isScore);
 if(!isScore){pads.innerHTML='';return;}
 pads.innerHTML='<p class="gesture-help">Tap or swipe up: +1 · Swipe down: −1</p>'+state.courts.slice(0,state.mode==='dual'?2:1).map((court,i)=>`<article class="remote-court"><h2>${esc(court.name)}</h2><div class="remote-teams">${court.teams.map((team,j)=>`<div class="team-${j}"><button class="score-pad" data-pad="${i},${j}" aria-label="Add point to ${esc(team.name)}"><span>${esc(team.name)}</span><strong>${team.score}</strong><small>Tap +1</small></button><button class="subtract-pad" data-subtract="${i},${j}" aria-label="Subtract point from ${esc(team.name)}">−1 point</button></div>`).join('')}</div></article>`).join('')+`<button id="remote-undo" ${undo.length?'':'disabled'}>Undo last change</button>`;
}
function point(court,team,delta){if(stopped){notify('Reconnect before changing scores.');return;}mutate(()=>{state.courts[court].teams[team].score=Math.max(0,Math.min(999,state.courts[court].teams[team].score+delta));},true);}
let gesture=null,suppressTapUntil=0;
pads.addEventListener('pointerdown',e=>{const pad=e.target.closest('[data-pad]');if(!pad||e.isPrimary===false)return;gesture={id:e.pointerId,startX:e.clientX,startY:e.clientY,pad,at:Date.now()};pad.setPointerCapture(e.pointerId);});
pads.addEventListener('pointercancel',()=>gesture=null);
pads.addEventListener('pointerup',e=>{
 if(!gesture||gesture.id!==e.pointerId)return;
 const {startX,startY,pad,at}=gesture;gesture=null;
 const dx=e.clientX-startX,dy=e.clientY-startY;
 if(Math.abs(dy)>=45&&Math.abs(dy)>Math.abs(dx)*1.5&&Date.now()-at<1500){
  e.preventDefault();suppressTapUntil=Date.now()+600;const [i,j]=pad.dataset.pad.split(',').map(Number);point(i,j,dy<0?1:-1);navigator.vibrate?.(20);
 }else if(Math.abs(dx)>20||Math.abs(dy)>20){suppressTapUntil=Date.now()+600;}
});
pads.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.id==='remote-undo'){document.querySelector('#undo')?.click();return;}
 if(button.dataset.subtract){const [i,j]=button.dataset.subtract.split(',').map(Number);point(i,j,-1);return;}
 if(button.dataset.pad&&Date.now()>suppressTapUntil){const [i,j]=button.dataset.pad.split(',').map(Number);point(i,j,1);}
});
document.addEventListener('gym-render',renderPads);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){poll();flush();}});
setInterval(poll,800);
setInterval(()=>{if(session&&!stopped&&lastContact&&Date.now()-lastContact>5000)setStatus('Connection delayed · checking…',true);},1000);
addEventListener('beforeunload',e=>{if(queue.length){e.preventDefault();e.returnValue='';}});
(async()=>{
 let saved;
 const fragment=new URLSearchParams(location.hash.slice(1));
 if(fragment.has('room')&&fragment.has('token')){
  saved={code:fragment.get('room'),token:fragment.get('token'),role:'display'};
  history.replaceState(null,'',location.pathname+'?display=1');
 }else{try{saved=JSON.parse(sessionStorage.getItem(storageKey));}catch{}}
 if(saved){
  session=saved;
  try{const data=await api('/api/rooms/'+session.code,{headers:headers()});await activate(saved,data);}
  catch{session=null;try{sessionStorage.removeItem(storageKey);}catch{}notify('Session unavailable. Choose Connect TV & phone to pair again.');}
 }
})();
