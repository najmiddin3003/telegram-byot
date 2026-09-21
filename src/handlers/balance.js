'use strict';

const db = require('../db');
const T = require('../texts');
const config = require('../config');
const { step } = require('../steps');
const { mainMenu, topupIntroKb, topupPaidKb, paymentModerationKb } = require('../keyboards');
const { userLabel, notifyAdminsPhoto } = require('../utils');
const paymentService = require('../services/paymentService');
const ui = require('../ui');

function register(bot) {
  // 1-qadam: summani so'rash.
  // fromCallback=false — reply-keyboard tugmasidan (eski xabar o'chirilib, yangisi yuboriladi).
  // fromCallback=true  — inline tugmadan (xuddi shu xabar tahrirlanadi).
  const startTopup = async (ctx, fromCallback = false) => {
    const opts = { parse_mode: 'HTML', ...topupIntroKb };
    if (fromCallback) {
      ctx.resetSession();
      ctx.session.step = 'topup:amount';
      await ui.edit(ctx, T.topupIntro, opts);
    } else {
      await ui.resetAndSend(ctx, T.topupIntro, opts);
      ctx.session.step = 'topup:amount'; // resetAndSend ichida resetSession chaqirilgani uchun qayta qo'yamiz
    }
  };

  bot.hears(T.BTN.TOPUP, (ctx) => startTopup(ctx, false));

  // 4-rasmdagi "💰 Hisob to'ldirish" inline tugmasi
  bot.action('topup:start', async (ctx) => {
    await ctx.answerCbQuery();
    await startTopup(ctx, true);
  });

  // 2-qadam: summani qabul qilish → unikal summa yaratish → rekvizitlarni ko'rsatish
  step('topup:amount', async (ctx, text) => {
    const amount = Number(String(text).replace(/[\s,]/g, ''));
    if (!Number.isFinite(amount) || amount < config.minTopup) {
      await ctx.deleteMessage(ctx.message.message_id).catch(() => {});
      return ctx.reply(T.badAmount);
    }

    const base = Math.round(amount);
    const { uniqueAmount, ttlSec } = await paymentService.createPending({
      userId: ctx.from.id,
      baseAmount: base,
      kind: 'topup',
    });

    // Chek rasmi yuborilsa ham base summani (unikal emas) hisobga qo'shamiz
    ctx.session.topupAmount = base;
    ctx.session.topupUniqueAmount = uniqueAmount;
    ctx.session.step = 'topup:receipt';

    await ui.sendClean(ctx, T.topupInstructions(uniqueAmount, Math.round(ttlSec / 60)), {
      parse_mode: 'HTML',
      ...topupPaidKb,
    });
  });

  // Chek kutilayotganda matn kelsa
  step('topup:receipt', async (ctx) => {
    await ctx.deleteMessage(ctx.message.message_id).catch(() => {});
    await ctx.reply(T.needReceipt, { parse_mode: 'HTML' });
  });

  // "⏪ Orqaga": rekvizit ekranidan → summani qayta kiritishga
  bot.action('topup:back:amount', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.session.topupUniqueAmount) {
      await paymentService.cancelPending(ctx.session.topupUniqueAmount).catch(() => {});
    }
    ctx.session.step = 'topup:amount';
    delete ctx.session.topupAmount;
    delete ctx.session.topupUniqueAmount;

    await ui.edit(ctx, T.topupIntro, { parse_mode: 'HTML', ...topupIntroKb });
  });

  // 3-qadam: chek rasmini qabul qilish
  bot.on('photo', async (ctx, next) => {
    if (ctx.session.step !== 'topup:receipt') return next();

    const amount = Number(ctx.session.topupAmount);
    if (!amount) {
      return ui.resetAndSend(ctx, T.error, mainMenu);
    }

    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;

    const payment = await db.createPayment({
      user_id: ctx.from.id,
      amount,
      receipt_file_id: fileId,
      status: 'pending',
    });

    const user = await db.getUser(ctx.from.id);
    // Rasmni o'chirishdan oldin admin kanaliga forward qilamiz (file_id saqlanib qoladi)
    await notifyAdminsPhoto(
      ctx.telegram,
      fileId,
      `💳 <b>Yangi to'lov so'rovi #${payment.id}</b>\n\n` +
        `👤 ${userLabel(user)}\n` +
        `💵 Summa: <b>${T.money(amount)}</b>\n` +
        `💰 Joriy balans: ${T.money(user.balance)}`,
      paymentModerationKb(payment.id)
    );

    await ui.resetAndSend(ctx, T.receiptSent(payment.id), { parse_mode: 'HTML', ...mainMenu });
  });

  bot.action('topup:cancel', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.session.topupUniqueAmount) {
      await paymentService.cancelPending(ctx.session.topupUniqueAmount).catch(() => {});
    }
    await ui.resetAndSend(ctx, T.cancelled, mainMenu);
  });

  // --- Admin: to'lovni tasdiqlash / rad etish ---
  bot.action(/^pay:(ok|no):(\d+)$/, async (ctx) => {
    if (!config.isAdmin(ctx.from.id)) return ctx.answerCbQuery('Ruxsat yo\'q', { show_alert: true });

    const approve = ctx.match[1] === 'ok';
    const paymentId = Number(ctx.match[2]);
    const payment = await db.getPayment(paymentId);

    if (!payment) return ctx.answerCbQuery('To\'lov topilmadi', { show_alert: true });
    if (payment.status !== 'pending') {
      return ctx.answerCbQuery(`Allaqachon: ${payment.status}`, { show_alert: true });
    }

    await db.updatePayment(paymentId, { status: approve ? 'approved' : 'rejected' });
    await ctx.answerCbQuery(approve ? '✅ Tasdiqlandi' : '❌ Rad etildi');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});

    if (!approve) {
      await notifyUser(ctx, payment.user_id, T.topupRejected(payment.amount));
      return;
    }

    const user = await db.addBalance(payment.user_id, payment.amount);
    await notifyUser(ctx, payment.user_id, T.topupApproved(payment.amount, user.balance));

    // Referal bonus
    if (user.ref_by && config.referralPercent > 0) {
      const bonus = Math.round((Number(payment.amount) * config.referralPercent) / 100);
      if (bonus > 0) {
        await db.addBalance(user.ref_by, bonus);
        await db.addRefEarned(user.ref_by, bonus);
        await notifyUser(ctx, user.ref_by, T.refBonus(bonus, userLabel(user)));
      }
    }
  });

  async function notifyUser(ctx, userId, text) {
    try {
      await ctx.telegram.sendMessage(userId, text, { parse_mode: 'HTML' });
    } catch (e) {
      console.error(`[notify] ${userId}:`, e.message);
    }
  }
}

module.exports = { register };
