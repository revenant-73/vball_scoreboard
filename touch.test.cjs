const {test}=require('node:test');
const assert=require('node:assert/strict');
const {classify}=require('./dist/touch-logic.js');
test('horizontal swipes change mode without scoring',()=>{assert.deepEqual(classify(-100,20,300),{type:'mode',delta:1});assert.deepEqual(classify(100,-20,300),{type:'mode',delta:-1});});
test('vertical swipes score once in the intended direction',()=>{assert.deepEqual(classify(10,-80,250),{type:'score',delta:1});assert.deepEqual(classify(-10,80,250),{type:'score',delta:-1});});
test('small quick movement is a tap; drags and ambiguous diagonals do nothing',()=>{assert.deepEqual(classify(4,5,180),{type:'tap'});assert.deepEqual(classify(30,5,180),{type:'none'});assert.deepEqual(classify(90,90,300),{type:'none'});});
test('long holds cannot become taps or delayed swipe actions',()=>{assert.deepEqual(classify(0,0,800),{type:'none'});assert.deepEqual(classify(0,-100,2000),{type:'none'});});
