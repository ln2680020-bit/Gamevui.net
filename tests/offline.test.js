'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const worker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

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
