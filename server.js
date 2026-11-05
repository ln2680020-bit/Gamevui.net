'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();
const LIMITS = { roomCode: 20, name: 24, maxRooms: 1000, maxPlayers: 6, body: 8192, grace: 30000, ttl: 300000 };
const id = () => crypto.randomBytes(18).toString('hex');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const validCode = s => typeof s === 'string' && s.length > 0 && s.length <= LIMITS.roomCode && /^[a-zA-Z0-9_-]+$/.test(s);
const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); };
function readBody(req) { return new Promise((resolve, reject) => { let data = ''; req.on('data', c => { data += c; if (Buffer.byteLength(data) > LIMITS.body) { reject(new Error('too_large')); req.destroy(); } }); req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('bad_json')); } }); req.on('error', reject); }); }
function roomFor(code, create = false) { let r = rooms.get(code); if (!r && create && rooms.size < LIMITS.maxRooms) { r = { code, players: new Map(), game: null, events: new Set(), emptyAt: null, chat: [], emotes: [] }; rooms.set(code, r); } return r; }
function playerFor(r, token) { for (const p of r.players.values()) if (p.token === token) return p; return null; }
function publicState(r, token) {
  const g = r.game; if (!g) return { room: r.code, players: [...r.players.values()].map(p => ({ id: p.id, name: p.name, bot: p.bot, connected: p.connected, score: p.score || 0, wins:p.wins||0, games:p.games||0, streak:p.streak||0, bestStreak:p.bestStreak||0 })), game: null, chat: r.chat || [], emotes: r.emotes || [] };
  const me = playerFor(r, token); const i = me ? g.seats.findIndex(s => s.id === me.id) : -1;
  return { room: r.code, players: [...r.players.values()].map(p => ({ id: p.id, name: p.name, bot: p.bot, connected: p.connected, score: p.score || 0, wins:p.wins||0, games:p.games||0, streak:p.streak||0, bestStreak:p.bestStreak||0 })), chat: r.chat || [], emotes: r.emotes || [], game: {
    type: g.type, names: g.seats.map(s => s.name), counts: g.hands.map(h => h.length), turn: g.turn, winner: g.winner, matchWinner:g.matchWinner??-1, targetPoints:500, roundPoints:g.roundPoints||0,
    last: g.last, message: g.message, scores: g.scores, direction: g.direction, color: g.color, top: g.top,
    hand: i >= 0 ? g.hands[i] : [], mySeat: i, myTurn: i >= 0 && i === g.turn && g.winner < 0 && !(g.turnLockUntil>Date.now()), turnLocked: !!(g.turnLockUntil>Date.now()), turnLockUntil:g.turnLockUntil||0,
    samCalled: g.samCalled, passes: g.passes, history:g.history||[], turnDeadline:g.turnDeadline||0,
    drawnCardSeat:g.drawnCardSeat??-1, drawnCard:g.drawnCardSeat===i?g.drawnCard:null,
    unoPendingSeat:g.unoPendingSeat??-1, unoCalled:g.unoCalledSeat===g.unoPendingSeat,
    pendingDraw:g.pendingDraw?{seat:g.pendingDraw.seat,amount:g.pendingDraw.amount,type:g.pendingDraw.type}:null
  } };
}
function send(r) { for (const entry of r.events) { const p = playerFor(r, entry.token); if (!p || !entry.res.writable || entry.res.destroyed) continue; try { entry.res.write(`data: ${JSON.stringify(publicState(r, entry.token))}\n\n`); } catch {} } }
function nextTurn(g, steps = 1) { const n = g.seats.length; g.turn = (g.turn + g.direction * steps % n + n) % n; }
function delayTurn(r,g,seat){g.pendingTurn=seat;g.turnLockUntil=Date.now()+3000;g.turnDeadline=g.turnLockUntil+25000;if(r.effectTimer)clearTimeout(r.effectTimer);r.effectTimer=setTimeout(()=>{if(r.game!==g||g.winner>=0)return;g.turn=g.pendingTurn;delete g.pendingTurn;g.turnLockUntil=0;g.turnDeadline=Date.now()+25000;send(r);scheduleBot(r);},3000);}
function delayNextTurn(r,g,steps=1){const n=g.seats.length;delayTurn(r,g,(g.turn+g.direction*steps%n+n)%n);}
function makeSamDeck() { const d = []; for (let rank = 3; rank <= 15; rank++) for (let suit = 0; suit < 4; suit++) d.push(rank * 4 + suit); return shuffle(d); }
function samCombo(cards) { if (!Array.isArray(cards) || !cards.length) return null; const ranks = cards.map(c => c >> 2).sort((a,b) => a-b); if (ranks.every(x => x === ranks[0])) return { kind: 'set', size: ranks.length, high: ranks[0] }; if (ranks.length >= 3 && ranks[ranks.length-1] < 15 && ranks.every((x,i) => i === 0 || x === ranks[i-1] + 1)) return { kind: 'run', size: ranks.length, high: ranks.at(-1) }; return null; }
function beats(a,b) {
  if (!b) return true;
  // Tứ quý chặt một lá 2; tứ quý cùng loại lớn hơn cũng chặt tứ quý nhỏ hơn.
  if (a.kind === 'set' && a.size === 4 && b.kind === 'set' && b.size === 1 && b.high === 15) return true;
  return a.kind === b.kind && a.size === b.size && a.high > b.high;
}
function canFinishSam(cards, hand) { const remaining = hand.filter(card => !cards.includes(card)); if (!remaining.length) return !cards.some(card => (card >> 2) === 15); return !(remaining.length === 1 && (remaining[0] >> 2) === 15); }
function findSamMove(hand, lastCombo) {
  const cards = hand.slice().sort((a,b) => (a >> 2) - (b >> 2));
  let best = null;
  function visit(start, picked) {
    if (picked.length) {
      const combo = canFinishSam(picked, hand) ? samCombo(picked) : null;
      if (combo && beats(combo, lastCombo)) {
        if (!best || picked.length < best.length || (picked.length === best.length && combo.high < best.combo.high)) best = { cards: picked.slice(), combo };
      }
    }
    if (picked.length >= 10) return;
    for (let i=start;i<cards.length;i++) { picked.push(cards[i]); visit(i+1,picked); picked.pop(); }
  }
  visit(0,[]);
  return best;
}
function unoDeck() { const d=[]; for (const c of 'RGBY') { d.push(c+'0'); for (let n=1;n<=9;n++) d.push(c+n,c+n); for (const v of ['S','V','D']) d.push(c+v,c+v); } for(let i=0;i<4;i++) d.push('WW','WF'); return shuffle(d); }
function startGame(r, type) {
  if ([...r.players.values()].some(p => (p.score||0) >= 500)) return false;
  const seats = [...r.players.values()].filter(p => p.connected || p.bot).slice(0, type === 'sam' ? 5 : 6);
  if (seats.length < 2) return false;
  const g = { type, seats, hands: [], turn: 0, winner: -1, last: [], message: '', history:[], turnDeadline:Date.now()+25000, scores: seats.map(p => p.score || 0), direction: 1, color: '', top: '', samCalled: -1, passes: [], lastCombo: null, lastPlayer: -1, draw: [], discard: [], drawnCardSeat:-1, drawnCard:null, unoPendingSeat:-1, unoCalledSeat:-1, pendingDraw:null };
  if (type === 'sam') { const d = makeSamDeck(); g.hands = seats.map((_,i)=>d.slice(i*10,i*10+10).sort((a,b)=>a-b)); }
  else { const d=unoDeck(); g.hands=seats.map(()=>d.splice(0,7)); g.draw=d; g.top=g.draw.pop(); while(g.top[0]==='W'){g.draw.unshift(g.top);g.top=g.draw.pop();} g.color=g.top[0]; if(g.top[1]==='S'){g.turn=1%seats.length;g.message='Lá đầu tiên là Cấm lượt: người chơi đầu tiên bị bỏ lượt.';} else if(g.top[1]==='V'){g.direction=-1;g.turn=seats.length===2?1:seats.length-1;g.message='Lá đầu tiên là Đảo chiều: chiều chơi được đảo ngược.';} else if(g.top[1]==='D'){drawCards(g,0,2);g.turn=1%seats.length;g.message='Lá đầu tiên là +2: người chơi đầu tiên rút 2 lá và mất lượt.';} }
  r.game=g;addHistory(g,`Bắt đầu ván ${type==='sam'?'Sâm':'UNO'}`,-1,'start');send(r); return true;
}
function addHistory(g,text,seat=-1,type='info'){g.history=g.history||[];g.history.push({text,seat,type,at:Date.now()});if(g.history.length>60)g.history.shift();}
function unoCardPoints(card) { if(card[0]==='W') return 50; if(['S','V','D'].includes(card[1])) return 20; return Number(card[1])||0; }
function endGame(g, winner) { if (!g || g.winner >= 0 || !g.seats[winner]) return; const player=g.seats[winner]; const points=g.type==='uno'?g.hands.reduce((sum,hand,index)=>sum+(index===winner?0:hand.reduce((n,card)=>n+unoCardPoints(card),0)),0):1; g.roundPoints=points; player.score=(player.score||0)+points;player.wins=(player.wins||0)+1;player.games=(player.games||0)+1;player.streak=(player.streak||0)+1;player.bestStreak=Math.max(player.bestStreak||0,player.streak);for(let i=0;i<g.seats.length;i++)if(i!==winner){g.seats[i].games=(g.seats[i].games||0)+1;g.seats[i].streak=0;} g.scores[winner]=player.score; g.winner=winner;g.matchWinner=player.score>=500?winner:-1;g.turnDeadline=0; g.message=g.matchWinner>=0?`${player.name} đạt ${player.score} điểm và trở thành NHÀ VÔ ĐỊCH!`:`${player.name} thắng ván! +${points} điểm`;addHistory(g,g.message,winner,g.matchWinner>=0?'champion':'winner'); }
function drawCards(g, seat, count) {
  for (let n=0;n<count;n++) {
    if (!g.draw.length) {
      if (g.discard.length > 1) {
        const top=g.discard.pop();
        g.draw=shuffle(g.discard.splice(0));
        g.discard=[top];
      }
    }
    if (g.draw.length) g.hands[seat].push(g.draw.pop());
  }
}
function unoCanPlay(card,g) { return card[0]==='W'||card[0]===g.color||card[1]===g.top[1]; }
function act(r, p, command) {
  const g=r.game; if(!g || g.winner>=0) return {ok:false,error:'no_active_game'};
  if(g.turnLockUntil>Date.now()) return {ok:false,error:'effect_in_progress'};
  const i=g.seats.findIndex(s=>s.id===p.id); if(i<0) return {ok:false,error:'not_in_game'};
  if(g.type==='uno') {
    if(command.type==='catch_uno') {
      if(g.unoPendingSeat<0||g.unoCalledSeat===g.unoPendingSeat||i===g.unoPendingSeat) return {ok:false,error:'no_missed_uno'};
      drawCards(g,g.unoPendingSeat,2);
      addHistory(g,`${g.seats[g.unoPendingSeat].name} quên báo UNO và bị phạt rút 2 lá`,g.unoPendingSeat,'penalty');
      g.message=`${g.seats[g.unoPendingSeat].name} bị phạt 2 lá vì quên báo UNO`;
      g.unoPendingSeat=-1;g.unoCalledSeat=-1;delayTurn(r,g,g.turn);send(r);return {ok:true};
    }
    if(command.type==='uno') {
      if(i!==g.turn||g.hands[i].length!==2||g.unoCalledSeat===i) return {ok:false,error:'cannot_call_uno'};
      g.unoPendingSeat=i;
      g.unoCalledSeat=i;g.message=`${p.name} đã báo UNO!`;addHistory(g,`${p.name} báo UNO`,i,'uno');send(r);return {ok:true};
    }
    if(i!==g.turn) return {ok:false,error:'not_your_turn'};
    // A missed UNO can be caught until the next player takes an action.
    if(g.unoPendingSeat>=0&&g.unoCalledSeat!==g.unoPendingSeat&&g.unoPendingSeat!==i) {
      drawCards(g,g.unoPendingSeat,2);
      addHistory(g,`${g.seats[g.unoPendingSeat].name} quên báo UNO và bị phạt rút 2 lá`,g.unoPendingSeat,'penalty');
      g.unoPendingSeat=-1;g.unoCalledSeat=-1;
    } else if(g.unoPendingSeat>=0&&g.unoCalledSeat===g.unoPendingSeat&&g.unoPendingSeat!==i) {
      g.unoPendingSeat=-1;g.unoCalledSeat=-1;
    }
    if(g.pendingDraw) {
      const pd=g.pendingDraw;
      if(pd.seat!==i) return {ok:false,error:'not_your_turn'};
      if(command.type==='play') {
        const cards=Array.isArray(command.cards)?command.cards:[command.card];
        const h=g.hands[i];
        // Cho phép chồng +2 hoặc +4 bất kể màu và loại lá cộng trước đó.
        if(!cards.length||cards.some(c=>typeof c!=='string'||!['D','F'].includes(c[1]))||new Set(cards).size!==1||cards.length>2||cards.some(c=>h.filter(x=>x===c).length<cards.filter(x=>x===c).length)) return {ok:false,error:'must_stack_draw_card'};
        const card=cards[0];
        if(cards.length===2&&cards[0]!==cards[1]) return {ok:false,error:'pair_must_match'};
        for(const c of cards)h.splice(h.indexOf(c),1);
        g.discard.push(g.top);g.top=card;g.color=card[0]==='W'&&'RGBY'.includes(command.color)?command.color:card[0];
        pd.amount+=card[1]==='D'?2:4;pd.type=card[1];pd.offender=i;pd.seat=(i+g.direction+g.seats.length)%g.seats.length;
        g.drawnCardSeat=-1;g.drawnCard=null;addHistory(g,`${p.name} chồng ${card} · tổng phạt ${pd.amount} lá`,i,'play');
        if(!h.length){g.pendingDraw=null;endGame(g,i);}else{g.message=`Cộng dồn ${pd.amount} lá phạt!`;delayNextTurn(r,g);}return {ok:true};
      }
      if(command.type!=='accept_penalty') return {ok:false,error:'must_resolve_penalty'};
      drawCards(g,i,pd.amount);addHistory(g,`${p.name} rút ${pd.amount} lá phạt`,i,'penalty');
      g.pendingDraw=null;g.message=`${p.name} rút ${pd.amount} lá phạt và mất lượt`;delayNextTurn(r,g);return {ok:true};
    }
    if(command.type==='draw') {
      if(g.drawnCardSeat===i) return {ok:false,error:'already_drew'};
      drawCards(g,i,1);
      const drawn=g.hands[i][g.hands[i].length-1];
      addHistory(g,`${p.name} bốc 1 lá`,i,'draw');
      if(drawn&&unoCanPlay(drawn,g)) {g.drawnCardSeat=i;g.drawnCard=drawn;g.message='Lá vừa rút có thể đánh: bạn được chọn đánh hoặc bỏ lượt.';}
      else {g.drawnCardSeat=-1;g.drawnCard=null;g.message='Lá vừa rút không đánh được; lượt chuyển tiếp.';}
      delayNextTurn(r,g,g.drawnCardSeat===i?0:1);return {ok:true};
    }
    if(command.type==='pass_drawn') {
      if(g.drawnCardSeat!==i) return {ok:false,error:'cannot_pass'};
      g.drawnCardSeat=-1;g.drawnCard=null;g.message=`${p.name} bỏ lượt sau khi bốc bài`;delayNextTurn(r,g);return {ok:true};
    }
    if(command.type!=='play'||(!Array.isArray(command.cards)&&typeof command.card!=='string')) return {ok:false,error:'invalid_move'};
    const h=g.hands[i],cards=Array.isArray(command.cards)?command.cards:[command.card],card=cards[0];
    if(!cards.length||cards.some(c=>typeof c!=='string')||new Set(cards).size!==1||cards.length>2||cards.some(c=>h.filter(x=>x===c).length<cards.filter(x=>x===c).length))return {ok:false,error:'card_not_in_hand'};
    if(cards.length===2&&cards[0]!==cards[1])return {ok:false,error:'pair_must_match'};
    if(g.drawnCardSeat===i&&(!cards.includes(g.drawnCard)||cards.length!==1))return {ok:false,error:'must_play_drawn_card'};
    if(!unoCanPlay(card,g))return {ok:false,error:'card_not_playable'};
    
    const oldColor=g.color;
    for(const c of cards)h.splice(h.indexOf(c),1);g.discard.push(g.top);g.top=card;
    g.color=card[0]==='W'&&'RGBY'.includes(command.color)?command.color:card[0];
    g.drawnCardSeat=-1;g.drawnCard=null;
    addHistory(g,`${p.name} đánh ${card}`,i,'play');
    if(h.length===1){g.unoPendingSeat=i;if(g.unoCalledSeat!==i)g.unoCalledSeat=-1;}
    else if(h.length===0){g.unoPendingSeat=-1;g.unoCalledSeat=-1;}
    let steps=1;const next=(i+g.direction+g.seats.length)%g.seats.length,v=card[1];
    if(v==='V'){if(g.seats.length===2)steps=2;else g.direction*=-1;}
    else if(v==='S')steps=2;
    else if(v==='D'){g.pendingDraw={seat:next,amount:2,type:'D',offender:i};steps=1;}
    else if(v==='F'){g.pendingDraw={seat:next,amount:4,type:'F',offender:i};steps=1;}
    if(!h.length){endGame(g,i);g.pendingDraw=null;}
    else {delayNextTurn(r,g,steps);}
    return {ok:true};
  }
  if(i!==g.turn) return {ok:false,error:'not_your_turn'};
  if(g.type==='sam') {
    if(command.type==='call_sam') { if(g.last.length || g.samCalled>=0) return {ok:false,error:'cannot_call_sam'}; g.samCalled=i; g.message=`${p.name} báo Sâm!`;addHistory(g,`${p.name} báo Sâm`,i,'call');g.turnDeadline=Date.now()+25000; send(r); return {ok:true}; }
    if(command.type==='pass') { if(!g.last.length || !g.lastCombo || g.lastPlayer<0) return {ok:false,error:'cannot_pass'}; if(g.passes.includes(i)) return {ok:false,error:'already_passed'}; g.passes.push(i);addHistory(g,`${p.name} bỏ lượt`,i,'pass'); let target;if(g.passes.length>=g.seats.length-1){g.last=[];g.lastCombo=null;g.passes=[];target=g.lastPlayer;g.message='Vòng mới: người đánh trước tiếp tục';} else target=(g.turn+g.direction+g.seats.length)%g.seats.length;delayTurn(r,g,target); return {ok:true}; }
    if(command.type!=='play' || !Array.isArray(command.cards) || !command.cards.length || command.cards.length>10) return {ok:false,error:'invalid_move'};
    const hand=g.hands[i]; if(new Set(command.cards).size!==command.cards.length || !command.cards.every(c=>hand.includes(c))) return {ok:false,error:'cards_not_in_hand'};
    const combo=samCombo(command.cards); if(!combo || !beats(combo,g.lastCombo)) return {ok:false,error:'invalid_combo'};
    if(!canFinishSam(command.cards,hand)) return {ok:false,error:hand.length===command.cards.length?'cannot_finish_with_two':'cannot_leave_two_alone'};
    g.hands[i]=hand.filter(c=>!command.cards.includes(c));addHistory(g,`${p.name} đánh ${command.cards.length} lá`,i,'play'); g.last=[...command.cards].sort((a,b)=>a-b); g.lastCombo=combo; g.lastPlayer=i; g.passes=[]; g.message=`${p.name} đã đánh bài`;
    if(!g.hands[i].length) endGame(g,i); else delayNextTurn(r,g); return {ok:true};
  }
  return {ok:false,error:'invalid_move'};
}
function botMove(r) { const g=r.game; if(!g||g.winner>=0)return; const p=g.seats[g.turn]; if(!p || (!p.bot && p.connected))return; const h=g.hands[g.turn]; if(g.type==='sam'){const move=findSamMove(h,g.lastCombo); if(move)act(r,p,{type:'play',cards:move.cards}); else if(g.last.length)act(r,p,{type:'pass'}); else { const fallback=h.length?[h.slice().sort((a,b)=>(a>>2)-(b>>2))[0]]:[]; if(fallback.length){const remaining=h.filter(card=>!fallback.includes(card));if(remaining.length===1&&(remaining[0]>>2)===15){const alternative=h.find(card=>card!==(fallback[0])&&((h.filter(x=>x!==card).length!==1)||((h.find(x=>x!==card)>>2)!==15)));if(alternative!==undefined)act(r,p,{type:'play',cards:[alternative]});else {g.message=`${p.name} không thể đánh lá 2 cuối cùng; lượt được chuyển tiếp.`;addHistory(g,g.message,g.turn,'timeout');nextTurn(g);g.turnDeadline=Date.now()+25000;}}else act(r,p,{type:'play',cards:fallback});} }} else {if(g.pendingDraw){act(r,p,{type:'accept_penalty'});}else if(h.length===2&&g.unoCalledSeat!==g.turn){act(r,p,{type:'uno'});const k=h.find(c=>unoCanPlay(c,g));if(k)act(r,p,{type:'play',card:k,color:'G'});else act(r,p,{type:'draw'});}else if(g.drawnCardSeat===g.turn){const k=g.drawnCard;if(k&&unoCanPlay(k,g))act(r,p,{type:'play',card:k,color:'G'});else act(r,p,{type:'pass_drawn'});}else{const k=h.find(c=>unoCanPlay(c,g));if(k)act(r,p,{type:'play',card:k,color:'G'});else act(r,p,{type:'draw'});}} send(r); }
function scheduleBot(r) { if(r.botTimer)clearTimeout(r.botTimer);if(r.turnTimer)clearTimeout(r.turnTimer); const g=r.game;if(!g||g.winner>=0)return;const deadline=g.turnDeadline||Date.now()+25000;r.turnTimer=setTimeout(()=>{if(!r.game||r.game!==g||g.winner>=0)return;const p=g.seats[g.turn];if(!p)return;if(g.type==='sam'){if(g.last.length)act(r,p,{type:'pass'});else{const move=findSamMove(g.hands[g.turn],null);if(move)act(r,p,{type:'play',cards:move.cards});else{g.message=`${p.name} hết thời gian; lượt được bỏ qua`;addHistory(g,g.message,g.turn,'timeout');nextTurn(g);g.turnDeadline=Date.now()+25000;}}}else{act(r,p,{type:'draw'});}send(r);scheduleBot(r);},Math.max(0,deadline-Date.now()));if(g.seats[g.turn]?.bot||!g.seats[g.turn]?.connected)r.botTimer=setTimeout(()=>{botMove(r);scheduleBot(r);},Math.max(700,(g.turnLockUntil||0)-Date.now()+100)); }
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'sam-uno',rooms:rooms.size,uptimeSeconds:Math.floor(process.uptime())});
  if(req.method==='GET'&&url.pathname==='/') { try {res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});return res.end(fs.readFileSync(path.join(__dirname,'index.html')));} catch{return json(res,500,{ok:false,error:'index_missing'});} }
  if(req.method==='POST'&&url.pathname==='/api/join') { try {const d=await readBody(req); if(!validCode(d.room||'chung'))return json(res,400,{ok:false,error:'invalid_room'}); const r=roomFor(d.room||'chung',true);if(!r)return json(res,503,{ok:false,error:'room_limit'});let p=d.token&&playerFor(r,d.token); if(!p){if(r.players.size>=LIMITS.maxPlayers)return json(res,409,{ok:false,error:'room_full'});p={id:id(),token:id(),name:String(d.name||'Người chơi').trim().slice(0,LIMITS.name)||'Người chơi',connected:true,bot:false,score:0,wins:0,games:0,streak:0,bestStreak:0,res:null};r.players.set(p.id,p);}else{p.connected=true;p.disconnectedAt=null;p.name=String(d.name||p.name).trim().slice(0,LIMITS.name)||p.name;}r.emptyAt=null;json(res,200,{ok:true,token:p.token,id:p.id,state:publicState(r,p.token)});send(r);return;}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='GET'&&url.pathname==='/api/events') {const code=url.searchParams.get('room'),token=url.searchParams.get('token'),r=roomFor(code,false),p=r&&playerFor(r,token);if(!p)return json(res,401,{ok:false,error:'unauthorized'});res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache, no-transform','connection':'keep-alive','x-accel-buffering':'no'});res.write('retry: 2000\n\n');const entry={token,res};r.events.add(entry);p.res=res;p.connected=true;p.disconnectedAt=null;res.write(`data: ${JSON.stringify(publicState(r,token))}\n\n`);const timer=setInterval(()=>{if(!res.destroyed)res.write(': ping\n\n');},20000);res.on('close',()=>{clearInterval(timer);r.events.delete(entry);if(p.res===res){p.res=null;p.connected=false;p.disconnectedAt=Date.now();setTimeout(()=>{if(!p.connected&&p.disconnectedAt&&Date.now()-p.disconnectedAt>=LIMITS.grace){if(!r.game||r.game.winner>=0)r.players.delete(p.id);if(!r.players.size)r.emptyAt=Date.now();send(r);}},LIMITS.grace);send(r);scheduleBot(r);}});return; }

  if(req.method==='POST'&&url.pathname==='/api/chat') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&playerFor(r,d.token);if(!p)return json(res,401,{ok:false,error:'unauthorized'});const message=String(d.message||'').trim();if(!message)return json(res,400,{ok:false,error:'empty_message'});if(message.length>180)return json(res,400,{ok:false,error:'message_too_long'});r.chat=r.chat||[];r.chat.push({id:id(),name:p.name,text:message.slice(0,180),at:Date.now()});if(r.chat.length>40)r.chat.splice(0,r.chat.length-40);send(r);return json(res,200,{ok:true});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/emote') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&playerFor(r,d.token);if(!p)return json(res,401,{ok:false,error:'unauthorized'});const allowed=['😀','😂','😍','😮','😢','😎','👏','🔥','🎉','💪','🤔','❤️'];if(!allowed.includes(d.emote))return json(res,400,{ok:false,error:'invalid_emote'});r.emotes=r.emotes||[];r.emotes.push({id:id(),name:p.name,emote:d.emote,at:Date.now()});if(r.emotes.length>12)r.emotes.splice(0,r.emotes.length-12);send(r);return json(res,200,{ok:true});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/action') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&playerFor(r,d.token);if(!p)return json(res,401,{ok:false,error:'unauthorized'});const result=act(r,p,d.command||{});if(result.ok){send(r);scheduleBot(r);}return json(res,result.ok?200:400,result);}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/start') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&playerFor(r,d.token);if(!p)return json(res,401,{ok:false,error:'unauthorized'});if(r.game&&r.game.winner<0)return json(res,409,{ok:false,error:'game_in_progress'});const type=d.game==='uno'?'uno':'sam';if(!startGame(r,type))return json(res,400,{ok:false,error:'need_two_players'});scheduleBot(r);return json(res,200,{ok:true});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/bot') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&playerFor(r,d.token);if(!p)return json(res,401,{ok:false,error:'unauthorized'});if(r.players.size>=LIMITS.maxPlayers)return json(res,409,{ok:false,error:'room_full'});const bot={id:id(),token:id(),name:`Bot ${[...r.players.values()].filter(x=>x.bot).length+1}`,connected:true,bot:true,score:0,wins:0,games:0,streak:0,bestStreak:0};r.players.set(bot.id,bot);send(r);return json(res,200,{ok:true});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/lobby') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&playerFor(r,d.token);if(!p)return json(res,401,{ok:false,error:'unauthorized'});r.game=null;send(r);return json(res,200,{ok:true});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  return json(res,404,{ok:false,error:'not_found'});
});
const cleanup=setInterval(()=>{const now=Date.now();for(const [code,r] of rooms){for(const [pid,p] of r.players)if(!p.connected&&!p.bot&&p.disconnectedAt&&now-p.disconnectedAt>LIMITS.grace&&!r.game)r.players.delete(pid);if(!r.players.size&&r.emptyAt&&now-r.emptyAt>LIMITS.ttl){if(r.botTimer)clearTimeout(r.botTimer);if(r.effectTimer)clearTimeout(r.effectTimer);rooms.delete(code);}}},30000);
cleanup.unref();
function shutdown(){clearInterval(cleanup);for(const r of rooms.values()){if(r.botTimer)clearTimeout(r.botTimer);if(r.turnTimer)clearTimeout(r.turnTimer);if(r.effectTimer)clearTimeout(r.effectTimer);for(const e of r.events)e.res.end();}server.close(()=>process.exit(0));}
if (require.main === module) { server.listen(PORT,()=>console.log(`Sam & UNO server listening on ${PORT}`)); process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown); }
module.exports={samCombo,beats,canFinishSam,findSamMove,endGame,publicState,rooms,server,act,unoDeck,unoCardPoints};
