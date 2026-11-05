'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../games/caro-engine');
test('Caro chỉ cho đặt quân vào ô trống trong bàn 15x15',()=>{const b=E.empty();assert.equal(b.length,15);const first=E.play(b,0,0,1);assert.equal(first.ok,true);assert.equal(E.play(first.board,0,0,2).ok,false);assert.equal(E.play(b,-1,0,1).ok,false);});
test('Caro phát hiện năm quân liên tiếp theo hàng, cột và đường chéo',()=>{let b=E.empty();for(let c=3;c<8;c++)b[7][c]=1;assert.equal(E.winnerFrom(b,7,5),1);b=E.empty();for(let r=2;r<7;r++)b[r][4]=2;assert.equal(E.winnerFrom(b,4,4),2);b=E.empty();for(let k=0;k<5;k++)b[3+k][2+k]=1;assert.equal(E.winnerFrom(b,5,4),1);});
test('Caro tạo bàn cờ mới, không sửa bàn cũ',()=>{const b=E.empty(),r=E.play(b,7,7,1);assert.equal(b[7][7],0);assert.equal(r.board[7][7],1);});
