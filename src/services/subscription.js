'use strict';

const config = require('../config');

const MEMBER_STATUSES = new Set(['creator', 'administrator', 'member']);

/**
 * Foydalanuvchi majburiy kanalga a'zoligini tekshiradi.
 * REQUIRED_CHANNEL sozlanmagan bo'lsa - tekshiruv o'chirilgan (true qaytadi).
 * Telegram API xato bersa (masalan, bot kanalda admin emas) - foydalanuvchini
 * bloklamaslik uchun true qaytariladi, xato konsolga yoziladi.
 */
async function isSubscribed(telegram, userId) {
  const chatId = config.requiredChannelChatId;
  if (!chatId) return true;

  try {
    const member = await telegram.getChatMember(chatId, userId);
    return MEMBER_STATUSES.has(member.status);
  } catch (err) {
    console.error('[subscription] a\'zolikni tekshirib bo\'lmadi:', err.description || err.message);
    return true;
  }
}

module.exports = { isSubscribed };
