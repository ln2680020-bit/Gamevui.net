'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
let pool = null;
let ready = null;
const SESSION_DAYS = 30;

function databaseEnabled() { return !!process.env.DATABASE_URL; }
function tokenHash(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }
function cleanEmail(value) { return String(value || '').trim().toLowerCase(); }
function cleanName(value) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 24) || 'Người chơi'; }
async function passwordHash(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(String(password), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return 'scrypt$16384$8$1$' + salt.toString('hex') + '$' + Buffer.from(derived).toString('hex');
}
async function passwordMatches(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltHex, hashHex] = parts;
  if (!/^\d+$/.test(n) || !/^\d+$/.test(r) || !/^\d+$/.test(p) || !/^[a-f0-9]{32}$/.test(saltHex) || !/^[a-f0-9]{128}$/.test(hashHex)) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = Buffer.from(await scrypt(String(password), Buffer.from(saltHex, 'hex'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 }));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function newSessionToken() { return crypto.randomBytes(32).toString('hex'); }
function sessionExpiry() { return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000); }

async function initDatabase() {
  if (!databaseEnabled()) return false;
  if (ready) return ready;
  ready = (async () => {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        id TEXT PRIMARY KEY,
        token_hash TEXT UNIQUE NOT NULL,
        name VARCHAR(24) NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        games INTEGER NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0,
        best_streak INTEGER NOT NULL DEFAULT 0,
        stats JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_users (
        id TEXT PRIMARY KEY,
        email VARCHAR(254) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nickname VARCHAR(24) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query('ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES game_users(id)');
    await pool.query("ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS avatar VARCHAR(16) NOT NULL DEFAULT '🎴'");
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS player_profiles_user_id_idx ON player_profiles (user_id) WHERE user_id IS NOT NULL');
    await pool.query('CREATE INDEX IF NOT EXISTS player_profiles_score_idx ON player_profiles (score DESC)');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_user_sessions (
        session_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES game_users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS game_user_sessions_user_idx ON game_user_sessions (user_id)');
    return true;
  })().catch(error => { ready = null; pool = null; throw error; });
  return ready;
}

async function createAccount({ email, password, nickname, profileToken }) {
  if (!databaseEnabled()) throw new Error('persistence_unavailable');
  await initDatabase();
  const normalizedEmail = cleanEmail(email), cleanNickname = cleanName(nickname);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) throw new Error('invalid_email');
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) throw new Error('weak_password');
  if (typeof profileToken !== 'string' || profileToken.length < 32 || profileToken.length > 128) throw new Error('invalid_guest_profile');
  const hashedPassword = await passwordHash(password), sessionToken = newSessionToken(), client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query('INSERT INTO game_users (id,email,password_hash,nickname) VALUES ($1,$2,$3,$4) RETURNING id,email,nickname,created_at', [crypto.randomBytes(18).toString('hex'), normalizedEmail, hashedPassword, cleanNickname]);
    const user = userResult.rows[0], guestHash = tokenHash(profileToken);
    const guest = await client.query('SELECT id,user_id FROM player_profiles WHERE token_hash=$1 FOR UPDATE', [guestHash]);
    let profile;
    if (guest.rows[0]) {
      if (guest.rows[0].user_id) throw new Error('guest_profile_already_linked');
      const updated = await client.query('UPDATE player_profiles SET user_id=$2,name=$3,updated_at=NOW() WHERE id=$1 RETURNING id,name,avatar,score,wins,games,streak,best_streak,stats,created_at', [guest.rows[0].id,user.id,cleanNickname]);
      profile = updated.rows[0];
    } else {
      const created = await client.query("INSERT INTO player_profiles (id,token_hash,user_id,name) VALUES ($1,$2,$3,$4) RETURNING id,name,avatar,score,wins,games,streak,best_streak,stats,created_at", [crypto.randomBytes(18).toString('hex'),guestHash,user.id,cleanNickname]);
      profile = created.rows[0];
    }
    await client.query('INSERT INTO game_user_sessions (session_hash,user_id,expires_at) VALUES ($1,$2,$3)', [tokenHash(sessionToken),user.id,sessionExpiry()]);
    await client.query('COMMIT');
    return { user, profile, sessionToken };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505' && error.constraint === 'game_users_email_key') throw new Error('email_exists');
    throw error;
  } finally { client.release(); }
}

async function loginAccount({ email, password }) {
  if (!databaseEnabled()) throw new Error('persistence_unavailable');
  await initDatabase();
  const result = await pool.query('SELECT id,email,password_hash,nickname,created_at FROM game_users WHERE email=$1', [cleanEmail(email)]);
  const user = result.rows[0];
  if (!user || !(await passwordMatches(password, user.password_hash))) throw new Error('invalid_credentials');
  const sessionToken = newSessionToken();
  await pool.query('INSERT INTO game_user_sessions (session_hash,user_id,expires_at) VALUES ($1,$2,$3)', [tokenHash(sessionToken),user.id,sessionExpiry()]);
  delete user.password_hash;
  return { user, sessionToken };
}

