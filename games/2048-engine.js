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
  function coordinate(direction,line,index){
    if(direction==='left')return {row:line,col:index};
    if(direction==='right')return {row:line,col:SIZE-1-index};
    if(direction==='up')return {row:index,col:line};
    return {row:SIZE-1-index,col:line};
  }
  function moveBoard(board,direction){
    if(!['left','right','up','down'].includes(direction))throw new Error('Hướng di chuyển không hợp lệ');
    const next=emptyBoard(),moves=[],merges=[];let score=0;
    for(let lineIndex=0;lineIndex<SIZE;lineIndex++){
      const entries=[];
      for(let i=0;i<SIZE;i++){
        const pos=coordinate(direction,lineIndex,i),value=board[pos.row][pos.col];
        if(value)entries.push({value,from:pos});
      }
      let source=0,destination=0;
      while(source<entries.length){
        const first=entries[source],second=entries[source+1];
        const target=coordinate(direction,lineIndex,destination);
        if(second&&first.value===second.value){
          const value=first.value*2;
          next[target.row][target.col]=value;score+=value;
          moves.push({from:first.from,to:target,value,merged:true});
          moves.push({from:second.from,to:target,value:second.value,merged:true});
          merges.push({at:target,value});
          source+=2;
        }else{
          next[target.row][target.col]=first.value;
          moves.push({from:first.from,to:target,value:first.value,merged:false});
          source++;
        }
        destination++;
      }
    }
    const moved=next.some((row,r)=>row.some((value,c)=>value!==board[r][c]));
    return {board:next,score,moved,moves,merges};
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