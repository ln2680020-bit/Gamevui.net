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
  assert.match(worker, /gameverse-offline-v3/);
});
