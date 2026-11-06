'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
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
