'use strict';

(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GameVerseCardsEngine=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  const COLORS=['R','G','B','Y'];
  const rand=n=>Math.floor(Math.random()*n);
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
  const samDeck=()=>shuffle(Array.from({length:52},(_,i)=>i+12));
  const unoDeck=()=>{const d=[];for(const c of COLORS){d.push(c+'0');for(let n=1;n<=9;n++)d.push(c+n,c+n);for(const v of ['S','V','D'])d.push(c+v,c+v);}for(let i=0;i<4;i++)d.push('WW','WF');return shuffle(d);};
  const samRank=c=>c>>2;
  function samCombo(cards){
    if(!Array.isArray(cards)||!cards.length)return null;
    const ranks=cards.map(samRank).sort((a,b)=>a-b);
    if(ranks.every(x=>x===ranks[0]))return {kind:'set',size:ranks.length,high:ranks[0]};
    if(ranks.length>=3&&ranks.at(-1)<15&&ranks.every((x,i)=>i===0||x===ranks[i-1]+1))return {kind:'run',size:ranks.length,high:ranks.at(-1)};
    return null;
  }
  function beats(a,b){if(!b)return true;if(a.kind==='set'&&a.size===4&&b.kind==='set'&&b.size===1&&b.high===15)return true;return a.kind===b.kind&&a.size===b.size&&a.high>b.high;}
  function samMove(hand,lastCombo){
    const cards=hand.slice().sort((a,b)=>samRank(a)-samRank(b));let best=null;
    function visit(start,picked){
      if(picked.length){const combo=canFinishSam(picked,hand)?samCombo(picked):null;if(combo&&beats(combo,lastCombo)&&(!best||(lastCombo?picked.length<best.cards.length:picked.length>best.cards.length)||(picked.length===best.cards.length&&combo.high<best.combo.high)))best={cards:picked.slice(),combo};}
      if(picked.length>=10)return;
      for(let i=start;i<cards.length;i++){picked.push(cards[i]);visit(i+1,picked);picked.pop();}
    }
    visit(0,[]);return best;
  }
  function createGame(type,botCount=3){
    if(!['sam','uno'].includes(type))throw new Error('invalid_game');
    const max=type==='sam'?5:6,count=Math.max(1,Math.min(max-1,Number(botCount)||1))+1;
    const seats=[{name:'Bạn',bot:false},...Array.from({length:count-1},(_,i)=>({name:'Bot '+(i+1),bot:true}))];
    const g={type,seats,turn:0,winner:-1,message:'',history:[],last:[],lastCombo:null,lastPlayer:-1,passes:[],samCalled:-1,direction:1,draw:[],discard:[],hands:[],top:'',color:'',pendingDraw:null,drawnCardSeat:-1,drawnCard:null,unoPendingSeat:-1,unoCalledSeat:-1};
    if(type==='sam'){const d=samDeck();g.hands=seats.map((_,i)=>d.slice(i*10,i*10+10).sort((a,b)=>a-b));}
    else{const d=unoDeck();g.hands=seats.map(()=>d.splice(0,7));g.draw=d;g.top=g.draw.pop();while(g.top[0]==='W'){g.draw.unshift(g.top);g.top=g.draw.pop();}g.color=g.top[0];if(g.top[1]==='S')g.turn=1;else if(g.top[1]==='V'){g.direction=-1;g.turn=seats.length===2?1:seats.length-1;}else if(g.top[1]==='D'){drawCards(g,0,2);g.turn=1;}}
    add(g,'Bắt đầu ván '+(type==='sam'?'Sâm':'UNO'));return g;
  }
  function add(g,text){g.message=text;g.history.push(text);if(g.history.length>40)g.history.shift();}
  function next(g,steps=1){g.turn=(g.turn+g.direction*steps%g.seats.length+g.seats.length)%g.seats.length;}
  function finish(g,winner){g.winner=winner;add(g,g.seats[winner].name+' chiến thắng!');}
  function canFinishSam(cards,hand){const left=hand.filter(x=>!cards.includes(x));return !(left.length===1&&samRank(left[0])===15)&&!(left.length===0&&cards.some(x=>samRank(x)===15));}
  function samPlay(g,seat,cards){
    if(g.type!=='sam'||g.winner>=0||seat!==g.turn||!Array.isArray(cards)||!cards.length)return false;
    const hand=g.hands[seat];if(new Set(cards).size!==cards.length||!cards.every(c=>hand.includes(c)))return false;
    const combo=samCombo(cards);if(!combo||!beats(combo,g.lastCombo)||!canFinishSam(cards,hand))return false;
    g.hands[seat]=hand.filter(c=>!cards.includes(c));g.last=cards.slice().sort((a,b)=>a-b);g.lastCombo=combo;g.lastPlayer=seat;g.passes=[];add(g,g.seats[seat].name+' đánh '+cards.length+' lá');
    if(!g.hands[seat].length)finish(g,seat);else next(g);return true;
  }
  function samPass(g,seat){
    if(g.type!=='sam'||g.winner>=0||seat!==g.turn||!g.last.length||g.passes.includes(seat))return false;
    g.passes.push(seat);add(g,g.seats[seat].name+' bỏ lượt');
    if(g.passes.length>=g.seats.length-1){g.last=[];g.lastCombo=null;g.passes=[];g.turn=g.lastPlayer;add(g,'Vòng mới: '+g.seats[g.turn].name+' đánh trước');}
    else next(g);return true;
  }
  function samCall(g,seat){if(g.type!=='sam'||g.winner>=0||seat!==g.turn||g.last.length||g.samCalled>=0)return false;g.samCalled=seat;add(g,g.seats[seat].name+' báo Sâm!');return true;}
  function recycle(g){if(!g.draw.length&&g.discard.length>1){const top=g.discard.pop();g.draw=shuffle(g.discard.splice(0));g.discard=[top];}}
  function drawCards(g,seat,n){for(let i=0;i<n;i++){recycle(g);if(g.draw.length)g.hands[seat].push(g.draw.pop());}}
  function unoCanPlay(card,g){return card[0]==='W'||card[0]===g.color||card[1]===g.top[1];}
  function colorFor(hand){return COLORS.sort((a,b)=>hand.filter(c=>c[0]===b&&c[0]!=='W').length-hand.filter(c=>c[0]===a&&c[0]!=='W').length)[0];}
  function unoPlay(g,seat,card,color){
    if(g.type!=='uno'||g.winner>=0||seat!==g.turn||!g.hands[seat].includes(card))return false;
    const h=g.hands[seat];if(g.drawnCardSeat===seat&&(card!==g.drawnCard||h.length===0))return false;if(g.pendingDraw){if(!['D','F'].includes(card[1]))return false;}
    else if(!unoCanPlay(card,g))return false;
    h.splice(h.indexOf(card),1);g.discard.push(g.top);g.top=card;g.color=card[0]==='W'?(COLORS.includes(color)?color:colorFor(h)):card[0];
    g.drawnCardSeat=-1;g.drawnCard=null;add(g,g.seats[seat].name+' đánh '+card);
    if(h.length===1){g.unoPendingSeat=seat;g.unoCalledSeat=seat;}else if(!h.length){g.unoPendingSeat=-1;g.unoCalledSeat=-1;}
    let steps=1;const kind=card[1],nextSeat=(seat+g.direction+g.seats.length)%g.seats.length;
    if(kind==='V'){if(g.seats.length===2)steps=2;else g.direction*=-1;}
    else if(kind==='S')steps=2;
    else if(kind==='D'||kind==='F'){const amount=kind==='D'?2:4;g.pendingDraw={seat:nextSeat,amount};}
    if(!h.length){finish(g,seat);g.pendingDraw=null;}else next(g,steps);
    return true;
  }
  function unoDraw(g,seat){
    if(g.type!=='uno'||g.winner>=0||seat!==g.turn||g.pendingDraw||g.drawnCardSeat===seat)return false;
    drawCards(g,seat,1);const card=g.hands[seat].at(-1);add(g,g.seats[seat].name+' bốc 1 lá');
    if(card&&unoCanPlay(card,g)){g.drawnCardSeat=seat;g.drawnCard=card;}else{g.drawnCardSeat=-1;g.drawnCard=null;next(g);}return true;
  }
  function unoPass(g,seat){if(g.type!=='uno'||g.winner>=0||seat!==g.turn||g.drawnCardSeat!==seat)return false;g.drawnCardSeat=-1;g.drawnCard=null;next(g);add(g,g.seats[seat].name+' bỏ lượt sau khi bốc bài');return true;}
  function unoAccept(g,seat){if(g.type!=='uno'||g.winner>=0||!g.pendingDraw||g.pendingDraw.seat!==seat||g.turn!==seat)return false;const amount=g.pendingDraw.amount;drawCards(g,seat,amount);g.pendingDraw=null;add(g,g.seats[seat].name+' rút '+amount+' lá phạt');next(g);return true;}
  function botTurn(g){
    const seat=g.turn,h=g.hands[seat];if(!g.seats[seat].bot||g.winner>=0)return false;
    if(g.type==='sam'){const move=samMove(h,g.lastCombo);if(move)return samPlay(g,seat,move.cards);if(g.last.length)return samPass(g,seat);next(g);add(g,g.seats[seat].name+' không có nước đi hợp lệ; bỏ lượt');return true;}
    if(g.pendingDraw){const stack=h.find(c=>['D','F'].includes(c[1]));if(stack)return unoPlay(g,seat,stack,colorFor(h));return unoAccept(g,seat);}
    if(g.drawnCardSeat===seat){const c=g.drawnCard;if(c&&unoCanPlay(c,g))return unoPlay(g,seat,c,colorFor(h));return unoPass(g,seat);}
    const playable=h.filter(c=>unoCanPlay(c,g)).sort((a,b)=>{const score=c=>(c[0]==='W'?5:0)+(['D','F','S','V'].includes(c[1])?3:0)+(Number(c[1])||0)*.1;return score(b)-score(a);});
    if(playable.length){if(h.length===2)g.unoCalledSeat=seat;return unoPlay(g,seat,playable[0],colorFor(h));}
    return unoDraw(g,seat);
  }
  function snapshot(g){return {type:g.type,names:g.seats.map(s=>s.name),bots:g.seats.map(s=>s.bot),turn:g.turn,winner:g.winner,message:g.message,history:g.history.slice(),hands:g.hands.map((h,i)=>i===0?h.slice():h.length),hand:g.hands[0].slice(),last:g.last.slice(),samCalled:g.samCalled,top:g.top,color:g.color,direction:g.direction,pendingDraw:g.pendingDraw?{...g.pendingDraw}:null,drawnCardSeat:g.drawnCardSeat,drawnCard:g.drawnCard};}
  return {createGame,samCombo,beats,samMove,samPlay,samPass,samCall,unoCanPlay,unoPlay,unoDraw,unoPass,unoAccept,botTurn,snapshot};
});
