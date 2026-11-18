'use strict';
// The local display is also the controller when the phone is screen-mirrored.
const touchModes=['clock','timer','score','dual'];
const touchLabels={clock:'Clock',timer:'Timer',score:'One scoreboard',dual:'Two scoreboards'};
const originalSettingsParent=settings.parentElement;
const originalSettingsNext=settings.nextSibling;
const modeMenu=document.createElement('dialog');modeMenu.id='display-menu';
modeMenu.innerHTML=`<div class="dialog-top"><h2>Display</h2><button id="close-display-menu" aria-label="Close display menu">Close</button></div><div class="touch-modes" aria-label="Display mode">${touchModes.map(mode=>`<button data-touch-mode="${mode}">${touchLabels[mode]}</button>`).join('')}</div><p class="touch-instructions">Tap a score panel: +1. Swipe up/down: +1/−1. Swipe left/right: change mode. Tap names to edit. Tap timer digits to start/pause; hold to reset.</p><div id="touch-settings-slot"></div><div class="touch-menu-actions"><button id="touch-undo">Undo last score</button><button id="touch-fullscreen">Full screen</button><button id="touch-help">Mirroring help</button><button id="touch-pair">Separate TV browser (optional)</button></div>`;
document.body.append(modeMenu);
const menuIcon=document.createElement('button');menuIcon.id='display-menu-button';menuIcon.title='Change mode and settings';menuIcon.setAttribute('aria-label','Change mode and settings');
menuIcon.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
document.body.append(menuIcon);
const textEditor=document.createElement('dialog');textEditor.id='text-editor';
textEditor.innerHTML='<form id="text-editor-form"><h2 id="text-editor-title"></h2><label id="name-edit-label" for="display-name-input">Name</label><input id="display-name-input" autocomplete="off"><div id="duration-edit-fields" hidden><label>Minutes<input id="display-minutes" type="number" min="0" max="99" required></label><label>Seconds<input id="display-seconds" type="number" min="0" max="59" required></label></div><p id="text-editor-error" role="alert"></p><div class="editor-actions"><button id="cancel-text-edit" type="button">Cancel</button><button class="primary" type="submit">Save</button></div></form>';
document.body.append(textEditor);
const resetPrompt=document.createElement('dialog');resetPrompt.id='timer-reset-prompt';
resetPrompt.innerHTML='<h2>Reset timer?</h2><p id="reset-duration-label"></p><div class="editor-actions"><button id="cancel-touch-reset">Cancel</button><button id="confirm-touch-reset" class="primary">Reset timer</button></div>';
document.body.append(resetPrompt);
let editedField=null;
const touchEnabled=()=>!window.GymRemote?.active;
function updateTouchDisplay(){
 const enabled=touchEnabled();document.body.classList.toggle('mirror-mode',enabled);menuIcon.hidden=!enabled;
 if(!enabled){
  if(modeMenu.open)modeMenu.close();
  if(settings.parentElement!==originalSettingsParent)originalSettingsParent.insertBefore(settings,originalSettingsNext);
  return;
 }
 document.body.classList.add('display-only');document.querySelector('#exit-display').hidden=true;
 if(settings.parentElement!==document.querySelector('#touch-settings-slot'))document.querySelector('#touch-settings-slot').append(settings);
 modeMenu.querySelectorAll('[data-touch-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.touchMode===state.mode)));
 document.querySelector('#touch-undo').disabled=!undo.length;
 screen.querySelectorAll('.court').forEach((board,i)=>{
  const title=board.querySelector('.court-top>span');title.dataset.edit='board:'+i;title.tabIndex=0;title.setAttribute('role','button');title.setAttribute('aria-label','Edit scoreboard '+(i+1)+' name');
  board.querySelectorAll('.team').forEach((team,j)=>{
   team.dataset.touchScore=i+','+j;
   const name=team.querySelector('.team-name');name.dataset.edit='team:'+i+':'+j;name.tabIndex=0;name.setAttribute('role','button');name.setAttribute('aria-label','Edit '+state.courts[i].teams[j].name+' name');
   const score=team.querySelector('.score-number');score.dataset.scoreAction=i+','+j;score.tabIndex=0;score.setAttribute('role','button');score.setAttribute('aria-label','Add point to '+state.courts[i].teams[j].name);
  });
 });
 const time=screen.querySelector('#timer-time'),caption=screen.querySelector('#timer-caption');
 if(time){time.tabIndex=0;time.setAttribute('role','button');time.setAttribute('aria-label','Start or pause timer');caption.dataset.edit='duration';caption.tabIndex=0;caption.setAttribute('role','button');caption.setAttribute('aria-label','Edit timer duration');}
}
function switchTouchMode(delta){const index=touchModes.indexOf(state.mode);mutate(()=>state.mode=touchModes[(index+delta+touchModes.length)%touchModes.length]);}
function changeTouchScore(value,delta){const [i,j]=value.split(',').map(Number);mutate(()=>{const team=state.courts[i].teams[j];team.score=Math.max(0,Math.min(999,team.score+delta));},true);navigator.vibrate?.(15);}
function openTextEditor(field){
 if(!touchEnabled())return;editedField=field;const isDuration=field==='duration';
 const input=document.querySelector('#display-name-input');input.hidden=isDuration;input.disabled=isDuration;
 document.querySelector('#name-edit-label').hidden=isDuration;document.querySelector('#duration-edit-fields').hidden=!isDuration;
 document.querySelector('#display-minutes').disabled=!isDuration;document.querySelector('#display-seconds').disabled=!isDuration;
 document.querySelector('#text-editor-error').textContent='';
 if(isDuration){document.querySelector('#text-editor-title').textContent='Timer duration';document.querySelector('#display-minutes').value=Math.floor(state.duration/60000);document.querySelector('#display-seconds').value=Math.floor(state.duration/1000)%60;}
 else{const [kind,i,j]=field.split(':');const isBoard=kind==='board';document.querySelector('#text-editor-title').textContent=isBoard?'Scoreboard name':'Team name';input.value=isBoard?state.courts[Number(i)].name:state.courts[Number(i)].teams[Number(j)].name;input.maxLength=isBoard?30:24;}
 textEditor.showModal();if(isDuration)document.querySelector('#display-minutes').focus();else{input.focus();input.select();}
}
document.querySelector('#text-editor-form').onsubmit=e=>{
 e.preventDefault();
 if(editedField==='duration'){
  const min=Number(document.querySelector('#display-minutes').value),sec=Number(document.querySelector('#display-seconds').value);
  if(!Number.isInteger(min)||!Number.isInteger(sec)||min<0||min>99||sec<0||sec>59||min*60+sec===0){document.querySelector('#text-editor-error').textContent='Enter a duration greater than zero, up to 99:59.';return;}
  setDuration((min*60+sec)*1000);
 }else{
  const value=document.querySelector('#display-name-input').value.trim();if(!value){document.querySelector('#text-editor-error').textContent='Enter a name.';return;}
  const [kind,i,j]=editedField.split(':');mutate(()=>{if(kind==='board')state.courts[Number(i)].name=value;else state.courts[Number(i)].teams[Number(j)].name=value;});
 }
 textEditor.close();
};
document.querySelector('#cancel-text-edit').onclick=()=>textEditor.close();
menuIcon.onclick=()=>{updateTouchDisplay();modeMenu.showModal();};
document.querySelector('#close-display-menu').onclick=()=>modeMenu.close();
modeMenu.addEventListener('click',e=>{const b=e.target.closest('[data-touch-mode]');if(!b)return;mutate(()=>state.mode=b.dataset.touchMode);modeMenu.close();});
document.querySelector('#touch-undo').onclick=()=>{if(undo.length){state.courts=JSON.parse(undo.pop());save();render();}modeMenu.close();};
document.querySelector('#touch-fullscreen').onclick=async()=>{modeMenu.close();try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else notify('Full screen is unavailable. The display still works with screen mirroring.');}catch{notify('Full screen is unavailable. The display still works with screen mirroring.');}};
document.querySelector('#touch-help').onclick=()=>{modeMenu.close();document.querySelector('#help-dialog').showModal();};
document.querySelector('#touch-pair').onclick=()=>{modeMenu.close();document.querySelector('#connect-devices').click();};
function promptTimerReset(){document.querySelector('#reset-duration-label').textContent='Reset to '+M.format(state.duration)+' and pause the timer.';resetPrompt.showModal();}
document.querySelector('#cancel-touch-reset').onclick=()=>resetPrompt.close();
document.querySelector('#confirm-touch-reset').onclick=()=>{setDuration(state.duration);resetPrompt.close();};
let screenGesture=null,multiTouch=false;
const activePointers=new Set();
function clearScreenHold(){if(screenGesture)clearTimeout(screenGesture.hold);}
screen.addEventListener('pointerdown',e=>{
 if(!touchEnabled()||document.querySelector('dialog[open]')||e.button!==0)return;
 activePointers.add(e.pointerId);
 if(activePointers.size>1){clearScreenHold();screenGesture=null;multiTouch=true;return;}
 e.preventDefault();screen.setPointerCapture(e.pointerId);
 const edit=e.target.closest('[data-edit]')?.dataset.edit;
 screenGesture={id:e.pointerId,x:e.clientX,y:e.clientY,at:Date.now(),score:e.target.closest('[data-touch-score]')?.dataset.touchScore,edit,handled:false};
 if(state.mode==='timer'&&!edit)screenGesture.hold=setTimeout(()=>{if(screenGesture){screenGesture.handled=true;promptTimerReset();}},750);
});
screen.addEventListener('pointermove',e=>{if(screenGesture&&(Math.abs(e.clientX-screenGesture.x)>12||Math.abs(e.clientY-screenGesture.y)>12))clearScreenHold();});
screen.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);clearScreenHold();screenGesture=null;if(!activePointers.size)multiTouch=false;});
screen.addEventListener('pointerup',e=>{
 activePointers.delete(e.pointerId);clearScreenHold();
 if(multiTouch){if(!activePointers.size)multiTouch=false;screenGesture=null;return;}
 const g=screenGesture;screenGesture=null;if(!g||g.id!==e.pointerId||g.handled||!touchEnabled())return;
 const action=GymTouch.classify(e.clientX-g.x,e.clientY-g.y,Date.now()-g.at);
 if(action.type==='mode'){switchTouchMode(action.delta);return;}
 if(action.type==='score'&&g.score){changeTouchScore(g.score,action.delta);return;}
 if(action.type==='tap'){
  if(g.edit)openTextEditor(g.edit);
  else if(g.score)changeTouchScore(g.score,1);
  else if(state.mode==='timer'){if(state.sound)initAudio();toggleTimer();}
 }
});
screen.addEventListener('keydown',e=>{
 if(!touchEnabled())return;
 if(e.key!=='Enter'&&e.key!==' ')return;
 const field=e.target.closest('[data-edit]')?.dataset.edit,score=e.target.closest('[data-score-action]')?.dataset.scoreAction;
 if(field||score||e.target.id==='timer-time'){e.preventDefault();e.stopPropagation();if(field)openTextEditor(field);else if(score)changeTouchScore(score,1);else{if(state.sound)initAudio();toggleTimer();}}
});
document.addEventListener('gym-render',updateTouchDisplay);
updateTouchDisplay();
