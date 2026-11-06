'use strict';

const crypto = require('node:crypto');

const INVITE_TTL = 24 * 60 * 60 * 1000;
const MAX_INVITES = 10000;

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createInvite(invites, roomCode, creatorId, now = Date.now(), ttl = INVITE_TTL) {
  if (!(invites instanceof Map)) throw new TypeError('invites_map_required');
  if (typeof roomCode !== 'string' || !roomCode || typeof creatorId !== 'string' || !creatorId) {
    throw new TypeError('invalid_invite_owner');
  }
  for (const [hash, invite] of invites) {
    if (!invite || invite.expiresAt <= now) invites.delete(hash);
  }
  if (invites.size >= MAX_INVITES) throw new Error('invite_limit');
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = now + Math.min(Math.max(Number(ttl) || INVITE_TTL, 60_000), INVITE_TTL);
  invites.set(tokenHash(token), { roomCode, creatorId, createdAt: now, expiresAt });
  return { token, expiresAt, path: '/invite/' + token };
}

function getInvite(invites, token, now = Date.now()) {
  if (!(invites instanceof Map) || typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  const hash = tokenHash(token);
  const invite = invites.get(hash);
  if (!invite) return null;
  if (invite.expiresAt <= now) {
    invites.delete(hash);
    return null;
  }
  return { ...invite };
}

function revokeInvite(invites, token) {
  if (!(invites instanceof Map) || typeof token !== 'string') return false;
  return invites.delete(tokenHash(token));
}

module.exports = { INVITE_TTL, MAX_INVITES, createInvite, getInvite, revokeInvite };
