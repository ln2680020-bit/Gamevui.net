'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CaroEngine=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const SIZE=15, DIRECTIONS=[[0,1],[1,0],[1,1],[1,-1]];
 function empty(){return Array.from({length:SIZE},()=>Array(SIZE).fill(0));}
 function valid(board,r,c){return Array.isArray(board)&&Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<SIZE&&c>=0&&c<SIZE&&Array.isArray(board[r])&&board[r].length===SIZE&&board[r][c]===0;}
 function winnerFrom(board,r,c){const player=board[r]?.[c];if(!player)return 0;for(const [dr,dc] of DIRECTIONS){let count=1;for(const sign of [-1,1]){let nr=r+dr*sign,nc=c+dc*sign;while(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===player){count++;nr+=dr*sign;nc+=dc*sign;}}if(count>=5)return player;}return 0;}
 function fiveLines(board,player){const candidates=[];for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){if(board[r][c]!==player)continue;for(const [dr,dc] of DIRECTIONS){const pr=r-dr,pc=c-dc;if(pr>=0&&pr<SIZE&&pc>=0&&pc<SIZE&&board[pr][pc]===player)continue;let run=[];let nr=r,nc=c;while(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===player){run.push({r:nr,c:nc});nr+=dr;nc+=dc;}for(let i=0;i+5<=run.length;i++)candidates.push(run.slice(i,i+5));}}const used=new Set(),lines=[];for(const line of candidates){const ids=line.map(p=>p.r*SIZE+p.c);if(ids.some(id=>used.has(id)))continue;lines.push(line);for(const id of ids)used.add(id);}return lines;}
 function play(board,r,c,player){if(![1,2].includes(player)||!valid(board,r,c))return {ok:false,board};const next=board.map(row=>row.slice());next[r][c]=player;return {ok:true,board:next,winner:winnerFrom(next,r,c),draw:next.every(row=>row.every(Boolean))};}
 return {SIZE,empty,valid,winnerFrom,fiveLines,play};
});
