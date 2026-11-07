'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const engine = require('../games/cards-offline-engine');

test('offline Sâm and UNO pages and engine are served and precached', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const hub = fs.readFileSync(path.join(root, 'hub.html'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(fs.existsSync(path.join(root, 'games', 'cards-offline.html')));
  assert.ok(fs.existsSync(path.join(root, 'games', 'cards-offline-engine.js')));
  assert.match(server, /url\.pathname==?='\/games\/cards-offline'/);
  assert.match(server, /url\.pathname==?='\/games\/cards-offline-engine\.js'/);
  assert.match(hub, /data-action="choose-samuno-offline"/);
  assert.match(hub, /cards-offline\?game=/);
  assert.ok(worker.includes("'/games/cards-offline'"));
  assert.ok(worker.includes("'/games/cards-offline-engine.js'"));
});

test('offline card mode does not depend on network rooms or realtime events', () => {
  const page = fs.readFileSync(path.join(root, 'games', 'cards-offline.html'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'games', 'cards-offline-engine.js'), 'utf8');
  assert.doesNotMatch(page, /\bfetch\s*\(|EventSource|\/api\//);
  assert.doesNotMatch(source, /\bfetch\s*\(|EventSource|\/api\//);
});

test('Sâm engine deals ten cards to each local player and recognizes combinations', () => {
  const game = engine.createGame('sam', 3);
  assert.equal(game.seats.length, 4);
  assert.ok(game.hands.every(hand => hand.length === 10));
  assert.deepEqual(engine.samCombo([12, 13]), { kind: 'set', size: 2, high: 3 });
  assert.deepEqual(engine.samCombo([12, 16, 20]), { kind: 'run', size: 3, high: 5 });
  assert.equal(engine.beats({ kind: 'set', size: 4, high: 8 }, { kind: 'set', size: 1, high: 15 }), true);
});

test('Sâm bot can make a legal local move and end a round', () => {
  const game = engine.createGame('sam', 1);
  game.turn = 1;
  game.hands[1] = [12, 16, 20];
  assert.equal(engine.botTurn(game), true);
  assert.equal(game.winner, 1);
  assert.equal(game.hands[1].length, 0);
});

test('UNO engine deals seven cards and supports local winning moves', () => {
  const game = engine.createGame('uno', 2);
  game.turn = 0;
  assert.equal(game.seats.length, 3);
  assert.ok(game.hands.every(hand => hand.length === 7));
  game.hands[0] = ['R5'];
  game.top = 'R3';
  game.color = 'R';
  assert.equal(engine.unoPlay(game, 0, 'R5'), true);
  assert.equal(game.winner, 0);
});

test('UNO can play two identical cards together in offline mode', () => {
  const game = engine.createGame('uno', 2);
  game.turn = 0;
  game.top = 'R3';
  game.color = 'R';
  game.hands[0] = ['R5', 'R5', 'B2'];
  assert.equal(engine.unoPlayCards(game, 0, ['R5', 'R5']), true);
  assert.deepEqual(game.hands[0], ['B2']);
});

test('UNO enforces playing the card just drawn and lets a bot play locally', () => {
  const game = engine.createGame('uno', 1);
  game.turn = 0;
  game.top = 'R3';
  game.color = 'R';
  game.hands[0] = ['R5', 'B2'];
  game.drawnCardSeat = 0;
  game.drawnCard = 'R5';
  assert.equal(engine.unoPlay(game, 0, 'B2'), false);
  assert.equal(engine.unoPlay(game, 0, 'R5'), true);

  const stackGame = engine.createGame('uno', 2);
  stackGame.turn = 0;
  stackGame.top = 'RD';
  stackGame.color = 'R';
  stackGame.pendingDraw = { seat: 0, amount: 2 };
  stackGame.hands[0] = ['WF', 'B2'];
  assert.equal(engine.unoPlay(stackGame, 0, 'WF', 'B'), true);
  assert.equal(stackGame.pendingDraw.amount, 6);

  const botGame = engine.createGame('uno', 1);
  botGame.turn = 1;
  botGame.top = 'R3';
  botGame.color = 'R';
  botGame.hands[1] = ['R5'];
  assert.equal(engine.botTurn(botGame), true);
  assert.equal(botGame.winner, 1);
});


test('offline Sâm and UNO reuse the classic GameVerse table, hand, effects and chat layout', () => {
  const page = fs.readFileSync(path.join(root, 'games', 'cards-offline.html'), 'utf8');
  for (const marker of ['game-screen', 'game-topbar', 'player-strip', 'game-table-area', 'felt', 'hand-zone', 'action-bar', 'game-chat-dock', 'chat-box', 'emote-row', 'uno-flight', 'action-fx', 'global-ticker']) {
    assert.ok(page.includes(marker), 'missing classic UI marker: ' + marker);
  }
  assert.match(page, /offline-start/);
  assert.match(page, /offline-bots/);
  assert.match(page, /Bình luận/);
  assert.match(page, /Thả cảm xúc/);
});
