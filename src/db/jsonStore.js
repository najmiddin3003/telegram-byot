'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Oddiy JSON fayl asosidagi ombor.
 * Lokal test uchun qulay. Render'da (DATABASE_URL yo'q bo'lsa) fayl
 * qayta deploy paytida o'chib ketadi — shuning uchun productionda PostgreSQL ishlating.
 */

const file = path.resolve(process.cwd(), config.jsonDbPath);

let data = {
  users: {},
  orders: [],
  payments: [],
  seq: { order: 0, payment: 0 },
};

let saveTimer = null;

function load() {
  try {
    if (fs.existsSync(file)) {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.users ||= {};
      data.orders ||= [];
      data.payments ||= [];
      data.seq ||= { order: 0, payment: 0 };
    }
  } catch (e) {
    console.error('[db] JSON o\'qishda xatolik, bo\'sh baza bilan boshlandi:', e.message);
  }
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[db] JSON saqlashda xatolik:', e.message);
    }
  }, 200);
}

async function init() {
  load();
  console.log(`[db] JSON ombor: ${file}`);
}

async function getUser(id) {
  return data.users[String(id)] || null;
}

async function getUserByApiKey(key) {
  if (!key) return null;
  return Object.values(data.users).find((u) => u.api_key === key) || null;
}

async function upsertUser({ id, username, first_name, ref_by }) {
  const key = String(id);
  if (!data.users[key]) {
    data.users[key] = {
      id: Number(id),
      username: username || null,
      first_name: first_name || null,
      balance: 0,
      ref_by: ref_by ? Number(ref_by) : null,
      ref_earned: 0,
      api_key: null,
      is_partner: false,
      is_blocked: false,
      created_at: new Date().toISOString(),
    };
  } else {
    const u = data.users[key];
    u.username = username || u.username;
    u.first_name = first_name || u.first_name;
  }
  save();
  return data.users[key];
}

async function updateUser(id, patch) {
  const u = data.users[String(id)];
  if (!u) return null;
  Object.assign(u, patch);
  save();
  return u;
}

async function addBalance(id, amount) {
  const u = data.users[String(id)];
  if (!u) return null;
  u.balance = Math.round((Number(u.balance) || 0) + Number(amount));
  save();
  return u;
}

async function addRefEarned(id, amount) {
  const u = data.users[String(id)];
  if (!u) return null;
  u.ref_earned = Math.round((Number(u.ref_earned) || 0) + Number(amount));
  save();
  return u;
}

async function countReferrals(id) {
  return Object.values(data.users).filter((u) => Number(u.ref_by) === Number(id)).length;
}

async function allUserIds() {
  return Object.values(data.users)
    .filter((u) => !u.is_blocked)
    .map((u) => u.id);
}

async function createOrder(o) {
  const order = {
    id: ++data.seq.order,
    user_id: Number(o.user_id),
    service_id: o.service_id,
    service_name: o.service_name,
    link: o.link,
    quantity: Number(o.quantity),
    price: Number(o.price),
    status: o.status || 'pending',
    provider_order_id: o.provider_order_id || null,
    is_free: Boolean(o.is_free),
    source: o.source || 'bot',
    created_at: new Date().toISOString(),
  };
  data.orders.push(order);
  save();
  return order;
}

/** Bugun berilgan bepul buyurtmalar soni */
async function countFreeOrdersToday(userId) {
  const today = new Date().toISOString().slice(0, 10);
  return data.orders.filter(
    (o) =>
      Number(o.user_id) === Number(userId) &&
      o.is_free &&
      o.status !== 'cancelled' &&
      String(o.created_at).slice(0, 10) === today
  ).length;
}

async function getOrders(userId, limit = 10) {
  return data.orders
    .filter((o) => Number(o.user_id) === Number(userId))
    .sort((a, b) => b.id - a.id)
    .slice(0, limit);
}

async function getOrder(id) {
  return data.orders.find((o) => o.id === Number(id)) || null;
}

async function updateOrder(id, patch) {
  const o = await getOrder(id);
  if (!o) return null;
  Object.assign(o, patch);
  save();
  return o;
}

async function createPayment(p) {
  const payment = {
    id: ++data.seq.payment,
    user_id: Number(p.user_id),
    amount: Number(p.amount),
    receipt_file_id: p.receipt_file_id || null,
    status: p.status || 'pending',
    created_at: new Date().toISOString(),
  };
  data.payments.push(payment);
  save();
  return payment;
}

async function getPayment(id) {
  return data.payments.find((p) => p.id === Number(id)) || null;
}

async function updatePayment(id, patch) {
  const p = await getPayment(id);
  if (!p) return null;
  Object.assign(p, patch);
  save();
  return p;
}

async function pendingPayments(limit = 20) {
  return data.payments.filter((p) => p.status === 'pending').slice(0, limit);
}

async function userStats(userId) {
  const orders = data.orders.filter((o) => Number(o.user_id) === Number(userId));
  return {
    orders: orders.length,
    spent: orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.price), 0),
    deposited: data.payments
      .filter((p) => Number(p.user_id) === Number(userId) && p.status === 'approved')
      .reduce((s, p) => s + Number(p.amount), 0),
    referrals: await countReferrals(userId),
  };
}

async function globalStats() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    users: Object.keys(data.users).length,
    newToday: Object.values(data.users).filter((u) => String(u.created_at).slice(0, 10) === today).length,
    orders: data.orders.length,
    revenue: data.orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.price), 0),
    topups: data.payments
      .filter((p) => p.status === 'approved')
      .reduce((s, p) => s + Number(p.amount), 0),
    pending: data.payments.filter((p) => p.status === 'pending').length,
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
