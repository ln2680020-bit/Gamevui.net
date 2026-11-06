'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { INVITE_TTL, createInvite, getInvite, revokeInvite } = require('../room-invites');

test('tạo link mời bằng token ngẫu nhiên và chỉ lưu bản băm', () => {
  const invites = new Map();
  const made = createInvite(invites, 'ROOM1', 'host', 1000);
  assert.match(made.token, /^[A-Za-z0-9_-]{40,50}$/);
  assert.equal(made.path, '/invite/' + made.token);
  assert.equal(made.expiresAt, 1000 + INVITE_TTL);
  assert.equal(invites.has(made.token), false);
  assert.deepEqual(getInvite(invites, made.token, 1001), {
    roomCode: 'ROOM1', creatorId: 'host', createdAt: 1000, expiresAt: 1000 + INVITE_TTL
  });
});

test('link mời hết hạn không còn hợp lệ', () => {
  const invites = new Map();
  const made = createInvite(invites, 'ROOM1', 'host', 1000);
  assert.equal(getInvite(invites, made.token, made.expiresAt), null);
  assert.equal(invites.size, 0);
});

test('không chấp nhận token sai định dạng hoặc token không tồn tại', () => {
  assert.equal(getInvite(new Map(), 'abc'), null);
  assert.equal(getInvite(new Map(), 'A'.repeat(43)), null);
});

test('có thể thu hồi link mời', () => {
  const invites = new Map();
  const made = createInvite(invites, 'ROOM1', 'host', 1000);
  assert.equal(revokeInvite(invites, made.token), true);
  assert.equal(getInvite(invites, made.token, 1001), null);
});

test('tự dọn link hết hạn trước khi kiểm tra giới hạn', () => {
  const invites = new Map([['expired', { roomCode: 'OLD', creatorId: 'x', createdAt: 0, expiresAt: 1 }]]);
  const made = createInvite(invites, 'ROOM2', 'host', 1000);
  assert.equal(invites.size, 1);
  assert.equal(getInvite(invites, made.token, 1001).roomCode, 'ROOM2');
});

test('server và các script lời mời có cú pháp JavaScript hợp lệ', () => {
  const server = fs.readFileSync(require.resolve('../server'), 'utf8');
  const client = fs.readFileSync(require.resolve('../invite-client.js'), 'utf8');
  const page = fs.readFileSync(require.resolve('../invite.html'), 'utf8');
  new vm.Script(server, { filename: 'server.js' });
  new vm.Script(client, { filename: 'invite-client.js' });
  const inline = [...page.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)];
  assert.equal(inline.length, 1);
  new vm.Script(inline[0][1], { filename: 'invite.html' });
});

test('mọi trò chơi có chế độ online đều được gắn công cụ mời dùng chung', () => {
  const server = fs.readFileSync(require.resolve('../server'), 'utf8');
  for (const game of ['caro', 'chess']) assert.ok(server.includes("readGamePage(path.join(__dirname,'games','" + game + ".html'))"));
  assert.ok(server.includes("readGamePage(path.join(__dirname,'games',game+'.html'))"));
  assert.ok(server.includes("readGamePage(path.join(__dirname,'index.html'))"));
  for (const game of ['sam','uno','caro','chess','monopoly','sudoku','word','sequence']) assert.ok(server.includes("'" + game + "'"));
});

test('server cung cấp API tạo và xác minh lời mời cùng thông báo phòng', () => {
  const server = fs.readFileSync(require.resolve('../server'), 'utf8');
  assert.ok(server.includes("url.pathname==='/api/room/invite'"));
  assert.ok(server.includes("url.pathname.startsWith('/api/invite/')"));
  assert.ok(server.includes("pushRoomNotification(r,'player_joined'"));
  assert.ok(server.includes("notifications:r.notifications||[]"));
});