async function getSessionUser(sessionToken) {
  if (!databaseEnabled() || typeof sessionToken !== 'string' || !sessionToken) return null;
  await initDatabase();
  const result = await pool.query(`
    SELECT u.id,u.email,u.nickname,u.created_at,p.id AS profile_id,p.name AS profile_name,p.avatar,p.score,p.wins,p.games,p.streak,p.best_streak,p.stats,p.created_at AS profile_created_at
    FROM game_user_sessions s JOIN game_users u ON u.id=s.user_id
    LEFT JOIN player_profiles p ON p.user_id=u.id
    WHERE s.session_hash=$1 AND s.expires_at>NOW()
  `, [tokenHash(sessionToken)]);
  return result.rows[0] || null;
}

async function deleteSession(sessionToken) {
  if (!databaseEnabled() || typeof sessionToken !== 'string' || !sessionToken) return false;
  await initDatabase();
  await pool.query('DELETE FROM game_user_sessions WHERE session_hash=$1', [tokenHash(sessionToken)]);
  return true;
}

async function updateAccountProfile(userId, nickname, avatar) {
  if (!databaseEnabled()) throw new Error('persistence_unavailable');
  await initDatabase();
  const cleanNickname = cleanName(nickname);
  const allowedAvatars = ['🎴','🦊','🐼','🐯','🐸','🐱','🐻','🐲','🦁','🐵','🐧','🐰'];
  const cleanAvatar = allowedAvatars.includes(avatar) ? avatar : '🎴';
  const result = await pool.query(`
    UPDATE player_profiles SET name=$2,avatar=$3,updated_at=NOW()
    WHERE user_id=$1 RETURNING id,name,avatar,score,wins,games,streak,best_streak,stats,created_at
  `, [userId,cleanNickname,cleanAvatar]);
  if (!result.rows[0]) throw new Error('profile_not_found');
  await pool.query('UPDATE game_users SET nickname=$2,updated_at=NOW() WHERE id=$1', [userId,cleanNickname]);
  return result.rows[0];
}

async function publicProfile(profileId) {
  if (!databaseEnabled()) return null;
  await initDatabase();
  const result = await pool.query(`
    SELECT id,name,avatar,score,wins,games,streak,best_streak,stats,created_at
    FROM player_profiles WHERE id=$1
  `, [String(profileId || '')]);
  return result.rows[0] || null;
}

async function getOrCreateProfile(profileToken, name, userId = null) {
  if (!databaseEnabled()) return null;
  await initDatabase();
  const hash = tokenHash(profileToken);
  if (userId) {
    const existing = await pool.query('SELECT id,name,avatar,score,wins,games,streak,best_streak,stats FROM player_profiles WHERE user_id=$1', [userId]);
    if (existing.rows[0]) return existing.rows[0];
    try {
      const created = await pool.query(`
        INSERT INTO player_profiles (id,token_hash,user_id,name) VALUES ($1,$2,$3,$4)
        RETURNING id,name,avatar,score,wins,games,streak,best_streak,stats
      `, [crypto.randomBytes(18).toString('hex'),hash,userId,cleanName(name)]);
      return created.rows[0];
    } catch (error) {
      if (error.code !== '23505') throw error;
      const raced = await pool.query('SELECT id,name,avatar,score,wins,games,streak,best_streak,stats FROM player_profiles WHERE user_id=$1', [userId]);
      if (raced.rows[0]) return raced.rows[0];
      throw error;
    }
  }
  const result = await pool.query(`
    INSERT INTO player_profiles (id, token_hash, name)
    VALUES ($1, $2, $3)
    ON CONFLICT (token_hash) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    RETURNING id, name, avatar, score, wins, games, streak, best_streak, stats
  `, [crypto.randomBytes(18).toString('hex'), hash, cleanName(name)]);
  return result.rows[0];
}

async function saveProfile(player) {
  if (!pool || !player || player.bot) return false;
  await pool.query(`
    UPDATE player_profiles SET name=$2,score=$3,wins=$4,games=$5,streak=$6,
      best_streak=$7,stats=$8::jsonb,updated_at=NOW()
    WHERE id=$1
  `, [player.id,player.name,player.score||0,player.wins||0,player.games||0,player.streak||0,player.bestStreak||0,JSON.stringify(player.stats||{})]);
  return true;
}

async function globalLeaderboard(mode) {
  if (!databaseEnabled()) return null;
  await initDatabase();
  const result = await pool.query(`
    SELECT id,name,COALESCE((stats -> $1 ->> 'wins')::int,0) AS wins,
      COALESCE((stats -> $1 ->> 'games')::int,0) AS games,
      COALESCE((stats -> $1 ->> 'points')::int,0) AS points,streak,best_streak
    FROM player_profiles
    ORDER BY COALESCE((stats -> $1 ->> 'wins')::int,0) DESC,
      COALESCE((stats -> $1 ->> 'points')::int,0) DESC,best_streak DESC
    LIMIT 50
  `, [mode]);
  return result.rows;
}

async function closeDatabase() { if (pool) await pool.end(); pool = null; ready = null; }
module.exports = { databaseEnabled, initDatabase, getOrCreateProfile, saveProfile, globalLeaderboard, createAccount, loginAccount, getSessionUser, deleteSession, updateAccountProfile, publicProfile, closeDatabase };
