'use strict';

const db = require('../db');
const T = require('../texts');
const { placeOrder } = require('./orderService');

/**
 * Redis'dan topilgan pending to'lov yozuvini haqiqiy tasdiqlashga
 * aylantiradi: balansni to'ldiradi yoki to'g'ridan-to'g'ri buyurtma
 * yaratadi, so'ng foydalanuvchiga xabar beradi.
 *
 * Ham /webhook/payment (tashqi tizim), ham admin qo'lda tasdiqlash
 * buyrug'i shu funksiyadan foydalanadi — mantiq bitta joyda.
 *
 * @param {import('telegraf').Telegram} telegram
 * @param {{ userId: number, baseAmount: number, kind: string, meta: object }} payload
 */
async function confirmMatchedPayment(telegram, payload) {
  const { userId, baseAmount, kind, meta } = payload;

  if (kind === 'direct_order') {
    // 1) To'lovni vaqtincha balansga qo'shamiz, so'ng aynan shu summaga
    //    buyurtma joylaymiz — natijada balans o'zgarmaydi, faqat
    //    buyurtma avtomatik yaratiladi.
    await db.addBalance(userId, baseAmount);

    try {
      const { order } = await placeOrder({
        telegram,
        userId,
        serviceId: meta.serviceId,
        link: meta.link,
        quantity: meta.quantity,
        source: 'bot',
      });

      await notify(telegram, userId, T.directPayOrderCreated(order));
      return { kind, order };
    } catch (e) {
      console.error('[paymentConfirm] direct_order xatolik:', e.message);
      // Buyurtma yaratilmadi — mablag' balansda qoladi, foydalanuvchini xabardor qilamiz.
      await notify(telegram, userId, T.directPayOrderFailed(baseAmount));
      return { kind, error: e.message };
    }
  }

  // kind === 'topup' (standart)
  await db.createPayment({
    user_id: userId,
    amount: baseAmount,
    receipt_file_id: null,
    status: 'approved',
  });
  const user = await db.addBalance(userId, baseAmount);
  await notify(telegram, userId, T.topupApprovedAuto(baseAmount, user.balance));
  return { kind, balance: user.balance };
}

async function notify(telegram, userId, text) {
  try {
    await telegram.sendMessage(userId, text, { parse_mode: 'HTML' });
  } catch (e) {
    console.error(`[paymentConfirm] notify ${userId}:`, e.message);
  }
}

module.exports = { confirmMatchedPayment };
