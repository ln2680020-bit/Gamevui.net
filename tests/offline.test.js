'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('GameVerse offline shell precaches every standalone game page', () => {
  for (const route of [
    '/',
    '/play',
    '/games/caro',
    '/games/chess',
    '/games/2048',
    '/games/monopoly',
    '/games/sudoku',
    '/games/word',
    '/games/sequence'
  ]) {
    assert.match(worker, new RegExp("'" + route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'"));
  }
});

test('GameVerse offline shell precaches standalone game engines', () => {
  for (const asset of [
    '/games/caro-engine.js',
    '/games/chess-engine.js',
    '/games/2048-engine.js',
    '/gameverse-icon.svg',
    '/manifest.webmanifest'
  ]) {
    assert.ok(worker.includes("'" + asset + "'"), 'Missing offline asset: ' + asset);
  }
});

test('offline navigation can reuse cached pages when the URL has mode parameters', () => {
  assert.match(worker, /new Request\(url\.origin \+ url\.pathname\)/);
  assert.match(worker, /cache\.match\(pathRequest\)/);
});

test('server-only API and realtime endpoints are excluded from offline caching', () => {
  assert.match(worker, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(worker, /url\.pathname === '\/events'/);
  assert.match(worker, /url\.pathname\.includes\('\/socket'\)/);
});

test('offline shell precaches the shared client injected into every game page', () => {
  assert.ok(worker.includes("'/invite-client.js'"), 'Missing cached shared game client'); 
  assert.match(server, /function readGamePage\(file\)[\s\S]*invite-client\.js/);
});

test('every standalone game page has a matching server route and offline cache entry', () => {
  const games = ['caro', 'chess', '2048', 'monopoly', 'sudoku', 'word', 'sequence'];
  for (const game of games) {
    const route = '/games/' + game;
    assert.ok(fs.existsSync(path.join(root, 'games', game + '.html')), 'Missing page: ' + game);
    assert.ok(server.includes("url.pathname==='" + route + "'") ||
      server.includes("url.pathname==='/games/'+game") && server.includes("'" + game + "'"),
      'Missing server route for: ' + game);
    assert.ok(worker.includes("'" + route + "'"), 'Missing offline route: ' + route);
  }
});

test('offline cache version changes when the shell is revised', () => {
  assert.match(worker, /gameverse-offline-v4/);
});


test('all local game pages reference available same-origin script assets', () => {
  const games = ['2048', 'caro', 'chess', 'monopoly', 'sequence', 'sudoku', 'word'];
  for (const game of games) {
    const html = fs.readFileSync(path.join(root, 'games', game + '.html'), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]);
    for (const src of scripts) {
      assert.ok(src.startsWith('/'), game + ' has a non-root script URL: ' + src);
      assert.ok(fs.existsSync(path.join(root, src.slice(1))), game + ' references missing script: ' + src);
      assert.ok(worker.includes("'" + src + "'"), 'Offline shell does not precache ' + src);
    }
  }
});

test('hub catalog includes all nine games and local standalone pages are precached', () => {
  const hub = fs.readFileSync(path.join(root, 'hub.html'), 'utf8');
  for (const title of ['Sâm', 'UNO', 'Cờ vua', 'Cờ caro', 'Cờ tỷ phú', '2048', 'Sudoku', 'Đoán từ', 'Bấm ô theo thứ tự']) assert.ok(hub.includes(title), 'Hub catalog is missing: ' + title);
  for (const route of ['/games/2048', '/games/caro', '/games/chess', '/games/monopoly', '/games/sudoku', '/games/word', '/games/sequence']) assert.ok(worker.includes("'" + route + "'"), 'Offline shell is missing: ' + route);
});

test('Sâm and UNO are not falsely marked offline-ready while client requires server events', () => {
  const hub = fs.readFileSync(path.join(root, 'hub.html'), 'utf8'); const play = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(hub, /data-game="sam"/); assert.match(hub, /data-game="uno"/); assert.match(play, /new EventSource/); assert.ok(play.includes('/api/'));
});
