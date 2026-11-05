'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../games/2048-engine');

test('2048 gộp hai ô giống nhau một lần trong mỗi lượt',()=>{
  assert.deepEqual(E.slideLine([2,2,2,2]),{line:[4,4,0,0],score:8});
  assert.deepEqual(E.slideLine([2,2,4,0]),{line:[4,4,0,0],score:4});
});
test('2048 không gộp dây chuyền trong cùng một lượt',()=>{
  assert.deepEqual(E.slideLine([2,2,4,0]),{line:[4,4,0,0],score:4});
});
test('2048 di chuyển và gộp đúng theo bốn hướng',()=>{
  const board=[[2,2,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  assert.deepEqual(E.moveBoard(board,'left').board[0],[4,0,0,0]);
  assert.deepEqual(E.moveBoard(board,'right').board[0],[0,0,0,4]);
  assert.deepEqual(E.moveBoard(board,'up').board.map(row=>row[0]),[2,0,0,0]);
  assert.deepEqual(E.moveBoard(board,'down').board.map(row=>row[0]),[0,0,0,2]);
  assert.equal(E.moveBoard(board,'left').score,4);
});
test('2048 chỉ báo di chuyển khi bàn cờ thực sự thay đổi',()=>{
  const board=[[2,4,8,16],[32,64,128,256],[512,1024,2,4],[8,16,32,64]];
  assert.equal(E.moveBoard(board,'left').moved,false);
  assert.equal(E.hasMoves(board),false);
});
test('2048 nhận diện chiến thắng và tạo ô mới trên ô trống',()=>{
  assert.equal(E.hasWon([[0,0,0,0],[0,2048,0,0],[0,0,0,0],[0,0,0,0]]),true);
  const result=E.spawnTile(E.emptyBoard(),()=>0);
  assert.deepEqual(result.tile,{row:0,col:0,value:2});
});
