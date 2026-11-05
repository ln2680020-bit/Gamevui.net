'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { act, unoDeck, unoCardPoints, endGame } = require('../server');

// Tests run actions back-to-back, so resolve the 3-second visual lock immediately.
// The dedicated server.test.js case verifies that the real lock is enforced.
function actNow(r,p,command) {
  const result=actNow(r,p,command);
  if(r.effectTimer){clearTimeout(r.effectTimer);r.effectTimer=null;}
  const g=r.game;
  if(g&&g.pendingTurn!==undefined){
    g.turn=g.pendingTurn;
    delete g.pendingTurn;
    g.turnLockUntil=0;
    g.turnDeadline=Date.now()+30000;
  }
  return result;
}

function fixture({hands,top='B3',color=top[0],draw=['R5','G6','Y7','B8'],turn=0}={}) {
  const p1={id:'p1',name:'A',bot:false,score:0};
  const p2={id:'p2',name:'B',bot:false,score:0};
  const g={type:'uno',seats:[p1,p2],hands:hands||[['R1'],['G2']],turn,winner:-1,
    direction:1,color,top,draw:draw.slice(),discard:[],scores:[0,0],history:[],
    message:'',turnDeadline:Date.now()+25000,drawnCardSeat:-1,drawnCard:null,
    unoPendingSeat:-1,unoCalledSeat:-1,pendingDraw:null};
  return {r:{game:g,events:new Set(),players:new Map()},g,p1,p2};
}

test('bộ bài UNO cổ điển có đúng 108 lá',()=>assert.equal(unoDeck().length,108));

test('rút 1 lá có thể đánh thì chỉ được đánh lá vừa rút',()=>{
  const {r,g,p1}=fixture({hands:[['R1'],['G2']],top:'B3',color:'B',draw:['G6','B5']});
  assert.equal(actNow(r,p1,{type:'draw'}).ok,true);
  assert.equal(g.turn,0); assert.equal(g.drawnCard,'B5');
  assert.equal(actNow(r,p1,{type:'play',card:'R1',color:'R'}).error,'must_play_drawn_card');
  assert.equal(actNow(r,p1,{type:'play',card:'B5'}).ok,true); assert.equal(g.turn,1);
});

test('rút lá không đánh được thì tự chuyển lượt',()=>{
  const {r,g,p1}=fixture({hands:[['R1'],['G2']],top:'B3',color:'B',draw:['Y5']});
  assert.equal(actNow(r,p1,{type:'draw'}).ok,true); assert.equal(g.turn,1);
  assert.equal(g.drawnCardSeat,-1);
});

test('+2 có thể cộng dồn với +2; người nhận có thể rút tổng số lá',()=>{
  const {r,g,p1,p2}=fixture({hands:[['RD','R1'],['YD','G1']],top:'R3',color:'R',draw:['Y1','Y2','Y3','Y4','Y5','Y6']});
  assert.equal(actNow(r,p1,{type:'play',card:'RD'}).ok,true);
  assert.equal(g.pendingDraw.amount,2);
  assert.equal(actNow(r,p2,{type:'play',card:'YD'}).ok,true);
  assert.equal(g.pendingDraw.amount,4); assert.equal(g.pendingDraw.seat,0);
  assert.equal(actNow(r,p1,{type:'accept_penalty'}).ok,true);
  assert.equal(g.hands[0].length,7); assert.equal(g.turn,1);
});

test('+4 có thể cộng dồn với +4 và không có luật thách thức',()=>{
  const {r,g,p1,p2}=fixture({hands:[['WF','R1'],['WF','G1']],top:'R3',color:'R',draw:['Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8']});
  assert.equal(actNow(r,p1,{type:'uno'}).ok,true);
  assert.equal(actNow(r,p1,{type:'play',card:'WF',color:'G'}).ok,true);
  assert.equal(g.pendingDraw.amount,4);
  assert.equal(actNow(r,p2,{type:'play',card:'WF',color:'Y'}).ok,true);
  assert.equal(g.pendingDraw.amount,8); assert.equal(g.pendingDraw.seat,0);
  assert.equal(actNow(r,p1,{type:'challenge'}).error,'must_resolve_penalty');
  assert.equal(actNow(r,p1,{type:'accept_penalty'}).ok,true);
  assert.equal(g.hands[0].length,9);
});

