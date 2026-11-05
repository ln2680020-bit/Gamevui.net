'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {Chess}=require('../games/chess-engine');
test('Cờ vua bắt đầu với 20 nước đi hợp lệ',()=>{const game=new Chess();assert.equal(game.moves().length,20);});
test('Cờ vua từ chối nước đi không hợp lệ',()=>{const game=new Chess();assert.equal(game.move('e5'),null);assert.equal(game.fen(),'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');});
test('Cờ vua xử lý lượt, undo và nhập thành',()=>{const game=new Chess();game.move('e4');assert.equal(game.turn(),'b');game.undo();assert.equal(game.turn(),'w');game.move('Nf3');game.move('Nf6');game.move('g3');game.move('g6');game.move('Bg2');game.move('Bg7');game.move('O-O');assert.equal(game.history().at(-1),'O-O');});
test('Cờ vua nhận diện chiếu hết',()=>{const game=new Chess();for(const move of ['f3','e5','g4','Qh4#'])assert.ok(game.move(move));assert.equal(game.in_checkmate(),true);assert.equal(game.game_over(),true);});

test('Cờ vua trả về loại quân bị bắt để giao diện thông báo đúng quân',()=>{const game=new Chess();for(const move of ['e4','d5','exd5'])assert.ok(game.move(move));const last=game.history({verbose:true}).at(-1);assert.equal(last.captured,'p');assert.equal(last.piece,'p');});

test('Biến thể tự do cho phép đi quân khác khi đang bị chiếu',()=>{const game=new Chess('4k3/8/8/8/8/8/4r3/R3K3 w - - 0 1');assert.equal(game.in_check(),true);assert.equal(game.moves({square:'a1'}).length,0);assert.ok(game.moves({square:'a1',verbose:true,allowCheck:true}).some(m=>m.to==='a2'));assert.ok(game.move({from:'a1',to:'a2'},{allowCheck:true}));assert.equal(game.in_check(),true);});
test('Biến thể tự do vẫn không cho vua tự đi vào ô bị khống chế',()=>{const game=new Chess('3rk3/8/8/8/8/8/4r3/R3K3 w - - 0 1');assert.equal(game.in_check(),true);assert.equal(game.moves({square:'e1',verbose:true,allowCheck:true}).some(m=>m.to==='d1'),false);});
