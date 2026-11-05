'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { act, unoDeck } = require('../server');

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

test('rút 1 lá có thể đánh thì người chơi được đánh chính lá vừa rút',()=>{
  const {r,g,p1}=fixture({hands:[['R1'],['G2']],top:'B3',color:'B',draw:['B5','G6']});
  assert.equal(act(r,p1,{type:'draw'}).ok,true);
  assert.equal(g.turn,0);
  assert.equal(g.drawnCard,'B5');
  assert.equal(act(r,p1,{type:'play',card:'G6',color:'G'}).error,'must_play_drawn_card');
  assert.equal(act(r,p1,{type:'play',card:'B5'}).ok,true);
  assert.equal(g.turn,1);
});

test('rút 1 lá không đánh được thì lượt tự chuyển sang người kế tiếp',()=>{
  const {r,g,p1}=fixture({hands:[['R1'],['G2']],top:'B3',color:'B',draw:['Y5']});
  assert.equal(act(r,p1,{type:'draw'}).ok,true);
  assert.equal(g.turn,1);
  assert.equal(g.drawnCardSeat,-1);
});

test('+2 buộc người kế tiếp rút 2 lá và mất lượt, không cộng dồn',()=>{
  const {r,g,p1,p2}=fixture({hands:[['RD','B1'],['G1']],top:'R3',color:'R',draw:['Y1','Y2','Y3']});
  assert.equal(act(r,p1,{type:'play',card:'RD'}).ok,true);
  assert.equal(g.turn,1);
  assert.equal(g.pendingDraw.amount,2);
  assert.equal(act(r,p2,{type:'play',card:'G1'}).error,'must_resolve_penalty');
  assert.equal(act(r,p2,{type:'accept_penalty'}).ok,true);
  assert.equal(g.hands[1].length,3);
  assert.equal(g.turn,0);
});

test('+4 có thể bị thách thức thành công nếu người đánh còn màu hiện tại',()=>{
  const {r,g,p1,p2}=fixture({hands:[['WF','R4'],['G1']],top:'R3',color:'R'});
  assert.equal(act(r,p1,{type:'play',card:'WF',color:'G'}).ok,true);
  assert.equal(g.pendingDraw.offenderHadColor,true);
  assert.equal(act(r,p2,{type:'challenge'}).ok,true);
  assert.equal(g.hands[0].length,5);
  assert.equal(g.turn,1);
});

test('thách thức +4 thất bại khiến người thách thức rút 6 và mất lượt',()=>{
  const {r,g,p1,p2}=fixture({hands:[['WF','B4'],['G1']],top:'R3',color:'R',draw:['Y1','Y2','Y3','Y4','Y5','Y6','Y7']});
  assert.equal(act(r,p1,{type:'play',card:'WF',color:'G'}).ok,true);
  assert.equal(g.pendingDraw.offenderHadColor,false);
  assert.equal(act(r,p2,{type:'challenge'}).ok,true);
  assert.equal(g.hands[1].length,7);
  assert.equal(g.turn,0);
});

test('báo UNO ngăn bị phạt; quên báo UNO có thể bị bắt và rút 2 lá',()=>{
  const called=fixture({hands:[['R1','R2'],['G1']],top:'R3',color:'R'});
  assert.equal(act(called.r,called.p1,{type:'play',card:'R1'}).ok,true);
  assert.equal(called.g.unoPendingSeat,0);
  assert.equal(act(called.r,called.p1,{type:'uno'}).ok,true);
  assert.equal(act(called.r,called.p2,{type:'catch_uno'}).error,'no_missed_uno');

  const missed=fixture({hands:[['R1','R2'],['G1']],top:'R3',color:'R',draw:['Y1','Y2','Y3']});
  assert.equal(act(missed.r,missed.p1,{type:'play',card:'R1'}).ok,true);
  assert.equal(act(missed.r,missed.p2,{type:'catch_uno'}).ok,true);
  assert.equal(missed.g.hands[0].length,3);
});
