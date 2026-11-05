'use strict';
const crypto = require('node:crypto');

let pool = null;
let ready = null;

function databaseEnabled() { return !!process.env.DATABASE_URL; }
function tokenHash(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }

async function initDatabase() {
  if (!databaseEnabled()) return false;
  if (ready) return ready;
  ready = (async () => {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
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
    await pool.query('CREATE INDEX IF NOT EXISTS player_profiles_score_idx ON player_profiles (score DESC)');
    return true;
  })().catch(error => { ready = null; pool = null; throw error; });
  return ready;
}

async function getOrCreateProfile(profileToken, name) {
  if (!databaseEnabled()) return null;
  await initDatabase();
  const hash = tokenHash(profileToken);
  const result = await pool.query(`
    INSERT INTO player_profiles (id, token_hash, name)
    VALUES ($1, $2, $3)
    ON CONFLICT (token_hash) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = NOW()
    RETURNING id, name, score, wins, games, streak, best_streak, stats
  `, [crypto.randomBytes(18).toString('hex'), hash, String(name).slice(0,24)]);
  return result.rows[0];
}

async function saveProfile(player) {
  if (!pool || !player || player.bot) return false;
  await pool.query(`
    UPDATE player_profiles SET
      name=$2, score=$3, wins=$4, games=$5, streak=$6,
      best_streak=$7, stats=$8::jsonb, updated_at=NOW()
    WHERE id=$1
  `, [player.id, player.name, player.score||0, player.wins||0, player.games||0,
      player.streak||0, player.bestStreak||0, JSON.stringify(player.stats||{})]);
  return true;
}

async function globalLeaderboard(mode) {
  if (!databaseEnabled()) return null;
  await initDatabase();
  const result = await pool.query(`
    SELECT id, name,
      COALESCE((stats->>$1)::jsonb->>'wins','0')::int AS wins,
      COALESCE((stats->>$1)::jsonb->>'games','0')::int AS games,
      COALESCE((stats->>$1)::jsonb->>'points','0')::int AS points,
      streak, best_streak
    FROM player_profiles
    ORDER BY COALESCE((stats->>$1)::jsonb->>'wins','0')::int DESC,
             COALESCE((stats->>$1)::jsonb->>'points','0')::int DESC,
             best_streak DESC
    LIMIT 50
  `, [mode]);
  return result.rows;
}

async function closeDatabase() {
  if (pool) await pool.end();
  pool = null;
  ready = null;
}

module.exports = { databaseEnabled, initDatabase, getOrCreateProfile, saveProfile, globalLeaderboard, closeDatabase };
