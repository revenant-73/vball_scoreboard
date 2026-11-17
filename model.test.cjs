const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('./dist/model.js');
test('timer uses deadline and clamps at zero after background delay',()=>{const s=M.defaults();s.deadline=10000;assert.equal(M.remaining(s,2500),7500);assert.equal(M.remaining(s,12000),0);assert.equal(M.format(7500),'00:08');});
test('paused timer retains remaining time',()=>{const s=M.defaults();s.remaining=2345;assert.equal(M.remaining(s,999999),2345);});
test('stored data normalizes invalid modes and score limits',()=>{const s=M.normalize({mode:'bad',duration:-1,courts:[{teams:[{name:'A',score:-3,sets:1000},{name:'B',score:5000}]}]});assert.equal(s.mode,'score');assert.equal(s.duration,300000);assert.equal(s.courts[0].teams[0].score,0);assert.equal(s.courts[0].teams[0].sets,99);assert.equal(s.courts[0].teams[1].score,999);assert.equal(s.courts[1].teams[0].score,0);});
test('running timer survives saved-state roundtrip',()=>{const s=M.defaults();s.deadline=20000;const restored=M.normalize(JSON.parse(JSON.stringify(s)));assert.equal(M.remaining(restored,15000),5000);});
