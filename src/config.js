'use strict';

require('dotenv').config();

function toList(value) {
  return String(value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const config = {
  // --- Telegram ---
  botToken: process.env.BOT_TOKEN || '',
  botUsername: process.env.BOT_USERNAME || '', // @siz emas, faqat nom: mening_botim
  adminIds: toList(process.env.ADMIN_IDS).map(Number).filter(Boolean),

  // --- Render / server ---
  port: toNumber(process.env.PORT, 3000),
  // Render bergan tashqi manzil, masalan: https://mening-botim.onrender.com
  publicUrl: (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, ''),
  webhookSecret: process.env.WEBHOOK_SECRET || 'tg-secret-path',

  // --- Ma'lumotlar bazasi ---
  databaseUrl: process.env.DATABASE_URL || '', // bo'sh bo'lsa JSON faylga yoziladi
  jsonDbPath: process.env.JSON_DB_PATH || './data/db.json',

  // --- Biznes sozlamalari ---
  currency: process.env.CURRENCY || "so'm",
  minTopup: toNumber(process.env.MIN_TOPUP, 5000),
  minOrderQuantity: toNumber(process.env.MIN_ORDER_QUANTITY, 100),

  // Referal: har bir taklif qilingan foydalanuvchi uchun qat'iy summa
  referralBonus: toNumber(process.env.REFERRAL_BONUS, 100),
  // Qo'shimcha: referal hisobini to'ldirganda ham % bonus (0 = o'chirilgan)
  referralPercent: toNumber(process.env.REFERRAL_PERCENT, 0),

  // Bepul xizmatlar: bir foydalanuvchi kuniga nechta bepul buyurtma bera oladi
  freeDailyLimit: toNumber(process.env.FREE_DAILY_LIMIT, 1),

  // To'lov rekvizitlari
  cardNumber: process.env.CARD_NUMBER || '8600 0000 0000 0000',
  cardHolder: process.env.CARD_HOLDER || 'F.I.O',

  supportUsername: (process.env.SUPPORT_USERNAME || 'admin').replace(/^@/, ''),
  channelUrl: process.env.CHANNEL_URL || '',

  // --- SMM provayder (ixtiyoriy) ---
  // Standart "SMM Panel API v2": POST {url} key=...&action=add&service=...&link=...&quantity=...
  smmApiUrl: process.env.SMM_API_URL || '',
  smmApiKey: process.env.SMM_API_KEY || '',

  // --- Hamkorlik (bizning API) ---
  // Bo'sh bo'lsa PUBLIC_URL asosida avtomatik yasaladi
  apiBaseUrl: (process.env.API_BASE_URL || '').replace(/\/+$/, ''),
  apiDocsUrl: process.env.API_DOCS_URL || '',
};

config.isAdmin = (id) => config.adminIds.includes(Number(id));

/** Hamkorlar uchun API manzili: https://domen/BotNomi/api/v2 */
config.apiUrl = () => {
  if (config.apiBaseUrl) return config.apiBaseUrl;
  if (!config.publicUrl) return 'https://—.onrender.com/api/v2';
  const name = config.botUsername ? `/${config.botUsername}` : '';
  return `${config.publicUrl}${name}/api/v2`;
};

module.exports = config;
