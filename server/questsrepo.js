// server/questsRepo.js
import pool from './db/pool.js';

// Pull weights among preset rarities (must sum to something reasonable; ratios matter, not the total).
const RARITY_WEIGHTS = {
  common: 45,
  uncommon: 28,
  rare: 15,
  epic: 9,
  legendary: 3,
};

// Chance that a spin pulls from the pool of user-added ("unique") quests
// instead of the rarity-weighted preset pool. This project has no real
// accounts — user_id is just a per-browser id — so the unique pool is
// shared globally rather than scoped to whoever happens to be spinning.
// Scoping it per-browser caused a confusing bug during testing: quests
// added in one browser session were invisible (and undrawable) in another,
// making the pool look far smaller than it actually was.
const UNIQUE_PULL_CHANCE = 0.15;

function pickWeightedRarity(availableRarities) {
  // availableRarities: array of { rarity, count } from a DB query
  const pool = availableRarities.filter((r) => r.count > 0);
  if (pool.length === 0) return null;

  const totalWeight = pool.reduce((sum, r) => sum + (RARITY_WEIGHTS[r.rarity] || 0), 0);
  let roll = Math.random() * totalWeight;

  for (const r of pool) {
    roll -= RARITY_WEIGHTS[r.rarity] || 0;
    if (roll <= 0) return r.rarity;
  }
  return pool[pool.length - 1].rarity; // fallback for rounding edge cases
}

export async function getAllQuests({ rarity, category } = {}) {
  const conditions = [];
  const values = [];

  if (rarity) {
    values.push(rarity);
    conditions.push(`rarity = $${values.length}`);
  }
  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM quests ${where} ORDER BY created_at DESC`,
    values
  );
  return rows;
}

export async function addUserQuest({ text, category, userId }) {
  const { rows } = await pool.query(
    `INSERT INTO quests (text, category, rarity, is_preset, user_id)
     VALUES ($1, $2, 'unique', FALSE, $3)
     RETURNING *`,
    [text, category || null, userId]
  );
  return rows[0];
}

export async function spinForQuest() {
  // Decide whether to pull from the (global) unique pool. Inactive quests
  // are excluded here — deactivating a quest hides it from spins without
  // deleting it.
  const { rows: uniqueRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM quests WHERE rarity = 'unique' AND is_active = TRUE`
  );
  const hasUnique = uniqueRows[0].count > 0;

  if (hasUnique && Math.random() < UNIQUE_PULL_CHANCE) {
    const { rows } = await pool.query(
      `SELECT * FROM quests WHERE rarity = 'unique' AND is_active = TRUE ORDER BY RANDOM() LIMIT 1`
    );
    return rows[0];
  }

  // Otherwise pull from the rarity-weighted preset pool
  const { rows: counts } = await pool.query(
    `SELECT rarity, COUNT(*)::int AS count
     FROM quests
     WHERE is_preset = TRUE AND is_active = TRUE
     GROUP BY rarity`
  );

  const chosenRarity = pickWeightedRarity(counts);
  if (!chosenRarity) return null;

  const { rows } = await pool.query(
    `SELECT * FROM quests WHERE is_preset = TRUE AND is_active = TRUE AND rarity = $1
     ORDER BY RANDOM() LIMIT 1`,
    [chosenRarity]
  );
  return rows[0];
}

export async function completeQuest(id, userId) {
  const { rows } = await pool.query(
    `UPDATE quests SET is_completed = TRUE, date_completed = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );

  if (rows[0]) {
    await pool.query(
      `INSERT INTO quest_history (quest_id, user_id, completed_at) VALUES ($1, $2, NOW())`,
      [id, userId || null]
    );
  }

  return rows[0];
}

// History is also shown globally, for the same reason as the unique pool —
// there's no real login, so scoping "your" history to a browser-local id
// just hides real data across sessions/devices.
export async function getHistory() {
  const { rows } = await pool.query(
    `SELECT qh.id, qh.completed_at, q.text, q.rarity, q.category
     FROM quest_history qh
     JOIN quests q ON q.id = qh.quest_id
     ORDER BY qh.completed_at DESC`
  );
  return rows;
}

export async function deleteUserQuest(id) {
  const { rowCount } = await pool.query(
    `DELETE FROM quests WHERE id = $1 AND is_preset = FALSE`,
    [id]
  );
  return rowCount > 0;
}

// Toggles a quest's active state — an inactive quest is skipped by spins
// but stays in the database, unlike delete which removes it permanently.
export async function toggleQuestActive(id) {
  const { rows } = await pool.query(
    `UPDATE quests SET is_active = NOT is_active WHERE id = $1 AND is_preset = FALSE RETURNING *`,
    [id]
  );
  return rows[0];
}

// Clears the completion log AND resets every quest's completion state, so
// testing (or just wanting a fresh start) doesn't leave quests permanently
// marked "done" forever with no way back.
export async function resetHistory() {
  await pool.query(`DELETE FROM quest_history`);
  await pool.query(`UPDATE quests SET is_completed = FALSE, date_completed = NULL`);
}