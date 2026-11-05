'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { LIMITS, samCombo, beats, canFinishSam, findSamMove, endGame, publicState, rooms, act, voiceIceServers } = require('../server');
test('Sâm nhận diện bộ cùng hạng',()=>assert.deepEqual(samCombo([12,13,14]),{kind:'set',size:3,high:3}));
test('Sâm nhận diện sảnh liên tiếp',()=>assert.deepEqual(samCombo([12,16,20]),{kind:'run',size:3,high:5}));
test('Sâm từ chối tổ hợp không hợp lệ',()=>assert.equal(samCombo([12,20,28]),null));
test('bộ lớn hơn cùng loại được chấp nhận',()=>assert.equal(beats({kind:'set',size:2,high:8},{kind:'set',size:2,high:7}),true));
test('bộ khác loại không chặn được',()=>assert.equal(beats({kind:'run',size:3,high:8},{kind:'set',size:3,high:7}),false));
test('trạng thái chỉ gửi bài của đúng người xem',()=>{const room={code:'x',players:new Map(),game:{type:'sam',seats:[{id:'a',name:'A'},{id:'b',name:'B'}],hands:[[1,2],[3,4]],turn:0,winner:-1,last:[],scores:[0,0],direction:1,color:'',top:'',samCalled:-1,passes:[]}};const a={id:'a',token:'ta',name:'A'},b={id:'b',token:'tb',name:'B'};room.players.set('a',a);room.players.set('b',b);assert.deepEqual(publicState(room,'ta').game.hand,[1,2]);assert.deepEqual(publicState(room,'tb').game.hand,[3,4]);assert.equal(publicState(room,'ta').game.hands,undefined);assert.equal(publicState(room,'ta').game.history.length,0);assert.equal(publicState(room,'ta').game.turnDeadline,0);});

test('Bot chọn đủ đôi để chặn đôi',()=>{const move=findSamMove([24,25,28,29],{kind:'set',size:2,high:5});assert.deepEqual(move.cards,[24,25]);assert.equal(move.combo.high,6);});
test('Bot chọn sảnh đủ số lá để chặn sảnh',()=>{const move=findSamMove([16,20,24,28],{kind:'run',size:3,high:4});assert.deepEqual(move.cards,[16,20,24]);assert.equal(move.combo.high,6);});
test('Bot trả về null khi không có nước chặn hợp lệ',()=>assert.equal(findSamMove([12,13,14],{kind:'set',size:2,high:10}),null));

test('chiến thắng cộng đúng 1 điểm và ghi nhận người thắng',()=>{const p={id:'p1',name:'A',score:2};const g={seats:[p],scores:[2],winner:-1,message:''};endGame(g,0);assert.equal(g.winner,0);assert.equal(p.score,3);assert.equal(g.scores[0],3);assert.match(g.message,/\+1 điểm/);});
test('không cộng điểm lần thứ hai cho cùng một ván',()=>{const p={id:'p1',name:'A',score:0};const g={seats:[p],scores:[0],winner:-1,message:''};endGame(g,0);endGame(g,0);assert.equal(p.score,1);});

test('tứ quý chặt được một lá 2',()=>assert.equal(beats({kind:'set',size:4,high:8},{kind:'set',size:1,high:15}),true));
test('tứ quý lớn chặt được tứ quý nhỏ',()=>assert.equal(beats({kind:'set',size:4,high:9},{kind:'set',size:4,high:8}),true));
test('tứ quý nhỏ không chặt được tứ quý lớn',()=>assert.equal(beats({kind:'set',size:4,high:8},{kind:'set',size:4,high:9}),false));
test('không cho phép kết thúc ván bằng lá 2',()=>assert.equal(canFinishSam([60],[60]),false));
test('được đánh lá 2 nếu vẫn còn bài khác không phải lá 2',()=>assert.equal(canFinishSam([60],[60,56]),true));
test('không cho phép nước đi khiến chỉ còn một lá 2',()=>assert.equal(canFinishSam([12],[12,60]),false));
test('không cho phép đánh một lá 2 nếu sẽ để lại lá 2 cuối cùng',()=>assert.equal(canFinishSam([60],[60,61]),false));
test('Bot không chọn lá 2 làm nước kết thúc',()=>assert.equal(findSamMove([60],null),null));

test('hồ sơ người chơi giữ điểm, số ván thắng và chuỗi thắng',()=>{const p={id:'p1',name:'A',score:4,wins:3,games:5,streak:2,bestStreak:3};const room={code:'x',players:new Map([['p1',p]]),game:null};const state=publicState(room,'');assert.equal(state.players[0].score,4);assert.equal(state.players[0].wins,3);assert.equal(state.players[0].games,5);assert.equal(state.players[0].streak,2);assert.equal(state.players[0].bestStreak,3);});


