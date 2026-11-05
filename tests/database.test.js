'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  getOrCreateProfile, createAccount, loginAccount, getSessionUser,
  deleteSession, updateAccountProfile, publicProfile
} = require('../database');

test('tài khoản liên kết hồ sơ khách và chỉ công khai thông tin an toàn', { skip: !process.env.DATABASE_URL }, async () => {
  const profileToken = crypto.randomBytes(32).toString('hex');
  const email = 'samuno-' + crypto.randomBytes(8).toString('hex') + '@example.test';
  const guest = await getOrCreateProfile(profileToken, 'Khach Thu');
  const created = await createAccount({ email, password: 'MatKhauThuNghiem123', nickname: 'Nguoi Choi', profileToken });
  assert.equal(created.profile.id, guest.id, 'giữ nguyên ID hồ sơ khách khi liên kết');
  assert.equal(created.profile.name, 'Nguoi Choi');

  const session = await getSessionUser(created.sessionToken);
  assert.equal(session.email, email);
  assert.equal(session.profile_id, guest.id);

  const visible = await publicProfile(guest.id);
  assert.equal(visible.name, 'Nguoi Choi');
  assert.equal(visible.email, undefined);
  assert.equal(visible.password_hash, undefined);

  await assert.rejects(loginAccount({ email, password: 'sai-mat-khau-123' }), /invalid_credentials/);
  const loggedIn = await loginAccount({ email, password: 'MatKhauThuNghiem123' });
  assert.equal((await getSessionUser(loggedIn.sessionToken)).id, session.id);

  const updated = await updateAccountProfile(session.id, 'Nguoi Choi Moi', '🐼');
  assert.equal(updated.name, 'Nguoi Choi Moi');
  assert.equal(updated.avatar, '🐼');
  assert.equal((await publicProfile(guest.id)).avatar, '🐼');

  await deleteSession(created.sessionToken);
  assert.equal(await getSessionUser(created.sessionToken), null);
});
