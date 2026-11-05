'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();

const LIMITS = {
  roomCode: 20,
  playerId: 40,
  playerName: 32,
  maxRooms: 2000,
  maxPlayersPerRoom: 12,
  maxPresenceBytes: 16384,
  disconnectGraceMs: 15000,
  heartbeatMs: 20000,
  emptyRoomTtlMs: 5 * 60 * 1000
};

function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(value));
}

function validCode(value) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= LIMITS.roomCode &&
    /^[a-zA-Z0-9_-]+$/.test(value);
}

function validId(value) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= LIMITS.playerId &&
    /^[a-zA-Z0-9_-]+$/.test(value);
}

function cleanPresence(presence) {
  const result = {};
  if (presence && typeof presence.name === 'string') {
    result.name = presence.name.trim().slice(0, LIMITS.playerName);
  }
  // Preserve the existing game payload format for compatibility.
  // The game state is still client-published in this phase; server authority
  // is intentionally implemented in a later phase.
  if (presence && Object.prototype.hasOwnProperty.call(presence, 'g')) {
    result.g = presence.g;
  }
  if (presence && presence.cmd && typeof presence.cmd === 'object') {
    result.cmd = presence.cmd;
  }
  return result;
}

function getRoom(code, create = false) {
  let room = rooms.get(code);
  if (!room && create) {
    if (rooms.size >= LIMITS.maxRooms) return null;
    room = { players: new Map(), createdAt: Date.now(), emptyAt: null };
    rooms.set(code, room);
  }
  return room;
}

function snapshot(room) {
  return [...room.players.entries()].map(([id, player]) => ({
    peer: id,
    presence: player.presence
  }));
}

function broadcast(code) {
  const room = rooms.get(code);
  if (!room) return;
  const message = `data: ${JSON.stringify(snapshot(room))}\n\n`;
  for (const player of room.players.values()) {
    if (!player.res || player.res.destroyed || player.res.writableEnded) continue;
    try {
      player.res.write(message);
    } catch (_) {
      // A disconnected client is removed by its close handler.
    }
  }
}

function removePlayer(code, id, expectedPlayer) {
  const room = rooms.get(code);
  if (!room || room.players.get(id) !== expectedPlayer) return;
  room.players.delete(id);
  if (room.players.size === 0) {
    room.emptyAt = Date.now();
  }
  broadcast(code);
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        reject(new Error('body_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, {
      ok: true,
      service: 'sam-uno',
      rooms: rooms.size,
      uptimeSeconds: Math.floor(process.uptime())
    });
  }

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    return res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
  }

  if (req.method === 'GET' && url.pathname === '/events') {
    const code = url.searchParams.get('room') || '';
    const id = url.searchParams.get('id') || '';
    if (!validCode(code) || !validId(id)) {
      return json(res, 400, { ok: false, error: 'invalid_room_or_player_id' });
    }

    const room = getRoom(code, true);
    if (!room) return json(res, 503, { ok: false, error: 'room_capacity_reached' });

    const existing = room.players.get(id);
    if (!existing && room.players.size >= LIMITS.maxPlayersPerRoom) {
      return json(res, 409, { ok: false, error: 'room_is_full' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 1500\n\n');

    if (existing && existing.res && existing.res !== res) {
      try { existing.res.end(); } catch (_) {}
    }

    const player = {
      presence: existing ? existing.presence : {},
      res,
      connectedAt: Date.now()
    };
    room.players.set(id, player);
    room.emptyAt = null;

    const keepAlive = setInterval(() => {
      if (!res.destroyed && !res.writableEnded) {
        try { res.write(': keep-alive\n\n'); } catch (_) {}
      }
    }, LIMITS.heartbeatMs);

    res.on('close', () => {
      clearInterval(keepAlive);
      // Grace period prevents brief network drops from instantly removing
      // a player. Reconnecting with the same id replaces this player object.
      setTimeout(() => removePlayer(code, id, player), LIMITS.disconnectGraceMs);
    });

    broadcast(code);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/presence') {
    try {
      const raw = await readBody(req, LIMITS.maxPresenceBytes);
      const data = JSON.parse(raw);
      const code = data.room;
      const id = data.id;
      if (!validCode(code) || !validId(id) ||
          !data.patch || typeof data.patch !== 'object' || Array.isArray(data.patch)) {
        return json(res, 400, { ok: false, error: 'invalid_presence_payload' });
      }

      const room = getRoom(code, false);
      const player = room && room.players.get(id);
      if (!player) return json(res, 404, { ok: false, error: 'player_not_connected' });

      const patch = cleanPresence(data.patch);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) delete player.presence[key];
        else player.presence[key] = value;
      }
      broadcast(code);
      return json(res, 200, { ok: true });
    } catch (error) {
      if (!res.headersSent) {
        return json(res, error.message === 'body_too_large' ? 413 : 400, {
          ok: false,
          error: 'invalid_request'
        });
      }
    }
  }

  return json(res, 404, { ok: false, error: 'not_found' });
});

// Remove empty rooms after a short TTL so the in-memory map does not grow forever.
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.players.size === 0 && room.emptyAt &&
        now - room.emptyAt >= LIMITS.emptyRoomTtlMs) {
      rooms.delete(code);
    }
  }
}, 60000);

server.listen(PORT, () => {
  console.log(`Sam & UNO server listening on port ${PORT}`);
});

function shutdown() {
  clearInterval(cleanup);
  for (const room of rooms.values()) {
    for (const player of room.players.values()) {
      try { player.res.end(); } catch (_) {}
    }
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
