'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const CaroEngine = require('./games/caro-engine');
const { createInvite, getInvite, revokeInvite } = require('./room-invites');
const PUZZLE_WORDS = [['hanh tinh','Thiên thể chuyển động quanh một ngôi sao.'],['may tinh','Thiết bị dùng để xử lý thông tin.'],['thu vien','Nơi lưu trữ và cho mượn sách.'],['cau vong','Hiện tượng nhiều màu xuất hiện sau mưa.'],['ban do','Hình thể hiện vị trí và địa hình.'],['trong dong','Nhạc cụ gõ truyền thống của Việt Nam.'],['mat troi','Ngôi sao ở trung tâm hệ hành tinh của chúng ta.'],['dong vat','Những sinh vật có thể di chuyển và cảm nhận.'],['thien van','Ngành khoa học nghiên cứu các thiên thể.'],['bien dao','Vùng nước mặn rộng lớn và các hòn đảo.'],['bao tang','Nơi trưng bày hiện vật lịch sử và nghệ thuật.'],['dien anh','Nghệ thuật kể chuyện bằng hình ảnh chuyển động.'],['am nhac','Nghệ thuật kết hợp giai điệu và âm thanh.'],['the thao','Hoạt động rèn luyện thể chất và thi đấu.'],['robot','Máy móc có thể thực hiện nhiệm vụ tự động.'],['du hanh','Chuyến đi khám phá những nơi xa.'],['sinh hoc','Môn khoa học nghiên cứu sự sống.'],['vat ly','Môn khoa học nghiên cứu vật chất và năng lượng.'],['hoa hoc','Môn khoa học nghiên cứu các chất.'],['la ban','Dụng cụ xác định phương hướng.'],['kinh hien vi','Dụng cụ giúp quan sát vật rất nhỏ.'],['kinh thien van','Dụng cụ quan sát các vật thể trên trời.'],['may anh','Thiết bị ghi lại hình ảnh.'],['duong sat','Hệ thống giao thông chạy trên đường ray.'],['xe dap','Phương tiện có hai bánh và bàn đạp.'],['may bay','Phương tiện di chuyển trên không trung.'],['tau ngam','Phương tiện có thể hoạt động dưới mặt nước.'],['cay xanh','Thực vật thường có lá và thân.'],['hoa sen','Loài hoa thường mọc trên mặt nước.'],['con tho','Động vật có tai dài và thích ăn cà rốt.'],['chim canh cut','Loài chim sống ở vùng băng giá.'],['ca heo','Động vật biển thông minh thường nhảy khỏi mặt nước.'],['ngua van','Loài thú có bộ lông sọc đen trắng.'],['voi','Động vật lớn có chiếc vòi dài.'],['huou cao co','Động vật có chiếc cổ rất dài.'],['mat trang','Vệ tinh tự nhiên của Trái Đất.'],['sao bang','Vệt sáng xuất hiện khi thiên thạch đi vào khí quyển.'],['he mat troi','Mặt Trời và các thiên thể quay quanh nó.'],['nang luong','Khả năng sinh công hoặc tạo ra biến đổi.'],['lap trinh','Công việc viết chỉ dẫn cho máy tính.'],['du lieu','Thông tin được lưu trữ và xử lý.'],['internet','Mạng kết nối các thiết bị trên toàn thế giới.'],['mat khau','Dãy ký tự dùng để bảo vệ tài khoản.'],['ban phim','Thiết bị dùng để nhập chữ vào máy tính.'],['chuot may tinh','Thiết bị điều khiển con trỏ trên màn hình.'],['man hinh','Bộ phận hiển thị hình ảnh của máy tính.'],['phim hoat hinh','Tác phẩm hình ảnh chuyển động thường dành cho thiếu nhi.'],['truyen tranh','Câu chuyện được kể bằng các khung hình.'],['cuon sach','Vật chứa nhiều trang giấy có nội dung.'],['but chi','Dụng cụ viết có thể tẩy được.'],['dong ho','Dụng cụ dùng để xem giờ.'],['lich','Bảng hoặc quyển cho biết ngày tháng.'],['may loc nuoc','Thiết bị giúp làm sạch nước.'],['den pin','Dụng cụ chiếu sáng dùng pin.'],['tu lanh','Thiết bị giữ thực phẩm ở nhiệt độ thấp.'],['quat dien','Thiết bị tạo gió làm mát.'],['bong da','Môn thể thao có hai đội tranh tài bằng chân.'],['bong ro','Môn thể thao đưa bóng vào rổ.'],['boi loi','Môn thể thao di chuyển trong nước.'],['co vua','Trò chơi trí tuệ trên bàn 64 ô.'],['co caro','Trò chơi nối các quân thành hàng.'],['xep hinh','Trò chơi ghép các mảnh thành hình hoàn chỉnh.'],['giai ma','Tìm ra ý nghĩa của thông tin bí ẩn.'],['toan hoc','Môn học nghiên cứu con số và phép tính.'],['lich su','Môn học tìm hiểu những sự kiện trong quá khứ.'],['van hoc','Lĩnh vực sáng tác và nghiên cứu tác phẩm chữ nghĩa.'],['ngoai ngu','Ngôn ngữ được học ngoài tiếng mẹ đẻ.'],['hanh phuc','Cảm giác vui vẻ và mãn nguyện.'],['tinh ban','Mối quan hệ thân thiết giữa những người bạn.'],['gia dinh','Những người thân cùng gắn bó với nhau.'],['truong hoc','Nơi học sinh đến học tập.'],['lop hoc','Không gian hoặc nhóm học sinh cùng học.'],['thay giao','Người làm công việc giảng dạy.'],['hoc sinh','Người đang theo học tại trường.'],['thuoc ke','Dụng cụ dùng để đo và kẻ đường thẳng.'],['tam giac','Hình có ba cạnh và ba góc.'],['hinh tron','Hình phẳng có đường biên cách đều tâm.'],['hinh vuong','Hình có bốn cạnh bằng nhau và bốn góc vuông.'],['hinh chu nhat','Hình có bốn góc vuông và hai cặp cạnh đối bằng nhau.'],['trai dat','Hành tinh chúng ta đang sinh sống.'],['khong khi','Hỗn hợp khí bao quanh chúng ta.'],['thac nuoc','Dòng nước đổ từ trên cao xuống.'],['ngon nui','Phần đỉnh cao của một ngọn núi.'],['sa mac','Vùng đất khô cằn có rất ít mưa.'],['rung nhiet doi','Khu rừng nóng ẩm có nhiều sinh vật.'],['dong bang','Vùng đất rộng và tương đối bằng phẳng.'],['song ngoi','Dòng nước tự nhiên chảy liên tục.'],['hoa qua','Tên gọi chung của các loại quả.'],['rau cu','Nhóm thực phẩm có nguồn gốc từ thực vật.'],['banh mi','Món ăn thường làm từ bột mì nướng.'],['pho','Món nước nổi tiếng của Việt Nam.'],['com tam','Món ăn quen thuộc làm từ gạo tấm.'],['goi cuon','Món ăn cuốn bánh tráng với rau và nhân.'],['nuoc bien','Nước mặn chiếm phần lớn bề mặt Trái Đất.'],['ca phe','Thức uống được pha từ hạt rang xay.'],['tra xanh','Thức uống được pha từ lá trà.'],['kem','Món tráng miệng lạnh thường có vị ngọt.'],['mat ong','Chất ngọt tự nhiên do ong tạo ra.']];
const SUDOKU_PUZZLES=[['530070000600195000098000060800060003400803001700020006060000280000419005000080079','534678912672195348198342567859761423426853791713924856961537284287419635345286179'],['004000900090020005500000006020004010000080000080100090700000003300010060006000800','264571938193826475578349126927654813451983672683127594715468293348219567926735841']];
const MONOPOLY_SPACES = [['BẮT ĐẦU','start',0],['Phố Hoa','property',120],['Cơ hội','chance',0],['Đại lộ Xanh','property',160],['Thuế thành phố','tax',100],['Bến cảng','property',180],['Nhà tù','jail',0],['Phố Ánh Dương','property',200],['Quỹ cộng đồng','chance',0],['Trung tâm','property',240],['Bãi đỗ xe','rest',0],['Khu vườn','property',260],['Thuế xa xỉ','tax',120],['Phố Biển','property',300],['Cơ hội','chance',0],['Khu thương mại','property',340]];
const { Chess } = require('./games/chess-engine');
const { databaseEnabled, initDatabase, getOrCreateProfile, saveProfile, globalLeaderboard, createAccount, loginAccount, getSessionUser, deleteSession, updateAccountProfile, publicProfile, recordMatch, matchHistory, closeDatabase } = require('./database');

