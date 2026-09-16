'use strict';

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: /localhost|127\.0\.0\.1/.test(config.databaseUrl) ? false : { rejectUnauthorized: false },
  max: 5,
});

pool.on('error', (e) => console.error('[db] pool xatoligi:', e.message));

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          BIGINT PRIMARY KEY,
      username    TEXT,
      first_name  TEXT,
      balance     BIGINT      NOT NULL DEFAULT 0,
      ref_by      BIGINT,
      ref_earned  BIGINT      NOT NULL DEFAULT 0,
      api_key     TEXT UNIQUE,
      is_partner  BOOLEAN     NOT NULL DEFAULT FALSE,
      is_blocked  BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                SERIAL PRIMARY KEY,
      user_id           BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service_id        TEXT        NOT NULL,
      service_name      TEXT        NOT NULL,
      link              TEXT        NOT NULL,
      quantity          INTEGER     NOT NULL,
      price             BIGINT      NOT NULL,
      status            TEXT        NOT NULL DEFAULT 'pending',
      provider_order_id TEXT,
      is_free           BOOLEAN     NOT NULL DEFAULT FALSE,
      source            TEXT        NOT NULL DEFAULT 'bot',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id              SERIAL PRIMARY KEY,
      user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount          BIGINT      NOT NULL,
      receipt_file_id TEXT,
      status          TEXT        NOT NULL DEFAULT 'pending',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_ref     ON users(ref_by);
  `);

  // Eski bazalarni yangilash (agar jadval avval yaratilgan bo'lsa)
  await pool.query(`
    ALTER TABLE users  ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS source  TEXT    NOT NULL DEFAULT 'bot';
  `);

  console.log('[db] PostgreSQL tayyor');
}

async function one(sql, params) {
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function many(sql, params) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

async function getUser(id) {
  return one('SELECT * FROM users WHERE id = $1', [id]);
}

async function getUserByApiKey(key) {
  return one('SELECT * FROM users WHERE api_key = $1', [key]);
}

async function upsertUser({ id, username, first_name, ref_by }) {
  return one(
    `INSERT INTO users (id, username, first_name, ref_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
       SET username = COALESCE(EXCLUDED.username, users.username),
           first_name = COALESCE(EXCLUDED.first_name, users.first_name)
     RETURNING *`,
    [id, username || null, first_name || null, ref_by || null]
  );
}

async function updateUser(id, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return getUser(id);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  return one(`UPDATE users SET ${sets} WHERE id = $1 RETURNING *`, [id, ...keys.map((k) => patch[k])]);
}

async function addBalance(id, amount) {
  return one('UPDATE users SET balance = balance + $2 WHERE id = $1 RETURNING *', [id, Math.round(amount)]);
}

async function addRefEarned(id, amount) {
  return one('UPDATE users SET ref_earned = ref_earned + $2 WHERE id = $1 RETURNING *', [id, Math.round(amount)]);
}

async function countReferrals(id) {
  const r = await one('SELECT COUNT(*)::int AS c FROM users WHERE ref_by = $1', [id]);
  return r ? r.c : 0;
}

async function allUserIds() {
  const rows = await many('SELECT id FROM users WHERE is_blocked = FALSE');
  return rows.map((r) => Number(r.id));
}

async function createOrder(o) {
  return one(
    `INSERT INTO orders (user_id, service_id, service_name, link, quantity, price, status, provider_order_id, is_free, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      o.user_id, o.service_id, o.service_name, o.link, o.quantity, o.price,
      o.status || 'pending', o.provider_order_id || null,
      Boolean(o.is_free), o.source || 'bot',
    ]
  );
}

/** Bugun berilgan bepul buyurtmalar soni */
async function countFreeOrdersToday(userId) {
  const r = await one(
    `SELECT COUNT(*)::int AS c FROM orders
      WHERE user_id = $1 AND is_free = TRUE
        AND status <> 'cancelled'
        AND created_at >= NOW()::date`,
    [userId]
  );
  return r ? r.c : 0;
}

async function getOrders(userId, limit = 10) {
  return many('SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC LIMIT $2', [userId, limit]);
}

async function getOrder(id) {
  return one('SELECT * FROM orders WHERE id = $1', [id]);
}

async function updateOrder(id, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return getOrder(id);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  return one(`UPDATE orders SET ${sets} WHERE id = $1 RETURNING *`, [id, ...keys.map((k) => patch[k])]);
}

async function createPayment(p) {
  return one(
    `INSERT INTO payments (user_id, amount, receipt_file_id, status)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [p.user_id, p.amount, p.receipt_file_id || null, p.status || 'pending']
  );
}

async function getPayment(id) {
  return one('SELECT * FROM payments WHERE id = $1', [id]);
}

async function updatePayment(id, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return getPayment(id);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  return one(`UPDATE payments SET ${sets} WHERE id = $1 RETURNING *`, [id, ...keys.map((k) => patch[k])]);
}

async function pendingPayments(limit = 20) {
  return many("SELECT * FROM payments WHERE status = 'pending' ORDER BY id ASC LIMIT $1", [limit]);
}

async function userStats(userId) {
  const r = await one(
    `SELECT COUNT(*)::int AS orders,
            COALESCE(SUM(price) FILTER (WHERE status <> 'cancelled'), 0)::bigint AS spent
       FROM orders WHERE user_id = $1`,
    [userId]
  );
  const d = await one(
    `SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0)::bigint AS deposited
       FROM payments WHERE user_id = $1`,
    [userId]
  );
  return {
    orders: r ? r.orders : 0,
    spent: r ? Number(r.spent) : 0,
    deposited: d ? Number(d.deposited) : 0,
    referrals: await countReferrals(userId),
  };
}

async function globalStats() {
  const u = await one(
    `SELECT COUNT(*)::int AS users,
            COUNT(*) FILTER (WHERE created_at::date = NOW()::date)::int AS new_today
       FROM users`
  );
  const o = await one(
    `SELECT COUNT(*)::int AS orders,
            COALESCE(SUM(price) FILTER (WHERE status <> 'cancelled'), 0)::bigint AS revenue
       FROM orders`
  );
  const p = await one(
    `SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0)::bigint AS topups,
            COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
       FROM payments`
  );
  return {
    users: u.users,
    newToday: u.new_today,
    orders: o.orders,
    revenue: Number(o.revenue),
    topups: Number(p.topups),
    pending: p.pending,
  };
}

module.exports = {
  init,
  getUser,
  getUserByApiKey,
  countFreeOrdersToday,
  upsertUser,
  updateUser,
  addBalance,
  addRefEarned,
  countReferrals,
  allUserIds,
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  createPayment,
  getPayment,
  updatePayment,
  pendingPayments,
  userStats,
  globalStats,
};