test('+2 có thể chồng lên +4 khác màu và cộng dồn thành 6 lá',()=>{
  const {r,g,p1,p2}=fixture({hands:[['WF','R1','R2'],['YD','G1','G2']],top:'R3',color:'R',draw:['Y1','Y2','Y3','Y4','Y5','Y6']});
  assert.equal(actNow(r,p1,{type:'play',card:'WF',color:'B'}).ok,true);
  assert.equal(g.pendingDraw.amount,4);
  assert.equal(actNow(r,p2,{type:'play',card:'YD'}).ok,true);
  assert.equal(g.pendingDraw.amount,6);
  assert.equal(g.pendingDraw.seat,0);
});

test('+4 có thể chồng lên +2 khác màu và cộng dồn thành 6 lá',()=>{
  const {r,g,p1,p2}=fixture({hands:[['RD','R1','R2'],['WF','G1','G2']],top:'R3',color:'R'});
  assert.equal(actNow(r,p1,{type:'play',card:'RD'}).ok,true);
  assert.equal(g.pendingDraw.amount,2);
  assert.equal(actNow(r,p2,{type:'play',card:'WF',color:'Y'}).ok,true);
  assert.equal(g.pendingDraw.amount,6);
  assert.equal(g.pendingDraw.seat,0);
});

test('không thể chồng lá thường lên hình phạt +',()=>{
  const {r,g,p1,p2}=fixture({hands:[['RD','R1','R2'],['Y5','G1','G2']],top:'R3',color:'R'});
  assert.equal(actNow(r,p1,{type:'play',card:'RD'}).ok,true);
  assert.equal(actNow(r,p2,{type:'play',card:'Y5'}).error,'must_stack_draw_card');
});

test('phải báo UNO trước khi đánh lá thứ hai; người khác bắt lỗi được +2 lá',()=>{
  const called=fixture({hands:[['R1','R2'],['G1']],top:'R3',color:'R'});
  assert.equal(actNow(called.r,called.p1,{type:'uno'}).ok,true);
  assert.equal(actNow(called.r,called.p1,{type:'play',card:'R1'}).ok,true);
  assert.equal(called.g.unoPendingSeat,0);
  assert.equal(actNow(called.r,called.p2,{type:'catch_uno'}).error,'no_missed_uno');
  const missed=fixture({hands:[['R1','R2'],['G1']],top:'R3',color:'R',draw:['Y1','Y2','Y3']});
  assert.equal(actNow(missed.r,missed.p1,{type:'play',card:'R1'}).ok,true);
  assert.equal(actNow(missed.r,missed.p2,{type:'catch_uno'}).ok,true);
  assert.equal(missed.g.hands[0].length,3);
});

test('có thể đánh đôi hai lá giống hệt nhau cùng lúc',()=>{
  const {r,g,p1}=fixture({hands:[['R5','R5','B1'],['G2']],top:'R3',color:'R'});
  assert.equal(actNow(r,p1,{type:'play',cards:['R5','R5']}).ok,true);
  assert.deepEqual(g.hands[0],['B1']);
});

test('không thể đánh đôi nếu chỉ có một bản sao của lá bài',()=>{
  const {r,p1}=fixture({hands:[['R5','B1'],['G2']],top:'R3',color:'R'});
  assert.equal(actNow(r,p1,{type:'play',cards:['R5','R5']}).error,'card_not_in_hand');
});

test('điểm lá UNO theo luật truyền thống',()=>{
  assert.equal(unoCardPoints('R7'),7); assert.equal(unoCardPoints('YD'),20);
  assert.equal(unoCardPoints('WS'),50); assert.equal(unoCardPoints('WF'),50);
});

test('người thắng nhận điểm lá còn lại và đạt 500 điểm trở thành nhà vô địch',()=>{
  const p1={id:'p1',name:'A',score:450}; const p2={id:'p2',name:'B',score:0};
  const g={type:'uno',seats:[p1,p2],hands:[[],['WF']],scores:[450,0],winner:-1,message:''};
  endGame(g,0); assert.equal(g.roundPoints,50); assert.equal(p1.score,500);
  assert.equal(g.matchWinner,0);
});