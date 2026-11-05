'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { samCombo, beats, canFinishSam, findSamMove, endGame, publicState, rooms } = require('../server');
test('Sâm nhận diện bộ cùng hạng',()=>assert.deepEqual(samCombo([12,13,14]),{kind:'set',size:3,high:3}));
test('Sâm nhận diện sảnh liên tiếp',()=>assert.deepEqual(samCombo([12,16,20]),{kind:'run',size:3,high:5}));
test('Sâm từ chối tổ hợp không hợp lệ',()=>assert.equal(samCombo([12,20,28]),null));
test('bộ lớn hơn cùng loại được chấp nhận',()=>assert.equal(beats({kind:'set',size:2,high:8},{kind:'set',size:2,high:7}),true));
test('bộ khác loại không chặn được',()=>assert.equal(beats({kind:'run',size:3,high:8},{kind:'set',size:3,high:7}),false));
test('trạng thái chỉ gửi bài của đúng người xem',()=>{const room={code:'x',players:new Map(),game:{type:'sam',seats:[{id:'a',name:'A'},{id:'b',name:'B'}],hands:[[1,2],[3,4]],turn:0,winner:-1,last:[],scores:[0,0],direction:1,color:'',top:'',samCalled:-1,passes:[]}};const a={id:'a',token:'ta',name:'A'},b={id:'b',token:'tb',name:'B'};room.players.set('a',a);room.players.set('b',b);assert.deepEqual(publicState(room,'ta').game.hand,[1,2]);assert.deepEqual(publicState(room,'tb').game.hand,[3,4]);assert.equal(publicState(room,'ta').game.hands,undefined);assert.equal(publicState(room,'ta').game.history.length,0);assert.equal(publicState(room,'ta').game.turnDeadline,0);});

test('Bot chọn đủ đôi để chặn đôi',()=>{const move=findSamMove([24,25,28,29],{kind:'set',size:2,high:5});assert.deepEqual(move.cards,[24,25]);assert.equal(move.combo.high,6);});
test('Bot chọn sảnh đủ số lá để chặn sảnh',()=>{const move=findSamMove([16,20,24,28],{kind:'run',size:3,high:4});assert.deepEqual(move.cards,[16,20,24]);assert.equal(move.combo.high,6);});
test('Bot trả về null khi không có nước chặn hợp lệ',()=>assert.equal(findSamMove([12,13,14],{kind:'set',size:2,high:10}),null));

test('chiến thắng cộng đúng 1 điểm và ghi nhận người thắng',()=>{const p={id:'p1',name:'A',score:2};const g={seats:[p],scores:[2],winner:-1,message:''};endGame(g,0);assert.equal(g.winner,0);assert.equal(p.score,3);assert.equal(g.scores[0],3);assert.match(g.message,/\+1 điểm/);});
test('không cộng điểm lần thứ hai cho cùng một ván',()=>{const p={id:'p1',name:'A',score:0};const g={seats:[p],scores:[0],winner:-1,message:''};endGame(g,0);endGame(g,0);assert.equal(p.score,1);});

test('tứ quý chặt được một lá 2',()=>assert.equal(beats({kind:'set',size:4,high:8},{kind:'set',size:1,high:15}),true));
test('tứ quý lớn chặt được tứ quý nhỏ',()=>assert.equal(beats({kind:'set',size:4,high:9},{kind:'set',size:4,high:8}),true));
test('tứ quý nhỏ không chặt được tứ quý lớn',()=>assert.equal(beats({kind:'set',size:4,high:8},{kind:'set',size:4,high:9}),false));
test('không cho phép kết thúc ván bằng lá 2',()=>assert.equal(canFinishSam([60],[60]),false));
test('được đánh lá 2 nếu vẫn còn bài khác không phải lá 2',()=>assert.equal(canFinishSam([60],[60,56]),true));
test('không cho phép nước đi khiến chỉ còn một lá 2',()=>assert.equal(canFinishSam([12],[12,60]),false));
test('không cho phép đánh một lá 2 nếu sẽ để lại lá 2 cuối cùng',()=>assert.equal(canFinishSam([60],[60,61]),false));
test('Bot không chọn lá 2 làm nước kết thúc',()=>assert.equal(findSamMove([60],null),null));

test('hồ sơ người chơi giữ điểm, số ván thắng và chuỗi thắng',()=>{const p={id:'p1',name:'A',score:4,wins:3,games:5,streak:2,bestStreak:3};const room={code:'x',players:new Map([['p1',p]]),game:null};const state=publicState(room,'');assert.equal(state.players[0].score,4);assert.equal(state.players[0].wins,3);assert.equal(state.players[0].games,5);assert.equal(state.players[0].streak,2);assert.equal(state.players[0].bestStreak,3);});