const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();
const roomInvites = new Map();
const ONLINE_GAME_TYPES = ['sam','uno','caro','chess','monopoly','sudoku','word','sequence'];
const LIMITS = { roomCode: 20, name: 24, maxRooms: 1000, maxPlayers: 6, body: 8192, grace: 120000, ttl: 300000 };
const authAttempts = new Map();
function readCookie(req, name) { const raw=String(req.headers.cookie||''); for(const part of raw.split(';')){const at=part.trim().indexOf('=');if(at<0)continue;if(part.trim().slice(0,at)===name){try{return decodeURIComponent(part.trim().slice(at+1));}catch{return '';}}}return ''; }
function writeSessionCookie(res, req, token, clear=false) { const secure=process.env.NODE_ENV==='production'||req.headers['x-forwarded-proto']==='https';res.setHeader('set-cookie', 'samuno_session='+(clear?'':encodeURIComponent(token))+'; HttpOnly; SameSite=Lax; Path=/; Max-Age='+(clear?'0':String(30*24*60*60))+(secure?'; Secure':'')); }
function authRateLimited(req) { const key=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();const now=Date.now(),entry=authAttempts.get(key)||{count:0,start:now};if(now-entry.start>15*60*1000){entry.count=0;entry.start=now;}entry.count++;authAttempts.set(key,entry);if(authAttempts.size>2000)for(const [k,v] of authAttempts)if(now-v.start>15*60*1000)authAttempts.delete(k);return entry.count>10; }
function clearAuthAttempts(req) { const key=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();authAttempts.delete(key); }
const id = () => crypto.randomBytes(18).toString('hex');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const validCode = s => typeof s === 'string' && s.length > 0 && s.length <= LIMITS.roomCode && /^[a-zA-Z0-9_-]+$/.test(s);
const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); };
function readBody(req) { return new Promise((resolve, reject) => { let data = ''; req.on('data', c => { data += c; if (Buffer.byteLength(data) > LIMITS.body) { reject(new Error('too_large')); req.destroy(); } }); req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('bad_json')); } }); req.on('error', reject); }); }
function roomFor(code, create = false) { let r = rooms.get(code); if (!r && create && rooms.size < LIMITS.maxRooms) { r = { code, players: new Map(), game: null, gameType: null, events: new Set(), emptyAt: null, createdAt: Date.now(), chat: [], emotes: [], notifications: [], isPrivate:false, hostId:null }; rooms.set(code, r); } return r; }
function playerFor(r, token) { for (const p of r.players.values()) if (p.token === token) return p; return null; }
async function authorizedPlayer(r, token, req) { const p=r&&playerFor(r,token);if(!p)return null;if(p.accountUserId){const user=await getSessionUser(readCookie(req,'samuno_session'));if(!user||user.id!==p.accountUserId)return null;}return p; }
function transferHost(r, departingId) { if (r.hostId===departingId) r.hostId=[...r.players.values()].find(p=>p.id!==departingId&&!p.bot)?.id||[...r.players.values()].find(p=>p.id!==departingId)?.id||null; }
function publicRooms(gameType = null) {
  return [...rooms.values()].filter(r => {
    if (r.isPrivate || !r.gameType || (gameType && r.gameType !== gameType) || r.game) return false;
    const connected = [...r.players.values()].filter(p => !p.bot && p.connected);
    const capacity = ['caro','chess'].includes(r.gameType) ? 2 : r.gameType==='monopoly' ? 4 : LIMITS.maxPlayers;
    return connected.length > 0 && connected.length < capacity;
  }).map(r => {
    const players = [...r.players.values()].filter(p => !p.bot && p.connected);
    const host = players.find(p => p.id === r.hostId) || players[0];
    return { room:r.code, gameType:r.gameType, hostName:host?.name || 'Người chơi', hostAvatar:host?.avatar || '🎴', playerCount:players.length, maxPlayers:['caro','chess'].includes(r.gameType)?2:r.gameType==='monopoly'?4:LIMITS.maxPlayers, status:'waiting', createdAt:r.createdAt || 0 };
  }).sort((a,b) => a.createdAt - b.createdAt).slice(0,100);
}
function publicState(r, token) {
  const me = playerFor(r, token), g = r.game;
  const players = [...r.players.values()].map(p => ({ id:p.id, name:p.name, avatar:p.avatar||'🎴', bot:p.bot, connected:p.connected, score:p.score||0, wins:p.wins||0, games:p.games||0, streak:p.streak||0, bestStreak:p.bestStreak||0, stats:p.stats||{} }));
  const base = { room:r.code, gameType:r.gameType||null, isPrivate:!!r.isPrivate, isHost:!!(me&&me.id===r.hostId), persistentProfiles:databaseEnabled(), players, chat:r.chat||[], emotes:r.emotes||[], notifications:r.notifications||[] };
  if (!g) return { ...base, game:null };
  const i = me ? g.seats.findIndex(s => s.id === me.id) : -1;
  if (g.type === 'caro') return { ...base, game:{ type:'caro', mode:g.mode, board:g.board, turn:g.turn, winner:g.winner, draw:!!g.draw, mySeat:i, myTurn:i>=0&&i===g.turn&&g.winner<0&&!g.draw, lines:g.lines||[], scoreX:g.scoreX||0, scoreO:g.scoreO||0, moveCount:g.moveCount||0, message:g.message||'' } };
  if (g.type === 'chess') return { ...base, game:{ type:'chess', fen:g.chess.fen(), board:g.chess.board(), turn:g.turn, winner:g.winner, draw:!!g.draw, reason:g.reason||'', mySeat:i, myTurn:i>=0&&i===g.turn&&g.winner<0&&!g.draw, history:g.chess.history(), lastMove:g.lastMove||null, moveCount:g.moveCount||0 } };
  if (g.type === 'monopoly') return { ...base, game:{ type:'monopoly', turn:g.turn, winner:g.winner, rolled:g.rolled, lastRoll:g.lastRoll, message:g.message, spaces:MONOPOLY_SPACES, players:g.seats.map((p,index)=>({id:p.id,name:p.name,seat:index,money:g.money[index],position:g.positions[index],alive:g.alive[index]})), owners:g.owners, mySeat:i, myTurn:i>=0&&i===g.turn&&g.winner<0 } };
  if(['sudoku','word','sequence'].includes(g.type))return {...base,game:puzzlePublicState(g,me||{id:''})};
  return { ...base, game: {
    type:g.type, names:g.seats.map(s=>s.name), counts:g.hands.map(h=>h.length), turn:g.turn, winner:g.winner, matchWinner:g.matchWinner??-1, targetPoints:500, roundPoints:g.roundPoints||0,
    last:g.last, message:g.message, scores:g.scores, direction:g.direction, color:g.color, top:g.top,
    hand:i>=0?g.hands[i]:[], mySeat:i, myTurn:i>=0&&i===g.turn&&g.winner<0&&!(g.turnLockUntil>Date.now()), turnLocked:!!(g.turnLockUntil>Date.now()), turnLockUntil:g.turnLockUntil||0,
    samCalled:g.samCalled, passes:g.passes, history:g.history||[], turnDeadline:g.turnDeadline||0,
    drawnCardSeat:g.drawnCardSeat??-1, drawnCard:g.drawnCardSeat===i?g.drawnCard:null,
    unoPendingSeat:g.unoPendingSeat??-1, unoCalled:g.unoCalledSeat===g.unoPendingSeat,
    pendingDraw:g.pendingDraw?{seat:g.pendingDraw.seat,amount:g.pendingDraw.amount,type:g.pendingDraw.type}:null
  } };
}
function send(r) { for (const entry of r.events) { const p = playerFor(r, entry.token); if (!p || !entry.res.writable || entry.res.destroyed) continue; try { entry.res.write(`data: ${JSON.stringify(publicState(r, entry.token))}\n\n`); } catch {} } }
function pushRoomNotification(r, type, message) { if (!r) return; r.notifications = r.notifications || []; r.notifications.push({ id:id(), type, message:String(message||'').slice(0,180), at:Date.now() }); if (r.notifications.length > 30) r.notifications.splice(0, r.notifications.length - 30); }
function readGamePage(file) { return fs.readFileSync(file, 'utf8').replace(/<\/body>/i, '<script src="/invite-client.js" defer></script></body>'); }
function nextTurn(g, steps = 1) { const n = g.seats.length; g.turn = (g.turn + g.direction * steps % n + n) % n; }
function delayTurn(r,g,seat){g.pendingTurn=seat;g.turnLockUntil=Date.now()+3000;g.turnDeadline=g.turnLockUntil+30000;if(r.effectTimer)clearTimeout(r.effectTimer);r.effectTimer=setTimeout(()=>{if(r.game!==g||g.winner>=0)return;g.turn=g.pendingTurn;delete g.pendingTurn;g.turnLockUntil=0;g.turnDeadline=Date.now()+30000;send(r);scheduleBot(r);},3000);if(r.effectTimer&&typeof r.effectTimer.unref==='function')r.effectTimer.unref();}
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
        if (!best || (lastCombo ? picked.length < best.cards.length : picked.length > best.cards.length) || (picked.length === best.cards.length && combo.high < best.combo.high)) best = { cards: picked.slice(), combo };
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
  const g = { type, seats, hands: [], turn: 0, winner: -1, last: [], message: '', history:[], turnDeadline:Date.now()+30000, scores: seats.map(p => p.score || 0), direction: 1, color: '', top: '', samCalled: -1, passes: [], lastCombo: null, lastPlayer: -1, draw: [], discard: [], drawnCardSeat:-1, drawnCard:null, unoPendingSeat:-1, unoCalledSeat:-1, pendingDraw:null };
  if (type === 'sam') { const d = makeSamDeck(); g.hands = seats.map((_,i)=>d.slice(i*10,i*10+10).sort((a,b)=>a-b)); }
  else { const d=unoDeck(); g.hands=seats.map(()=>d.splice(0,7)); g.draw=d; g.top=g.draw.pop(); while(g.top[0]==='W'){g.draw.unshift(g.top);g.top=g.draw.pop();} g.color=g.top[0]; if(g.top[1]==='S'){g.turn=1%seats.length;g.message='Lá đầu tiên là Cấm lượt: người chơi đầu tiên bị bỏ lượt.';} else if(g.top[1]==='V'){g.direction=-1;g.turn=seats.length===2?1:seats.length-1;g.message='Lá đầu tiên là Đảo chiều: chiều chơi được đảo ngược.';} else if(g.top[1]==='D'){drawCards(g,0,2);g.turn=1%seats.length;g.message='Lá đầu tiên là +2: người chơi đầu tiên rút 2 lá và mất lượt.';} }
  r.game=g;addHistory(g,`Bắt đầu ván ${type==='sam'?'Sâm':'UNO'}`,-1,'start');send(r); return true;
}
function startCaroGame(r) {
  const seats=[...r.players.values()].filter(p=>!p.bot&&p.connected).slice(0,2);
  if(seats.length!==2)return false;
  r.game={type:'caro',mode:r.caroMode==='infinite'?'infinite':'normal',seats,board:CaroEngine.empty(),turn:0,winner:-1,draw:false,lines:[],scoreX:0,scoreO:0,moveCount:0,message:'X đi trước.'};
  send(r);return true;
}
function startPuzzleGame(r,type) { const seats=[...r.players.values()].filter(p=>!p.bot&&p.connected).slice(0,LIMITS.maxPlayers);if(seats.length<2)return false;const g={type,seats,winner:-1,startedAt:Date.now(),progress:{}};if(type==='sudoku'){const pair=SUDOKU_PUZZLES[crypto.randomInt(SUDOKU_PUZZLES.length)];g.puzzle=pair[0].split('').map(Number);g.solution=pair[1].split('').map(Number);}else if(type==='word'){const pair=PUZZLE_WORDS[crypto.randomInt(PUZZLE_WORDS.length)];g.answer=pair[0];g.clue=pair[1];}else{g.sequence=shuffle(Array.from({length:16},(_,i)=>i)).slice(0,8);}for(const p of seats)g.progress[p.id]={values:g.puzzle?g.puzzle.slice():null,guesses:[],wrong:0,next:0,score:0,done:false,finishedAt:0};r.game=g;send(r);return true;}
function puzzleAction(g,player,command){if(!g||!['sudoku','word','sequence'].includes(g.type)||g.winner>=0)return {ok:false,error:'game_finished'};const p=g.progress[player.id];if(!p||p.done)return {ok:false,error:'already_finished'};const c=command||{};if(g.type==='sudoku'){const index=Number(c.index),value=Number(c.value);if(!Number.isInteger(index)||index<0||index>=81||!Number.isInteger(value)||value<0||value>9||g.puzzle[index])return {ok:false,error:'invalid_cell'};p.values[index]=value;const correctMove=value===0||value===g.solution[index];if(value&&!correctMove)p.wrong++;const box=Math.floor(index/27)*3+Math.floor((index%9)/3),boxIndexes=Array.from({length:81},(_,i)=>i).filter(i=>Math.floor(i/27)*3+Math.floor((i%9)/3)===box);const boxCompleted=boxIndexes.every(i=>p.values[i]===g.solution[i]);const correct=p.values.reduce((n,v,i)=>n+(v===g.solution[i]&&!g.puzzle[i]?1:0),0);p.score=Math.max(0,correct*10-p.wrong*3);if(p.values.every((v,i)=>v===g.solution[i])){p.done=true;p.finishedAt=Date.now();p.score+=100;}p.lastAction={index,value,correct:correctMove,boxCompleted,won:p.done};if(g.seats.every(seat=>g.progress[seat.id].done)){const ranked=g.seats.slice().sort((a,b)=>g.progress[b.id].score-g.progress[a.id].score||g.progress[a.id].finishedAt-g.progress[b.id].finishedAt);g.winner=g.seats.findIndex(seat=>seat.id===ranked[0].id);}return {ok:true};}if(g.type==='word'){const letter=String(c.letter||'').toLowerCase();if(!/^[a-z]$/.test(letter)||p.guesses.includes(letter))return {ok:false,error:'invalid_guess'};p.guesses.push(letter);const correct=g.answer.includes(letter);if(!correct)p.wrong++;const won=[...g.answer].filter(x=>x!==' ').every(x=>p.guesses.includes(x));if(won||p.wrong>=6){p.done=true;p.finishedAt=Date.now();if(won)p.score=100+(6-p.wrong)*10;}p.lastAction={letter,correct,won,lost:p.done&&!won};if(g.seats.every(seat=>g.progress[seat.id].done)){const ranked=g.seats.slice().sort((a,b)=>g.progress[b.id].score-g.progress[a.id].score||g.progress[a.id].finishedAt-g.progress[b.id].finishedAt);g.winner=g.seats.findIndex(seat=>seat.id===ranked[0].id);}return {ok:true};}const index=Number(c.index);if(!Number.isInteger(index)||index<0||index>=16)return {ok:false,error:'invalid_tile'};const correct=index===g.sequence[p.next];if(correct){p.next++;p.score=Math.max(0,p.next*10-p.wrong*10);if(p.next===g.sequence.length){p.done=true;p.finishedAt=Date.now();p.score+=100;}}else{p.wrong++;p.score=Math.max(0,p.next*10-p.wrong*10);}p.lastAction={index,correct,won:p.done};if(g.seats.every(seat=>g.progress[seat.id].done)){const ranked=g.seats.slice().sort((a,b)=>g.progress[b.id].score-g.progress[a.id].score||g.progress[a.id].finishedAt-g.progress[b.id].finishedAt);g.winner=g.seats.findIndex(seat=>seat.id===ranked[0].id);}return {ok:true};}
function puzzlePublicState(g,player){const p=g.progress[player.id]||{values:null,guesses:[],wrong:0,next:0,score:0,done:false,finishedAt:0};const scores=g.seats.map(s=>{const q=g.progress[s.id];return {id:s.id,name:s.name,score:q.score,wrong:q.wrong,done:q.done,elapsed:q.finishedAt?Math.max(0,q.finishedAt-g.startedAt):Math.max(0,Date.now()-g.startedAt),finishedAt:q.finishedAt};}).sort((a,b)=>b.score-a.score||(a.finishedAt||Infinity)-(b.finishedAt||Infinity));const allDone=g.seats.every(s=>g.progress[s.id].done);return {type:g.type,startedAt:g.startedAt,players:scores,allDone,winner:allDone?(scores[0]?.id||null):null,challenge:g.type==='sudoku'?{puzzle:g.puzzle}:g.type==='word'?{clue:g.clue,length:g.answer.length,spaces:g.answer.split('').map(x=>x===' ')}:{sequence:g.sequence,tiles:16},progress:{values:p.values,guesses:p.guesses,wrong:p.wrong,next:p.next,score:p.score,done:p.done,finishedAt:p.finishedAt,lastAction:p.lastAction||null,completedBoxes:g.type==='sudoku'?Array.from({length:9},(_,box)=>{const indexes=Array.from({length:81},(_,i)=>i).filter(i=>Math.floor(i/27)*3+Math.floor((i%9)/3)===box);return indexes.every(i=>p.values[i]===g.solution[i]);}):[],display:g.type==='word'?(p.done?g.answer:g.answer.split('').map(ch=>ch===' '? ' ':p.guesses.includes(ch)?ch:'_').join('')):''},myPlayerId:player.id};}
function startMonopolyGame(r) {
  const seats=[...r.players.values()].filter(p=>!p.bot&&p.connected).slice(0,4);
  if(seats.length<2)return false;
  r.game={type:'monopoly',seats,turn:0,winner:-1,rolled:false,lastRoll:null,message:seats[0].name+' đi trước.',money:seats.map(()=>1500),positions:seats.map(()=>0),alive:seats.map(()=>true),owners:{}};
  send(r);return true;
}
function monopolyAction(g,seat,command) {
  if(!g||g.type!=='monopoly'||g.winner>=0)return {ok:false,error:'game_finished'};
  if(seat!==g.turn)return {ok:false,error:'not_your_turn'};
  const type=String(command.type||'');
  if(type==='roll') {
    if(g.rolled)return {ok:false,error:'already_rolled'};
    const dieA=crypto.randomInt(1,7),dieB=crypto.randomInt(1,7),dice=dieA+dieB,old=g.positions[seat];
    g.positions[seat]=(old+dice)%MONOPOLY_SPACES.length;
    if(g.positions[seat]<old)g.money[seat]+=200;
    g.lastRoll=[dieA,dieB];
    const space=MONOPOLY_SPACES[g.positions[seat]];
    if(space[1]==='tax')g.money[seat]-=space[2];
    else if(space[1]==='chance')g.money[seat]+=[100,-80,150,-50][crypto.randomInt(0,4)];
    else if(space[1]==='property'&&g.owners[g.positions[seat]]!==undefined&&g.owners[g.positions[seat]]!==seat){const rent=Math.round(space[2]*.15),to=g.owners[g.positions[seat]];g.money[seat]-=rent;g.money[to]+=rent;}
    if(g.money[seat]<0)g.alive[seat]=false;
    const remaining=g.alive.map((alive,index)=>alive?index:-1).filter(index=>index>=0);
    if(remaining.length<=1)g.winner=remaining[0]??-1;
    g.rolled=true;g.message=g.seats[seat].name+' gieo '+dice+' (ô '+(g.positions[seat]+1)+'). '+(space[0]||'');
    return {ok:true};
  }
  if(type==='buy') {
    if(!g.rolled)return {ok:false,error:'roll_first'};
    const pos=g.positions[seat],space=MONOPOLY_SPACES[pos];
    if(space[1]!=='property'||g.owners[pos]!==undefined)return {ok:false,error:'not_for_sale'};
    if(g.money[seat]<space[2])return {ok:false,error:'not_enough_money'};
    g.money[seat]-=space[2];g.owners[pos]=seat;g.message=g.seats[seat].name+' đã mua '+space[0]+'.';return {ok:true};
  }
  if(type==='end') {
    if(!g.rolled)return {ok:false,error:'roll_first'};
    if(g.winner<0){do{g.turn=(g.turn+1)%g.seats.length;}while(!g.alive[g.turn]);}
    g.rolled=false;g.message=g.winner>=0?g.seats[g.winner].name+' chiến thắng!':'Đến lượt '+g.seats[g.turn].name+'.';return {ok:true};
  }
  return {ok:false,error:'invalid_action'};
}
function startChessGame(r) {
  const seats=[...r.players.values()].filter(p=>!p.bot&&p.connected).slice(0,2);
  if(seats.length!==2)return false;
  r.game={type:'chess',seats,chess:new Chess(),turn:0,winner:-1,draw:false,reason:'',lastMove:null,moveCount:0};
  send(r);return true;
}
function chessMove(g,seat,command) {
  if(!g||g.type!=='chess'||g.winner>=0||g.draw)return {ok:false,error:'game_finished'};
  if(seat!==g.turn)return {ok:false,error:'not_your_turn'};
  const from=String(command.from||''),to=String(command.to||''),promotion=String(command.promotion||'q').toLowerCase();
  if(!/^[a-h][1-8]$/.test(from)||!/^[a-h][1-8]$/.test(to)||!['q','r','b','n'].includes(promotion))return {ok:false,error:'invalid_move'};
  const move=g.chess.move({from,to,promotion},{allowCheck:true});
  if(!move)return {ok:false,error:'invalid_move'};
  g.moveCount++;g.lastMove={from:move.from,to:move.to,san:move.san,color:move.color,captured:move.captured||null,promotion:move.promotion||null};
  if(move.captured==='k'){g.winner=seat;g.reason='Đã bắt được Vua.';}
  else {
    g.turn=1-seat;
    const available=g.chess.moves({verbose:true,allowCheck:true});
    if(!available.length){if(g.chess.in_check()){g.winner=seat;g.reason='Chiếu hết — đối phương không còn nước đi.';}else{g.draw=true;g.reason='Hết nước đi — hòa ván.';}}
    else if(Number(g.chess.fen().split(' ')[4])>=100){g.draw=true;g.reason='Luật hòa 50 nước.';}
    else if(g.chess.insufficient_material()){g.draw=true;g.reason='Không đủ quân để chiếu hết.';}
    else if(g.chess.in_threefold_repetition()){g.draw=true;g.reason='Lặp lại thế cờ ba lần.';}
  }
  return {ok:true};
}
function caroMove(g,seat,row,col) {
  if(!g||g.type!=='caro'||g.winner>=0||g.draw)return {ok:false,error:'game_finished'};
  if(seat!==g.turn)return {ok:false,error:'not_your_turn'};
  const player=seat===0?1:2,result=CaroEngine.play(g.board,row,col,player);
  if(!result.ok)return {ok:false,error:'invalid_move'};
  g.board=result.board;g.moveCount++;
  if(g.mode==='normal'&&result.winner){g.winner=seat;g.lines=CaroEngine.fiveLines(g.board,player);g.message= g.seats[seat].name+' thắng!';}
  else if(result.draw){g.lines=CaroEngine.fiveLines(g.board,1).map(line=>({player:1,cells:line})).concat(CaroEngine.fiveLines(g.board,2).map(line=>({player:2,cells:line})));g.scoreX=CaroEngine.fiveLines(g.board,1).length;g.scoreO=CaroEngine.fiveLines(g.board,2).length;g.draw=g.scoreX===g.scoreO;g.winner=g.draw?-1:(g.scoreX>g.scoreO?0:1);g.message=g.draw?'Hòa!':g.seats[g.winner].name+' thắng với '+Math.max(g.scoreX,g.scoreO)+' đường 5 quân.';}
  else {g.turn=1-seat;g.message='Lượt '+(g.turn===0?'X':'O');}
  return {ok:true};
}
function addHistory(g,text,seat=-1,type='info'){g.history=g.history||[];g.history.push({text,seat,type,at:Date.now()});if(g.history.length>60)g.history.shift();}
function unoCardPoints(card) { if(card[0]==='W') return 50; if(['S','V','D'].includes(card[1])) return 20; return Number(card[1])||0; }
function endGame(g, winner) { if (!g || g.winner >= 0 || !g.seats[winner]) return; const player=g.seats[winner]; const points=g.type==='uno'?g.hands.reduce((sum,hand,index)=>sum+(index===winner?0:hand.reduce((n,card)=>n+unoCardPoints(card),0)),0):1; g.roundPoints=points; player.score=(player.score||0)+points;player.wins=(player.wins||0)+1;player.games=(player.games||0)+1;player.streak=(player.streak||0)+1;player.bestStreak=Math.max(player.bestStreak||0,player.streak);player.stats=player.stats||{};player.stats[g.type]=player.stats[g.type]||{wins:0,games:0,points:0};player.stats[g.type].wins++;player.stats[g.type].games++;player.stats[g.type].points+=points;for(let i=0;i<g.seats.length;i++)if(i!==winner){const loser=g.seats[i];loser.games=(loser.games||0)+1;loser.streak=0;loser.stats=loser.stats||{};loser.stats[g.type]=loser.stats[g.type]||{wins:0,games:0,points:0};loser.stats[g.type].games++;} g.scores[winner]=player.score; g.winner=winner;g.matchWinner=player.score>=500?winner:-1;for(const profile of g.seats)if(!profile.bot)saveProfile(profile).catch(error=>console.error('Profile save failed:',error.message));recordMatch({gameType:g.type,winnerId:player.id,points,participants:g.seats.map(p=>({id:p.id,name:p.name,bot:!!p.bot}))}).catch(error=>console.error('Match history save failed:',error.message));g.turnDeadline=0; g.message=g.matchWinner>=0?`${player.name} đạt ${player.score} điểm và trở thành NHÀ VÔ ĐỊCH!`:`${player.name} thắng ván! +${points} điểm`;addHistory(g,g.message,winner,g.matchWinner>=0?'champion':'winner'); }
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
      addHistory(g,`${g.seats[g.unoPendingSeat].name} quên báo UNO và bị phạt rút 2 lá`,g.unoPendingSeat,'penalty');g.history.at(-1).count=2;
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
      addHistory(g,`${g.seats[g.unoPendingSeat].name} quên báo UNO và bị phạt rút 2 lá`,g.unoPendingSeat,'penalty');g.history.at(-1).count=2;
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
        g.drawnCardSeat=-1;g.drawnCard=null;addHistory(g,`${p.name} chồng ${card} · tổng phạt ${pd.amount} lá`,i,'play');g.history.at(-1).card=card;
        if(!h.length){g.pendingDraw=null;endGame(g,i);}else{g.message=`Cộng dồn ${pd.amount} lá phạt!`;delayNextTurn(r,g);}return {ok:true};
      }
      if(command.type!=='accept_penalty') return {ok:false,error:'must_resolve_penalty'};
      drawCards(g,i,pd.amount);addHistory(g,`${p.name} rút ${pd.amount} lá phạt`,i,'penalty');g.history.at(-1).count=pd.amount;
      g.pendingDraw=null;g.message=`${p.name} rút ${pd.amount} lá phạt và mất lượt`;delayNextTurn(r,g);return {ok:true};
    }
    if(command.type==='draw') {
      if(g.drawnCardSeat===i) return {ok:false,error:'already_drew'};
      drawCards(g,i,1);
      const drawn=g.hands[i][g.hands[i].length-1];
      addHistory(g,`${p.name} bốc 1 lá`,i,'draw');g.history.at(-1).card=drawn;
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
    addHistory(g,`${p.name} đánh ${card}`,i,'play');g.history.at(-1).card=card;
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
    if(command.type==='call_sam') { if(g.last.length || g.samCalled>=0) return {ok:false,error:'cannot_call_sam'}; g.samCalled=i; g.message=`${p.name} báo Sâm!`;addHistory(g,`${p.name} báo Sâm`,i,'call');g.turnDeadline=Date.now()+30000; send(r); return {ok:true}; }
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
function chooseUnoMove(hand,g,seat) {
  const playable=hand.filter(card=>unoCanPlay(card,g));
  if(!playable.length)return null;
  const next=(seat+g.direction+g.seats.length)%g.seats.length;
  const threat=(g.hands[next]||[]).length<=2;
  const colorCount=color=>hand.filter(c=>c!== 'WW'&&c!=='WF'&&c[0]===color).length;
  const colorForWild=()=>['R','G','B','Y'].sort((a,b)=>colorCount(b)-colorCount(a))[0];
  const value=card=>{
    const kind=card[1];
    let score=card[0]==='W'?-2:card[0]===g.color?3:0.5;
    if(kind==='D')score+=threat?8:4;
    else if(kind==='F')score+=threat?9:3.5;
    else if(kind==='S'||kind==='V')score+=threat?6:2.5;
    else score+=(Number(kind)||0)*0.18;
    if(card[0]==='W')score+=kind==='F'?0.2:-1.5;
    if(card[0]==='W')score+=colorCount(colorForWild())*0.7;
    else score+=colorCount(card[0])*0.55;
    return score;
  };
  playable.sort((a,b)=>value(b)-value(a));
  const card=playable[0];
  return {card,color:card[0]==='W'?colorForWild():undefined};
}
function botMove(r) { const g=r.game; if(!g||g.winner>=0)return; const p=g.seats[g.turn]; if(!p || (!p.bot && p.connected))return; const h=g.hands[g.turn]; if(g.type==='sam'){const move=findSamMove(h,g.lastCombo); if(move)act(r,p,{type:'play',cards:move.cards}); else if(g.last.length)act(r,p,{type:'pass'}); else { const fallback=h.length?[h.slice().sort((a,b)=>(a>>2)-(b>>2))[0]]:[]; if(fallback.length){const remaining=h.filter(card=>!fallback.includes(card));if(remaining.length===1&&(remaining[0]>>2)===15){const alternative=h.find(card=>card!==(fallback[0])&&((h.filter(x=>x!==card).length!==1)||((h.find(x=>x!==card)>>2)!==15)));if(alternative!==undefined)act(r,p,{type:'play',cards:[alternative]});else {g.message=`${p.name} không thể đánh lá 2 cuối cùng; lượt được chuyển tiếp.`;addHistory(g,g.message,g.turn,'timeout');nextTurn(g);g.turnDeadline=Date.now()+30000;}}else act(r,p,{type:'play',cards:fallback});} }} else {if(g.pendingDraw){const stack=h.filter(c=>['D','F'].includes(c[1])).sort((a,b)=>(b[1]==='F'?4:2)-(a[1]==='F'?4:2));if(stack.length){if(h.length===2&&g.unoCalledSeat!==g.turn)act(r,p,{type:'uno'});act(r,p,{type:'play',card:stack[0],color:stack[0][0]==='W'?chooseUnoMove(h,g,g.turn)?.color:undefined});}else act(r,p,{type:'accept_penalty'});}else if(h.length===2&&g.unoCalledSeat!==g.turn){act(r,p,{type:'uno'});const move=chooseUnoMove(h,g,g.turn);if(move)act(r,p,{type:'play',card:move.card,color:move.color});else act(r,p,{type:'draw'});}else if(g.drawnCardSeat===g.turn){const k=g.drawnCard;if(k&&unoCanPlay(k,g))act(r,p,{type:'play',card:k,color:k[0]==='W'?chooseUnoMove([k],g,g.turn)?.color:undefined});else act(r,p,{type:'pass_drawn'});}else{const move=chooseUnoMove(h,g,g.turn);if(move)act(r,p,{type:'play',card:move.card,color:move.color});else act(r,p,{type:'draw'});}} send(r); }
function scheduleBot(r) { if(r.botTimer)clearTimeout(r.botTimer);if(r.turnTimer)clearTimeout(r.turnTimer); const g=r.game;if(!g||g.winner>=0)return;const deadline=g.turnDeadline||Date.now()+30000;r.turnTimer=setTimeout(()=>{if(!r.game||r.game!==g||g.winner>=0)return;const p=g.seats[g.turn];if(!p)return;if(g.type==='sam'){if(g.last.length)act(r,p,{type:'pass'});else{const move=findSamMove(g.hands[g.turn],null);if(move)act(r,p,{type:'play',cards:move.cards});else{g.message=`${p.name} hết thời gian; lượt được bỏ qua`;addHistory(g,g.message,g.turn,'timeout');nextTurn(g);g.turnDeadline=Date.now()+30000;}}}else{act(r,p,{type:'draw'});}send(r);scheduleBot(r);},Math.max(0,deadline-Date.now()));if(g.seats[g.turn]?.bot||!g.seats[g.turn]?.connected)r.botTimer=setTimeout(()=>{botMove(r);scheduleBot(r);},Math.max(700,(g.turnLockUntil||0)-Date.now()+100)); }
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/manifest.webmanifest'){try{res.writeHead(200,{'content-type':'application/manifest+json; charset=utf-8','cache-control':'no-cache'});return res.end(fs.readFileSync(path.join(__dirname,'manifest.webmanifest')));}catch{return json(res,404,{ok:false,error:'manifest_missing'});}}
  if(req.method==='GET'&&url.pathname==='/gameverse-icon.svg'){try{res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=86400'});return res.end(fs.readFileSync(path.join(__dirname,'gameverse-icon.svg')));}catch{return json(res,404,{ok:false,error:'icon_missing'});}}
  if(req.method==='GET'&&url.pathname==='/sw.js'){try{res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-cache','service-worker-allowed':'/'});return res.end(fs.readFileSync(path.join(__dirname,'sw.js')));}catch{return json(res,404,{ok:false,error:'service_worker_missing'});}}
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'sam-uno',rooms:rooms.size,uptimeSeconds:Math.floor(process.uptime()),persistentProfiles:databaseEnabled()});
  if(req.method==='GET'&&url.pathname==='/') { try {res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});return res.end(fs.readFileSync(path.join(__dirname,'hub.html')));} catch{return json(res,500,{ok:false,error:'hub_missing'});} }
  if(req.method==='GET'&&url.pathname==='/invite-client.js') { try { res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'}); return res.end(fs.readFileSync(path.join(__dirname,'invite-client.js'))); } catch { return json(res,404,{ok:false,error:'invite_client_missing'}); } }
  if(req.method==='GET'&&url.pathname.startsWith('/invite/')) { try { res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}); return res.end(fs.readFileSync(path.join(__dirname,'invite.html'),'utf8')); } catch { return json(res,404,{ok:false,error:'invite_page_missing'}); } }
  if(req.method==='GET'&&url.pathname==='/games/caro') { try {res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'});return res.end(readGamePage(path.join(__dirname,'games','caro.html')));} catch{return json(res,404,{ok:false,error:'game_caro_missing'});} }
  if(req.method==='GET'&&url.pathname==='/games/caro-engine.js') { try {res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'});return res.end(fs.readFileSync(path.join(__dirname,'games','caro-engine.js')));} catch{return json(res,404,{ok:false,error:'game_caro_engine_missing'});} }
  if(req.method==='GET'&&url.pathname==='/games/chess') { try {res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'});return res.end(readGamePage(path.join(__dirname,'games','chess.html')));} catch{return json(res,404,{ok:false,error:'game_chess_missing'});} }
  if(req.method==='GET'&&url.pathname==='/games/chess-engine.js') { try {res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'});return res.end(fs.readFileSync(path.join(__dirname,'games','chess-engine.js')));} catch{return json(res,404,{ok:false,error:'game_chess_engine_missing'});} }
  if(req.method==='GET'&&url.pathname==='/games/2048') { try {res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'});return res.end(fs.readFileSync(path.join(__dirname,'games','2048.html')));} catch{return json(res,404,{ok:false,error:'game_2048_missing'});} }
  if(req.method==='GET'&&url.pathname==='/games/2048-engine.js') { try {res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'});return res.end(fs.readFileSync(path.join(__dirname,'games','2048-engine.js')));} catch{return json(res,404,{ok:false,error:'game_2048_engine_missing'});} }
  for(const game of ['monopoly','sudoku','word','sequence'])if(req.method==='GET'&&url.pathname==='/games/'+game){try{res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'});return res.end(readGamePage(path.join(__dirname,'games',game+'.html')));}catch{return json(res,404,{ok:false,error:'game_'+game+'_missing'});}}
  if(req.method==='GET'&&url.pathname==='/play') { try {res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});return res.end(readGamePage(path.join(__dirname,'index.html')));} catch{return json(res,500,{ok:false,error:'index_missing'});} }
  if(req.method==='GET'&&url.pathname==='/api/auth/me'){try{const user=await getSessionUser(readCookie(req,'samuno_session'));return json(res,200,{ok:true,authenticated:!!user,user:user?{id:user.id,email:user.email,nickname:user.nickname,createdAt:user.created_at,profile:user.profile_id?{id:user.profile_id,name:user.profile_name,avatar:user.avatar,score:user.score,wins:user.wins,games:user.games,streak:user.streak,bestStreak:user.best_streak,stats:user.stats,createdAt:user.profile_created_at}:null}:null});}catch(error){console.error('Auth session lookup failed:',error.message);return json(res,503,{ok:false,error:'database_unavailable'});}}
  if(req.method==='POST'&&url.pathname==='/api/auth/register'){try{if(authRateLimited(req))return json(res,429,{ok:false,error:'too_many_attempts'});if(!databaseEnabled())return json(res,503,{ok:false,error:'persistence_unavailable'});const d=await readBody(req);const result=await createAccount({email:d.email,password:d.password,nickname:d.nickname,profileToken:d.profileToken});clearAuthAttempts(req);for(const r of rooms.values()){const p=r.players.get(result.profile.id);if(p){p.name=result.profile.name;p.avatar=result.profile.avatar||'🎴';p.accountUserId=result.user.id;send(r);}}writeSessionCookie(res,req,result.sessionToken);return json(res,201,{ok:true,user:{id:result.user.id,email:result.user.email,nickname:result.user.nickname,createdAt:result.user.created_at},profile:result.profile});}catch(error){const known={email_exists:[409,'email_exists'],invalid_email:[400,'invalid_email'],weak_password:[400,'weak_password'],invalid_guest_profile:[400,'invalid_guest_profile'],guest_profile_already_linked:[409,'guest_profile_already_linked'],persistence_unavailable:[503,'persistence_unavailable']};const item=known[error.message];if(!item)console.error('Account registration failed:',error.message);return json(res,item?.[0]||503,{ok:false,error:item?.[1]||'account_registration_failed'});}}
  if(req.method==='POST'&&url.pathname==='/api/auth/login'){try{if(authRateLimited(req))return json(res,429,{ok:false,error:'too_many_attempts'});const d=await readBody(req);const result=await loginAccount({email:d.email,password:d.password});clearAuthAttempts(req);writeSessionCookie(res,req,result.sessionToken);return json(res,200,{ok:true,user:{id:result.user.id,email:result.user.email,nickname:result.user.nickname,createdAt:result.user.created_at}});}catch(error){const known={invalid_credentials:[401,'invalid_credentials'],persistence_unavailable:[503,'persistence_unavailable']};const item=known[error.message];if(!item)console.error('Account login failed:',error.message);return json(res,item?.[0]||503,{ok:false,error:item?.[1]||'login_failed'});}}
  if(req.method==='POST'&&url.pathname==='/api/auth/logout'){try{const sessionToken=readCookie(req,'samuno_session'),user=await getSessionUser(sessionToken);if(user?.profile_id){for(const r of rooms.values()){const p=r.players.get(user.profile_id);if(p){p.token=id();p.accountUserId=null;p.connected=false;p.disconnectedAt=Date.now();p.reconnectUntil=p.disconnectedAt+LIMITS.grace;if(p.res){const old=p.res;p.res=null;old.end();}send(r);scheduleBot(r);}}}await deleteSession(sessionToken);writeSessionCookie(res,req,'',true);return json(res,200,{ok:true});}catch{return json(res,503,{ok:false,error:'database_unavailable'});}}
  if(req.method==='POST'&&url.pathname==='/api/auth/profile'){try{const user=await getSessionUser(readCookie(req,'samuno_session'));if(!user)return json(res,401,{ok:false,error:'login_required'});const d=await readBody(req);const profile=await updateAccountProfile(user.id,d.nickname,d.avatar);for(const r of rooms.values()){const p=r.players.get(profile.id);if(p){p.name=profile.name;p.avatar=profile.avatar;send(r);}}return json(res,200,{ok:true,profile});}catch(error){const known={profile_not_found:[404,'profile_not_found'],persistence_unavailable:[503,'persistence_unavailable']};const item=known[error.message];if(!item)console.error('Profile update failed:',error.message);return json(res,item?.[0]||503,{ok:false,error:item?.[1]||'profile_update_failed'});}}
  if(req.method==='GET'&&url.pathname.startsWith('/api/profile/')&&url.pathname.endsWith('/history')){try{const profileId=decodeURIComponent(url.pathname.slice('/api/profile/'.length,-'/history'.length));const matches=await matchHistory(profileId,20);if(!matches)return json(res,503,{ok:false,error:'database_unavailable'});return json(res,200,{ok:true,matches});}catch(error){console.error('Public match history lookup failed:',error.message);return json(res,503,{ok:false,error:'database_unavailable'});}}
  if(req.method==='GET'&&url.pathname.startsWith('/api/profile/')){try{const profile=await publicProfile(decodeURIComponent(url.pathname.slice('/api/profile/'.length)));if(!profile)return json(res,404,{ok:false,error:'profile_not_found'});return json(res,200,{ok:true,profile});}catch(error){console.error('Public profile lookup failed:',error.message);return json(res,503,{ok:false,error:'database_unavailable'});}}
     if(req.method==='POST'&&url.pathname==='/api/room/invite') { try { const d=await readBody(req),r=roomFor(d.room,false),p=r&&await authorizedPlayer(r,d.token,req); if(!p)return json(res,401,{ok:false,error:'unauthorized'}); if(!ONLINE_GAME_TYPES.includes(r.gameType))return json(res,409,{ok:false,error:'game_not_invitable'}); const made=createInvite(roomInvites,r.code,p.id); return json(res,200,{ok:true,path:made.path,expiresAt:made.expiresAt}); } catch(error) { return json(res,error.message==='invite_limit'?429:400,{ok:false,error:error.message==='invite_limit'?'invite_limit':'invalid_request'}); } }
   if(req.method==='POST'&&url.pathname==='/api/room/invite/revoke') { try { const d=await readBody(req),r=roomFor(d.room,false),p=r&&await authorizedPlayer(r,d.token,req),invite=getInvite(roomInvites,d.inviteToken); if(!p)return json(res,401,{ok:false,error:'unauthorized'}); if(!invite||invite.roomCode!==r.code||invite.creatorId!==p.id)return json(res,404,{ok:false,error:'invite_not_found'}); revokeInvite(roomInvites,d.inviteToken); return json(res,200,{ok:true}); } catch { return json(res,400,{ok:false,error:'invalid_request'}); } }
   if(req.method==='GET'&&url.pathname.startsWith('/api/invite/')) { const token=url.pathname.slice('/api/invite/'.length); const invite=getInvite(roomInvites,token); if(!invite)return json(res,404,{ok:false,error:'invite_invalid'}); const r=roomFor(invite.roomCode,false); if(!r)return json(res,404,{ok:false,error:'room_not_found'}); const capacity=['caro','chess'].includes(r.gameType)?2:r.gameType==='monopoly'?4:LIMITS.maxPlayers; const players=[...r.players.values()].filter(p=>!p.bot); if(players.length>=capacity)return json(res,409,{ok:false,error:'room_full'}); if(r.game&&r.game.winner<0&&!r.game.draw)return json(res,409,{ok:false,error:'game_in_progress'}); return json(res,200,{ok:true,gameType:r.gameType,caroMode:r.caroMode||'normal',room:r.code,playerCount:players.length,maxPlayers:capacity,expiresAt:invite.expiresAt}); }
  if(req.method==='GET'&&url.pathname==='/api/rooms') { const game=url.searchParams.get('game');if(game&&!ONLINE_GAME_TYPES.includes(game))return json(res,400,{ok:false,error:'invalid_game'});return json(res,200,{ok:true,rooms:publicRooms(game||null)}); }
  if(req.method==='GET'&&url.pathname==='/api/room/info') { const code=url.searchParams.get('room')||'';if(!validCode(code))return json(res,400,{ok:false,error:'invalid_room'});const r=roomFor(code,false);if(!r)return json(res,404,{ok:false,error:'room_not_found'});const capacity=r.gameType==='sam'?5:r.gameType==='uno'?6:['caro','chess'].includes(r.gameType)?2:r.gameType==='monopoly'?4:LIMITS.maxPlayers;return json(res,200,{ok:true,room:r.code,gameType:r.gameType||null,caroMode:r.caroMode||'normal',isPrivate:!!r.isPrivate,capacity,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,bot:!!p.bot,connected:!!p.connected}))}); }
  if(req.method==='POST'&&url.pathname==='/api/room/create') { try {const d=await readBody(req);const gameType=['sam','uno','caro','chess','monopoly','sudoku','word','sequence'].includes(d.game)?d.game:null;if(d.game&&!gameType)return json(res,400,{ok:false,error:'invalid_game'});let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));const r=roomFor(code,true);if(!r)return json(res,503,{ok:false,error:'room_limit'});r.gameType=gameType;r.caroMode=d.caroMode==='infinite'?'infinite':'normal';r.isPrivate=d.isPrivate!==false;r.emptyAt=Date.now();return json(res,200,{ok:true,room:code,gameType,isPrivate:r.isPrivate});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/join') { try {const d=await readBody(req); if(!validCode(d.room||'chung'))return json(res,400,{ok:false,error:'invalid_room'}); const r=roomFor(d.room||'chung',true);if(!r)return json(res,503,{ok:false,error:'room_limit'});const playerIdsBefore=new Set(r.players.keys());const wasConnected=!!(d.token&&playerFor(r,d.token)?.connected);if(d.inviteToken){const invite=getInvite(roomInvites,d.inviteToken);if(!invite||invite.roomCode!==r.code)return json(res,404,{ok:false,error:'invite_invalid'});if(r.game&&r.game.winner<0&&!r.game.draw)return json(res,409,{ok:false,error:'game_in_progress'});}if(d.game&&r.gameType&&d.game!==r.gameType)return json(res,409,{ok:false,error:'wrong_game'});let cleanName=String(d.name||'Người chơi').trim().slice(0,LIMITS.name)||'Người chơi';const account=d.asGuest?null:await getSessionUser(readCookie(req,'samuno_session'));if(account?.nickname)cleanName=account.nickname;const allowedAvatars=['🎴','🦊','🐼','🐯','🐸','🐱','🐻','🐲','🦁','🐵','🐧','🐰'];const cleanAvatar=allowedAvatars.includes(account?.avatar)?account.avatar:(allowedAvatars.includes(d.avatar)?d.avatar:'🎴');let p=d.token&&playerFor(r,d.token);if(r.game&&['sudoku','word','sequence'].includes(r.game.type)&&!p)return json(res,409,{ok:false,error:'game_in_progress'});if(account?.id||(p?.accountUserId&&p.accountUserId!==account?.id))p=null;if(!p&&d.profileToken){const profile=await getOrCreateProfile(d.profileToken,cleanName,account?.id||null);if(profile)p=[...r.players.values()].find(x=>x.id===profile.id)||null;if(!p&&profile){if((['caro','chess'].includes(r.gameType)&&r.players.size>=2)||(r.gameType==='monopoly'&&r.players.size>=4))return json(res,409,{ok:false,error:'room_full'});if(r.players.size>=LIMITS.maxPlayers)return json(res,409,{ok:false,error:'room_full'});p={id:profile.id,token:id(),name:profile.name,avatar:cleanAvatar,connected:true,bot:false,score:profile.score||0,wins:profile.wins||0,games:profile.games||0,streak:profile.streak||0,bestStreak:profile.best_streak||0,stats:profile.stats||{},res:null};r.players.set(p.id,p);}}if(p&&p.reconnectExpired&&r.game&&r.game.winner<0&&!r.game.draw)return json(res,409,{ok:false,error:'reconnect_expired'});if(!p){if((['caro','chess'].includes(r.gameType)&&r.players.size>=2)||(r.gameType==='monopoly'&&r.players.size>=4))return json(res,409,{ok:false,error:'room_full'});if(r.players.size>=LIMITS.maxPlayers)return json(res,409,{ok:false,error:'room_full'});p={id:id(),token:id(),name:cleanName,avatar:cleanAvatar,connected:true,bot:false,score:0,wins:0,games:0,streak:0,bestStreak:0,stats:{},res:null};r.players.set(p.id,p);}else{p.connected=true;p.disconnectedAt=null;p.reconnectUntil=null;p.reconnectExpired=false;p.name=cleanName;p.avatar=cleanAvatar;}if(account?.id)p.accountUserId=account.id;if(!r.hostId)r.hostId=p.id;r.emptyAt=null;if(!playerIdsBefore.has(p.id)||!wasConnected)pushRoomNotification(r,'player_joined',p.name+' đã tham gia phòng.');const capacity=['caro','chess'].includes(r.gameType)?2:r.gameType==='monopoly'?4:LIMITS.maxPlayers;if(r.players.size>=capacity)pushRoomNotification(r,'room_full','Phòng đã đủ người.');json(res,200,{ok:true,token:p.token,id:p.id,state:publicState(r,p.token)});send(r);return;}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='GET'&&url.pathname==='/api/leaderboard/global'){try{const mode=url.searchParams.get('mode')==='uno'?'uno':'sam';const rows=await globalLeaderboard(mode);if(rows===null)return json(res,503,{ok:false,error:'persistence_unavailable'});return json(res,200,{ok:true,mode,rows});}catch(error){console.error('Global leaderboard failed:',error.message);return json(res,503,{ok:false,error:'database_unavailable'});}}
  if(req.method==='GET'&&url.pathname==='/api/leaderboard') {const code=url.searchParams.get('room'),mode=url.searchParams.get('mode')==='uno'?'uno':'sam',r=roomFor(code,false);if(!r)return json(res,404,{ok:false,error:'room_not_found'});const rows=[...r.players.values()].filter(p=>!p.bot).map(p=>({name:p.name,wins:p.stats?.[mode]?.wins||0,games:p.stats?.[mode]?.games||0,points:p.stats?.[mode]?.points||0,streak:p.streak||0})).sort((a,b)=>b.wins-a.wins||b.points-a.points||b.streak-a.streak).slice(0,20);return json(res,200,{ok:true,mode,rows});}
  if(req.method==='GET'&&url.pathname==='/api/events') {const code=url.searchParams.get('room'),token=url.searchParams.get('token'),r=roomFor(code,false),p=r&&await authorizedPlayer(r,token,req);if(!p)return json(res,401,{ok:false,error:'unauthorized'});if(p.reconnectExpired&&r.game&&r.game.winner<0&&!r.game.draw)return json(res,409,{ok:false,error:'reconnect_expired'});res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache, no-transform','connection':'keep-alive','x-accel-buffering':'no'});res.write('retry: 2000\n\n');const entry={token,res};r.events.add(entry);p.res=res;p.connected=true;p.disconnectedAt=null;p.reconnectUntil=null;p.reconnectExpired=false;res.write(`data: ${JSON.stringify(publicState(r,token))}\n\n`);const timer=setInterval(async()=>{if(p.accountUserId){try{const active=await getSessionUser(readCookie(req,'samuno_session'));if(!active||active.id!==p.accountUserId){res.end();return;}}catch{res.end();return;}}if(!res.destroyed)res.write(': ping\n\n');},20000);res.on('close',()=>{clearInterval(timer);r.events.delete(entry);if(p.res===res){p.res=null;p.connected=false;p.disconnectedAt=Date.now();p.reconnectUntil=p.disconnectedAt+LIMITS.grace;setTimeout(()=>{if(!p.connected&&p.reconnectUntil&&Date.now()>=p.reconnectUntil){if(r.game&&r.game.winner<0){p.reconnectExpired=true;}else{r.players.delete(p.id);transferHost(r,p.id);}if(!r.players.size)r.emptyAt=Date.now();send(r);}},LIMITS.grace);send(r);scheduleBot(r);}});return; }

  if(req.method==='POST'&&url.pathname==='/api/chat') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&await authorizedPlayer(r,d.token,req);if(!p)return json(res,401,{ok:false,error:'unauthorized'});const message=String(d.message||'').trim();if(!message)return json(res,400,{ok:false,error:'empty_message'});if(message.length>180)return json(res,400,{ok:false,error:'message_too_long'});r.chat=r.chat||[];r.chat.push({id:id(),name:p.name,text:message.slice(0,180),at:Date.now()});if(r.chat.length>40)r.chat.splice(0,r.chat.length-40);send(r);return json(res,200,{ok:true,state:publicState(r,d.token)});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/emote') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&await authorizedPlayer(r,d.token,req);if(!p)return json(res,401,{ok:false,error:'unauthorized'});const allowed=['😀','😂','😍','😮','😢','😎','👏','🔥','🎉','💪','🤔','❤️'];if(!allowed.includes(d.emote))return json(res,400,{ok:false,error:'invalid_emote'});r.emotes=r.emotes||[];r.emotes.push({id:id(),name:p.name,emote:d.emote,at:Date.now()});if(r.emotes.length>12)r.emotes.splice(0,r.emotes.length-12);send(r);return json(res,200,{ok:true,state:publicState(r,d.token)});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/action') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&await authorizedPlayer(r,d.token,req);if(!p)return json(res,401,{ok:false,error:'unauthorized'});const command=d.command||{};const result=['sudoku','word','sequence'].includes(r.game?.type)?puzzleAction(r.game,p,command):r.game?.type==='caro'?caroMove(r.game,r.game.seats.findIndex(s=>s.id===p.id),command.row,command.col):r.game?.type==='chess'?chessMove(r.game,r.game.seats.findIndex(s=>s.id===p.id),command):r.game?.type==='monopoly'?monopolyAction(r.game,r.game.seats.findIndex(s=>s.id===p.id),command):act(r,p,command);if(result.ok){send(r);if(!['caro','chess','monopoly'].includes(r.game?.type))scheduleBot(r);return json(res,200,{...result,state:publicState(r,d.token)});}return json(res,400,result);}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/start') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&await authorizedPlayer(r,d.token,req);if(!p)return json(res,401,{ok:false,error:'unauthorized'});if(p.id!==r.hostId)return json(res,403,{ok:false,error:'host_only'});if(r.game&&r.game.winner<0&&!r.game.draw)return json(res,409,{ok:false,error:'game_in_progress'});if(r.gameType==='caro'||d.game==='caro'){if(r.gameType!=='caro')return json(res,409,{ok:false,error:'wrong_game'});if(!startCaroGame(r))return json(res,400,{ok:false,error:'need_two_players'});return json(res,200,{ok:true});}if(r.gameType==='chess'||d.game==='chess'){if(r.gameType!=='chess')return json(res,409,{ok:false,error:'wrong_game'});if(!startChessGame(r))return json(res,400,{ok:false,error:'need_two_players'});return json(res,200,{ok:true});}if(r.gameType==='monopoly'||d.game==='monopoly'){if(r.gameType!=='monopoly')return json(res,409,{ok:false,error:'wrong_game'});if(!startMonopolyGame(r))return json(res,400,{ok:false,error:'need_two_players'});return json(res,200,{ok:true});}if(['sudoku','word','sequence'].includes(r.gameType||d.game)){const type=r.gameType||d.game;if(r.gameType!==type)return json(res,409,{ok:false,error:'wrong_game'});if(!startPuzzleGame(r,type))return json(res,400,{ok:false,error:'need_two_players'});return json(res,200,{ok:true});}const type=d.game==='uno'?'uno':'sam';if(r.gameType&&r.gameType!==type)return json(res,409,{ok:false,error:'wrong_game'});r.gameType=r.gameType||type;if(!startGame(r,type))return json(res,400,{ok:false,error:'need_two_players'});scheduleBot(r);return json(res,200,{ok:true,state:publicState(r,d.token)});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/bot') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&await authorizedPlayer(r,d.token,req);if(!p)return json(res,401,{ok:false,error:'unauthorized'});if(p.id!==r.hostId)return json(res,403,{ok:false,error:'host_only'});if(r.gameType&&!['sam','uno'].includes(r.gameType))return json(res,409,{ok:false,error:'wrong_game'});if(r.game&&r.game.winner<0&&!r.game.draw)return json(res,409,{ok:false,error:'game_in_progress'});const capacity=r.gameType==='uno'?6:5;if(r.players.size>=capacity)return json(res,409,{ok:false,error:'room_full'});const bot={id:id(),token:id(),name:`Bot ${[...r.players.values()].filter(x=>x.bot).length+1}`,connected:true,bot:true,score:0,wins:0,games:0,streak:0,bestStreak:0};r.players.set(bot.id,bot);send(r);return json(res,200,{ok:true,state:publicState(r,d.token),capacity});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  if(req.method==='POST'&&url.pathname==='/api/lobby') {try{const d=await readBody(req),r=roomFor(d.room,false),p=r&&await authorizedPlayer(r,d.token,req);if(!p)return json(res,401,{ok:false,error:'unauthorized'});if(p.id!==r.hostId)return json(res,403,{ok:false,error:'host_only'});r.game=null;send(r);return json(res,200,{ok:true,state:publicState(r,d.token)});}catch{return json(res,400,{ok:false,error:'invalid_request'});} }
  return json(res,404,{ok:false,error:'not_found'});
});

const cleanup=setInterval(()=>{const now=Date.now();for(const [code,r] of rooms){for(const [pid,p] of r.players)if(!p.connected&&!p.bot&&p.reconnectUntil&&now>=p.reconnectUntil){if(r.game&&r.game.winner<0)p.reconnectExpired=true;else{r.players.delete(pid);pushRoomNotification(r,'player_left',p.name+' đã rời phòng.');transferHost(r,pid);}}if(!r.players.size&&r.emptyAt&&now-r.emptyAt>LIMITS.ttl){if(r.botTimer)clearTimeout(r.botTimer);if(r.effectTimer)clearTimeout(r.effectTimer);rooms.delete(code);}}},30000);
cleanup.unref();
function shutdown(){clearInterval(cleanup);for(const r of rooms.values()){if(r.botTimer)clearTimeout(r.botTimer);if(r.turnTimer)clearTimeout(r.turnTimer);if(r.effectTimer)clearTimeout(r.effectTimer);for(const e of r.events)e.res.end();}server.close(async()=>{try{await closeDatabase();}catch{}process.exit(0);});}
if (require.main === module) { initDatabase().then(()=>{server.listen(PORT,()=>console.log(`Sam & UNO server listening on ${PORT}; persistent profiles: ${databaseEnabled()}`));}).catch(error=>{console.error('Database initialization failed:',error.message);process.exit(1);}); process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown); }
module.exports={LIMITS,roomInvites,pushRoomNotification,samCombo,beats,canFinishSam,findSamMove,chooseUnoMove,endGame,publicState,publicRooms,rooms,server,act,caroMove,startCaroGame,chessMove,startChessGame,monopolyAction,startMonopolyGame,startPuzzleGame,puzzleAction,PUZZLE_WORDS,unoDeck,unoCardPoints};