test('UNO khóa lượt trong thời gian hiệu ứng sau khi đánh bài',()=>{const a={id:'a',name:'A'},b={id:'b',name:'B'};const game={type:'uno',seats:[a,b],hands:[['R5','B1'],['G1']],turn:0,winner:-1,last:[],history:[],direction:1,color:'R',top:'R2',draw:[],discard:[],scores:[0,0],pendingDraw:null,drawnCardSeat:-1,unoPendingSeat:-1,unoCalledSeat:-1,turnDeadline:Date.now()+25000};const room={code:'lock-test',players:new Map([['a',a],['b',b]]),game,events:new Set()};const result=act(room,a,{type:'play',card:'R5'});assert.equal(result.ok,true);assert.equal(game.turn,0);assert.ok(game.turnLockUntil>Date.now());assert.equal(publicState(room,'').game.turnLocked,true);assert.equal(act(room,b,{type:'play',card:'G1'}).error,'effect_in_progress');clearTimeout(room.effectTimer);});

const { chooseUnoMove } = require('../server');
test('Bot UNO ưu tiên lá hành động khi người kế tiếp gần hết bài',()=>{const g={color:'R',top:'R5',direction:1,seats:[{id:'a'},{id:'b'}],hands:[[],['G1','G2']]};const move=chooseUnoMove(['R3','RD','WF'],g,0);assert.equal(move.card,'RD');});
test('Bot UNO giữ lá đổi màu khi vẫn có lựa chọn cùng màu',()=>{const g={color:'R',top:'R5',direction:1,seats:[{id:'a'},{id:'b'}],hands:[[],['G1','G2','G3']]};const move=chooseUnoMove(['WF','R4','R8'],g,0);assert.notEqual(move.card,'WF');});
test('Bot UNO chọn màu có nhiều lá nhất sau khi dùng lá đổi màu',()=>{const g={color:'R',top:'R5',direction:1,seats:[{id:'a'},{id:'b'}],hands:[[],['G1']]};const move=chooseUnoMove(['WF','B4','B8','B9','Y2'],g,0);assert.equal(move.card,'WF');assert.equal(move.color,'B');});

test('thống kê chiến thắng được tách riêng giữa Sâm và UNO',()=>{const a={id:'a',name:'A',score:0},b={id:'b',name:'B',score:0};const g={type:'sam',seats:[a,b],hands:[[],[1]],scores:[0,0],winner:-1,message:''};endGame(g,0);assert.equal(a.stats.sam.wins,1);assert.equal(a.stats.sam.games,1);assert.equal(a.stats.uno,undefined);assert.equal(b.stats.sam.games,1);});
test('trạng thái phòng nhận diện đúng chủ phòng',()=>{const a={id:'a',token:'ta',name:'A'};const r={code:'private1',hostId:'a',isPrivate:true,players:new Map([['a',a]]),game:null};const state=publicState(r,'ta');assert.equal(state.isPrivate,true);assert.equal(state.isHost,true);});

test('Bot Sâm ưu tiên đánh tổ hợp dài khi mở vòng',()=>{const move=findSamMove([12,16,20,24,28],null);assert.equal(move.cards.length,5);assert.equal(move.combo.kind,'run');});

test('thời gian giữ chỗ khi mất kết nối là 120 giây',()=>assert.equal(LIMITS.grace,120000));

test('Voice Chat chỉ trả STUN công khai khi chưa cấu hình TURN',()=>{const servers=voiceIceServers('ROOM1',{id:'player1'},1700000000000,{});assert.deepEqual(servers,[{urls:['stun:stun.l.google.com:19302']}]);});
test('TURN dùng thông tin xác thực tạm thời ký bằng secret máy chủ',()=>{const servers=voiceIceServers('ROOM1',{id:'player1'},1700000000000,{TURN_URLS:'turn:relay.example:3478?transport=udp,turns:relay.example:5349',TURN_SECRET:'test-secret'});assert.equal(servers.length,2);assert.deepEqual(servers[1].urls,['turn:relay.example:3478?transport=udp','turns:relay.example:5349']);assert.match(servers[1].username,/^1700003600:ROOM1:player1$/);assert.ok(servers[1].credential.length>10);});

test('Game Hub preserves the selected game type in room state',()=>{const a={id:'a',token:'ta',name:'A'};const r={code:'uno-room',gameType:'uno',hostId:'a',isPrivate:true,players:new Map([['a',a]]),game:null};const state=publicState(r,'ta');assert.equal(state.gameType,'uno');assert.equal(state.isHost,true);});


test('danh sách phòng công khai chỉ hiển thị phòng chờ đúng trò chơi và chưa đầy',()=>{const {publicRooms,rooms,LIMITS}=require('../server');const code='public-list-test';const room={code,gameType:'sam',isPrivate:false,game:null,createdAt:10,hostId:'a',players:new Map([['a',{id:'a',name:'Host',avatar:'🦊',connected:true,bot:false}]])};rooms.set(code,room);try{const list=publicRooms('sam');assert.equal(list.length,1);assert.deepEqual(list[0],{room:code,gameType:'sam',hostName:'Host',hostAvatar:'🦊',playerCount:1,maxPlayers:LIMITS.maxPlayers,status:'waiting',createdAt:10});assert.equal(publicRooms('uno').length,0);room.isPrivate=true;assert.equal(publicRooms('sam').length,0);room.isPrivate=false;room.game={winner:-1};assert.equal(publicRooms('sam').length,0);}finally{rooms.delete(code);}});


