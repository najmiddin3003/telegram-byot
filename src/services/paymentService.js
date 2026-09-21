'use strict';

const crypto = require('crypto');
const redis = require('../redis');
const config = require('../config');

/**
 * Unikal summa orqali to'lovni avtomatik aniqlash.
 *
 * Muammo: karta orqali qilingan o'tkazmalarda (Humo/Uzcard/Click hamyon)
 * kim qancha to'laganini avtomatik bilib bo'lmaydi — faqat summa ko'rinadi.
 * Shuning uchun foydalanuvchi so'ragan summaga (masalan 23 000) tasodifiy
 * 2 xonali "unikal" raqam qo'shiladi (masalan 23 034) va aynan shu summani
 * o'tkazishi so'raladi. Redis'da 15 daqiqa davomida
 *   pending:amount:23034 -> { userId, baseAmount: 23000, kind, meta }
 * saqlanadi. To'lov kelib tushganda (webhook yoki admin qo'lda) xuddi shu
 * summa bo'yicha qidiruv qilinadi va mos kelsa avtomatik tasdiqlanadi.
 * 15 daqiqadan keyin kalit o'zi Redis'dan o'chib ketadi (TTL).
 */

const PENDING_PREFIX = 'pending:amount:';
const DRAFT_PREFIX = 'draft:';
const DRAFT_TTL_SEC = 5 * 60;

function pendingKey(amount) {
  return `${PENDING_PREFIX}${Math.round(amount)}`;
}

/**
 * Bazaviy summaga tasodifiy 2 xonali suffiks qo'shib, Redis'da band
 * qilinmagan (hozircha kutilmayotgan) unikal summani topadi va shu
 * summaga to'lov ma'lumotlarini saqlaydi.
 *
 * @param {{ userId: number, baseAmount: number, kind: 'topup'|'direct_order', meta?: object }} data
 * @returns {Promise<{ uniqueAmount: number, ttlSec: number }>}
 */
async function createPending({ userId, baseAmount, kind, meta = {} }) {
  const base = Math.round(Number(baseAmount));
  const ttl = config.uniqueAmountTtlSec;
  const maxSuffix = Math.max(1, config.uniqueAmountSuffixMax);

  const payload = JSON.stringify({
    userId: Number(userId),
    baseAmount: base,
    kind,
    meta,
    createdAt: Date.now(),
  });

  // Bo'sh (hali band qilinmagan) unikal summani topguncha urinamiz.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = 1 + Math.floor(Math.random() * maxSuffix);
    const uniqueAmount = base + suffix;
    const key = pendingKey(uniqueAmount);
    // NX — faqat kalit mavjud bo'lmasa yozadi (band qilib qo'yish uchun)
    const ok = await redis.set(key, payload, 'EX', ttl, 'NX');
    if (ok === 'OK') {
      return { uniqueAmount, ttlSec: ttl };
    }
  }

  // Juda kam ehtimol, lekin barcha urinishlar band bo'lib chiqsa —
  // summani biroz kattalashtirib, oxirgi marta urinib ko'ramiz.
  const fallbackAmount = base + maxSuffix + Math.floor(Math.random() * 900) + 100;
  await redis.set(pendingKey(fallbackAmount), payload, 'EX', ttl);
  return { uniqueAmount: fallbackAmount, ttlSec: ttl };
}

/**
 * Kelib tushgan to'lov summasiga mos kutilayotgan yozuvni topadi va
 * uni Redis'dan o'chiradi (bir marta ishlatiladi). Topilmasa — null.
 *
 * @param {number} amount
 * @returns {Promise<{ userId: number, baseAmount: number, kind: string, meta: object } | null>}
 */
async function matchAndConsume(amount) {
  const key = pendingKey(amount);
  const raw = await redis.get(key);
  if (!raw) return null;

  const removed = await redis.del(key);
  if (!removed) return null; // parallel so'rov allaqachon iste'mol qilgan

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Foydalanuvchi bekor qilsa yoki muddati tugasa — qo'lda olib tashlash. */
async function cancelPending(amount) {
  await redis.del(pendingKey(amount));
}

/**
 * Buyurtma qoralamasini (service/link/quantity) qisqa token ostida
 * vaqtincha saqlaydi — inline tugma callback_data 64 baytdan oshmasligi
 * kerak bo'lgani uchun to'liq ma'lumotni Redis'da tutamiz.
 */
async function stashDraft(draft) {
  const token = crypto.randomBytes(4).toString('hex');
  await redis.set(`${DRAFT_PREFIX}${token}`, JSON.stringify(draft), 'EX', DRAFT_TTL_SEC);
  return token;
}

async function popDraft(token) {
  const key = `${DRAFT_PREFIX}${token}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  await redis.del(key);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Bank/to'lov tizimi SMS yoki notification matnidan summani ajratib oladi.
 * Masalan: "...kartangizga 23 034.00 so'm kirim qilindi" -> 23034,
 * "Click: 23,034 UZS to'lov qabul qilindi" -> 23034,
 * "UZS 23 034 miqdorida to'lov" -> 23034.
 *
 * Humo/Uzcard bank SMS'lari, Click/Payme/Uzum kabi ilovalarning
 * notification matnlari bir-biridan farq qiladi (so'z tartibi, valyuta
 * belgisi joyi, "kirim"/"tushdi"/"qabul qilindi" kabi so'zlar), shuning
 * uchun bankka/ilovaga qarab qattiq shablon yozish o'rniga — universal
 * qoida ishlatiladi: matndagi raqam + valyuta belgisi (so'm/сум/сўм/UZS)
 * juftligini, ular qaysi tartibda kelishidan qat'i nazar, qidiradi.
 * SMS-forwarder ilovalar orqali kelgan xom matn shu funksiyaga beriladi.
 * Pul haqida bo'lmagan SMS (OTP, reklama va h.k.) uchun `null` qaytaradi.
 */
function extractAmountFromSms(text) {
  if (!text) return null;
  const str = String(text);

  const num = "[\\d][\\d\\s.,]{0,14}\\d|\\d"; // 23034 / 23 034 / 23,034.00 / 23.034,00
  const cur = "so[`'’‘]?m|со['’]?м|сум|сўм|uzs"; // so'm, сум, сўм, com, UZS

  // Raqam + valyuta ("23 034 so'm") YOKI valyuta + raqam ("UZS 23 034") —
  // ikkalasi ham uchraydi, shuning uchun bitta regexda ikkalasini qidiramiz.
  const re = new RegExp(`(${num})\\s*(?:${cur})|(?:${cur})\\s*[:\\-]?\\s*(${num})`, 'giu');

  // Matnda bir nechta summa bo'lishi mumkin (masalan tushum va qoldiq) —
  // birinchi uchragani odatda haqiqiy tranzaksiya summasi bo'ladi.
  const match = re.exec(str);
  if (!match) return null;

  const raw = match[1] || match[2];
  // Oxiridagi ".00"/tiyin qismini tashlab, qolgan ajratkichlarni tozalaymiz
  const cleaned = raw.replace(/[.,](\d{2})$/, '').replace(/[^\d]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

module.exports = {
  createPending,
  matchAndConsume,
  cancelPending,
  stashDraft,
  popDraft,
  extractAmountFromSms,
};
