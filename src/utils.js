'use strict';

const config = require('./config');

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isValidLink(text) {
  return /^https?:\/\/[^\s]+\.[^\s]{2,}/i.test(String(text || '').trim());
}

const STATUS = {
  pending: '⏳ Kutilmoqda',
  processing: '🔄 Bajarilmoqda',
  completed: '✅ Bajarildi',
  cancelled: '❌ Bekor qilindi',
};

function statusLabel(status) {
  return STATUS[status] || status;
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function userLabel(user) {
  const name = escapeHtml(user.first_name || 'Foydalanuvchi');
  return user.username ? `${name} (@${user.username})` : `${name} [<code>${user.id}</code>]`;
}

/** Barcha adminlarga xabar yuborish (bittasi bloklagan bo'lsa ham to'xtamaydi) */
async function notifyAdmins(telegram, text, extra = {}) {
  const results = [];
  for (const adminId of config.adminIds) {
    try {
      const msg = await telegram.sendMessage(adminId, text, { parse_mode: 'HTML', ...extra });
      results.push(msg);
    } catch (e) {
      console.error(`[admin] ${adminId} ga yuborib bo'lmadi:`, e.message);
    }
  }
  return results;
}

/** Adminlarga rasm (chek) yuborish */
async function notifyAdminsPhoto(telegram, fileId, caption, extra = {}) {
  for (const adminId of config.adminIds) {
    try {
      await telegram.sendPhoto(adminId, fileId, { caption, parse_mode: 'HTML', ...extra });
    } catch (e) {
      console.error(`[admin] ${adminId} ga rasm yuborib bo'lmadi:`, e.message);
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  escapeHtml,
  isValidLink,
  statusLabel,
  formatDate,
  userLabel,
  notifyAdmins,
  notifyAdminsPhoto,
  sleep,
};
