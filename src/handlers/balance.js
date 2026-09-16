'use strict';

const db = require('../db');
const T = require('../texts');
const config = require('../config');
const { step } = require('../steps');
const { mainMenu, cancelMenu, topupPaidKb, paymentModerationKb } = require('../keyboards');
const { userLabel, notifyAdminsPhoto } = require('../utils');

function register(bot) {
  // 1-qadam: summani so'rash
  const startTopup = async (ctx) => {
    ctx.resetSession();
    ctx.session.step = 'topup:amount';
    await ctx.reply(T.topupIntro, { parse_mode: 'HTML', ...cancelMenu });
  };

  bot.hears(T.BTN.TOPUP, startTopup);

  // 4-rasmdagi "💰 Hisob to'ldirish" inline tugmasi
  bot.action('topup:start', async (ctx) => {
    await ctx.answerCbQuery();
    await startTopup(ctx);
  });

  // 2-qadam: summani qabul qilish → rekvizitlarni ko'rsatish
  step('topup:amount', async (ctx, text) => {
    const amount = Number(String(text).replace(/[\s,]/g, ''));
    if (!Number.isFinite(amount) || amount < config.minTopup) {
      return ctx.reply(T.badAmount);
    }

    ctx.session.topupAmount = Math.round(amount);
    ctx.session.step = 'topup:receipt';

    await ctx.reply(T.topupInstructions(ctx.session.topupAmount), {
      parse_mode: 'HTML',
      ...topupPaidKb,
    });
  });

  // Chek kutilayotganda matn kelsa
  step('topup:receipt', async (ctx) => {
    await ctx.reply(T.needReceipt, { parse_mode: 'HTML' });
  });

  // 3-qadam: chek rasmini qabul qilish
  bot.on('photo', async (ctx, next) => {
    if (ctx.session.step !== 'topup:receipt') return next();

    const amount = Number(ctx.session.topupAmount);
    if (!amount) {
      ctx.resetSession();
      return ctx.reply(T.error, mainMenu);
    }

    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;

    const payment = await db.createPayment({
      user_id: ctx.from.id,
      amount,
      receipt_file_id: fileId,
      status: 'pending',
    });

    ctx.resetSession();
    await ctx.reply(T.receiptSent(payment.id), { parse_mode: 'HTML', ...mainMenu });

    const user = await db.getUser(ctx.from.id);
    await notifyAdminsPhoto(
      ctx.telegram,
      fileId,
      `💳 <b>Yangi to'lov so'rovi #${payment.id}</b>\n\n` +
        `👤 ${userLabel(user)}\n` +
        `💵 Summa: <b>${T.money(amount)}</b>\n` +
        `💰 Joriy balans: ${T.money(user.balance)}`,
      paymentModerationKb(payment.id)
    );
  });

  bot.action('topup:cancel', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.resetSession();
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    await ctx.reply(T.cancelled, mainMenu);
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