test('Game Hub inline JavaScript parses before serving interactive controls',()=>{
  const html=fs.readFileSync(require.resolve('../hub.html'),'utf8');
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>0,'hub.html must contain its client script');
  for(const script of scripts)new vm.Script(script[1],{filename:'hub.html'});
});


test('trang 2048 có JavaScript hợp lệ trước khi triển khai',()=>{
  const html=fs.readFileSync(require.resolve('../games/2048.html'),'utf8');
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>0,'2048 page must contain its client script');
  for(const script of scripts)new vm.Script(script[1],{filename:'games/2048.html'});
});


test('trang Cờ caro và Cờ vua có JavaScript hợp lệ',()=>{
  for(const file of ['../games/caro.html','../games/chess.html']){
    const html=fs.readFileSync(require.resolve(file),'utf8');
    const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.ok(scripts.length>0,file+' must contain its client script');
    for(const script of scripts)new vm.Script(script[1],{filename:file});
  }
});

test('Game Hub exposes three bot difficulties for Caro and Chess',()=>{
  const html=fs.readFileSync(require.resolve('../hub.html'),'utf8');
  assert.match(html,/data-action="play-bot"/);
  assert.match(html,/id="bot-difficulty"/);
  for(const level of ['easy','medium','hard'])assert.ok(html.includes('value="'+level+'"'));
  assert.match(html,/games\/caro\?mode=/);
  assert.match(html,/games\/chess\?bot=1/);
});
test('Caro and Chess bot pages parse and include a bot opponent mode',()=>{
  for(const [file,marker] of [['../games/caro.html','function botMove()'],['../games/chess.html','function botMove()']]){
    const html=fs.readFileSync(require.resolve(file),'utf8');
    assert.ok(html.includes(marker),file+' must implement the bot move routine');
    const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    for(const script of scripts)new vm.Script(script[1],{filename:file});
  }
});

const {startChessGame,chessMove}=require('../server');
const {Chess}=require('../games/chess-engine');
function chessRoom(){const a={id:'white',token:'tw',name:'White',connected:true,bot:false},b={id:'black',token:'tb',name:'Black',connected:true,bot:false};return {code:'CHESS1',gameType:'chess',hostId:'white',players:new Map([[a.id,a],[b.id,b]]),events:new Set(),chat:[],emotes:[],isPrivate:true};}
test('Online Chess starts with exactly two connected players and publishes private state',()=>{const room=chessRoom();assert.equal(startChessGame(room),true);const white=publicState(room,'tw');assert.equal(white.game.type,'chess');assert.equal(white.game.mySeat,0);assert.equal(white.game.myTurn,true);assert.equal(white.game.fen,new Chess().fen());assert.equal(white.game.history.length,0);});
test('Online Chess validates turn and legal moves on the server',()=>{const room=chessRoom();startChessGame(room);assert.equal(chessMove(room.game,1,{from:'e7',to:'e5'}).error,'not_your_turn');assert.equal(chessMove(room.game,0,{from:'e2',to:'e5'}).error,'invalid_move');assert.equal(chessMove(room.game,0,{from:'e2',to:'e4'}).ok,true);assert.equal(room.game.turn,1);assert.equal(chessMove(room.game,1,{from:'e7',to:'e5'}).ok,true);assert.deepEqual(room.game.chess.history(),['e4','e5']);});
test('Online Chess keeps the custom free-check variant and ends when a king is captured',()=>{const room=chessRoom();startChessGame(room);room.game.chess=new Chess('4k3/8/8/8/8/8/4r3/R3K3 w - - 0 1');assert.equal(chessMove(room.game,0,{from:'a1',to:'a2'}).ok,true);room.game.chess=new Chess('4k3/8/8/8/8/8/8/K3R3 w - - 0 1');room.game.turn=0;assert.equal(chessMove(room.game,0,{from:'e1',to:'e8'}).ok,true);assert.equal(room.game.winner,0);assert.equal(room.game.reason,'Đã bắt được Vua.');});
test('Game Hub enables private online Chess rooms and the Chess page parses',()=>{const hub=fs.readFileSync(require.resolve('../hub.html'),'utf8'),html=fs.readFileSync(require.resolve('../games/chess.html'),'utf8');assert.match(hub,/data-action="create-chess-room"/);assert.match(hub,/data-action="join-chess-room"/);assert.match(hub,/selectedGame==='chess'\?'/games/chess\?online=1/);assert.match(html,/function onlineMode\(\)/);for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1],{filename:'games/chess.html'});});
