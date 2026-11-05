'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {Chess}=require('../games/chess-engine');
test('Cờ vua bắt đầu với 20 nước đi hợp lệ',()=>{const game=new Chess();assert.equal(game.moves().length,20);});
test('Cờ vua từ chối nước đi không hợp lệ',()=>{const game=new Chess();assert.equal(game.move('e5'),null);assert.equal(game.fen(),'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');});
test('Cờ vua xử lý lượt, undo và nhập thành',()=>{const game=new Chess();game.move('e4');assert.equal(game.turn(),'b');game.undo();assert.equal(game.turn(),'w');game.move('Nf3');game.move('Nf6');game.move('g3');game.move('g6');game.move('Bg2');game.move('Bg7');game.move('O-O');assert.equal(game.history().at(-1),'O-O');});
test('Cờ vua nhận diện chiếu hết',()=>{const game=new Chess();for(const move of ['f3','e5','g4','Qh4#'])assert.ok(game.move(move));assert.equal(game.in_checkmate(),true);assert.equal(game.game_over(),true);});
