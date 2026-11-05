'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CaroEngine=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const SIZE=15;
 function empty(){return Array.from({length:SIZE},()=>Array(SIZE).fill(0));}
 function valid(board,r,c){return r>=0&&r<SIZE&&c>=0&&c<SIZE&&board[r][c]===0;}
 function winnerFrom(board,r,c){
  const player=board[r][c];if(!player)return 0;
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
   let count=1;
   for(const sign of [-1,1]){let nr=r+dr*sign,nc=c+dc*sign;while(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===player){count++;nr+=dr*sign;nc+=dc*sign;}}
   if(count>=5)return player;
  }
  return 0;
 }
 function play(board,r,c,player){if(!valid(board,r,c)||![1,2].includes(player))return {ok:false,board};const next=board.map(row=>row.slice());next[r][c]=player;return {ok:true,board:next,winner:winnerFrom(next,r,c),draw:next.every(row=>row.every(Boolean))};}
 return {SIZE,empty,valid,winnerFrom,play};
});
