'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.Game2048Engine=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  const SIZE=4;
  function cloneBoard(board){return board.map(row=>row.slice());}
  function slideLine(line){
    const values=line.filter(Boolean),out=[];let score=0;
    for(let i=0;i<values.length;i++){
      if(values[i]===values[i+1]){const merged=values[i]*2;out.push(merged);score+=merged;i++;}
      else out.push(values[i]);
    }
    while(out.length<SIZE)out.push(0);
    return {line:out,score};
  }
  function moveBoard(board,direction){
    const next=cloneBoard(board);let score=0;
    for(let n=0;n<SIZE;n++){
      let line=[];
      if(direction==='left'||direction==='right')line=next[n].slice();
      else for(let r=0;r<SIZE;r++)line.push(next[r][n]);
      if(direction==='right'||direction==='down')line.reverse();
      const result=slideLine(line);score+=result.score;line=result.line;
      if(direction==='right'||direction==='down')line.reverse();
      if(direction==='left'||direction==='right')next[n]=line;
      else for(let r=0;r<SIZE;r++)next[r][n]=line[r];
    }
    const moved=next.some((row,r)=>row.some((value,c)=>value!==board[r][c]));
    return {board:next,score,moved};
  }
  function spawnTile(board,random=Math.random){
    const empty=[];
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(!board[r][c])empty.push([r,c]);
    if(!empty.length)return {board:cloneBoard(board),tile:null};
    const [r,c]=empty[Math.min(empty.length-1,Math.floor(random()*empty.length))];
    const next=cloneBoard(board);next[r][c]=random()<0.9?2:4;
    return {board:next,tile:{row:r,col:c,value:next[r][c]}};
  }
  function hasMoves(board){
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      if(!board[r][c])return true;
      if(c<SIZE-1&&board[r][c]===board[r][c+1])return true;
      if(r<SIZE-1&&board[r][c]===board[r+1][c])return true;
    }
    return false;
  }
  function hasWon(board){return board.some(row=>row.some(value=>value>=2048));}
  function emptyBoard(){return Array.from({length:SIZE},()=>Array(SIZE).fill(0));}
  return {SIZE,cloneBoard,slideLine,moveBoard,spawnTile,hasMoves,hasWon,emptyBoard};
});
