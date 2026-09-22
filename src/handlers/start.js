'use strict';

const db = require('../db');
const T = require('../texts');
const config = require('../config');
const { mainMenu, forceSubKb } = require('../keyboards');
const { escapeHtml, userLabel, notifyAdmins } = require('../utils');
const { isSubscribed } = require('../services/subscription');

/** /start ning asosiy mantig'i: foydalanuvchini yaratadi/yangilaydi va menyuni ko'rsatadi */
async function finishStart(ctx, payload) {
  const isNew = !ctx.state.user;

  let refBy = null;
  const m = String(payload || '').match(/^(?:ref[_-]?)?(\d{5,})$/);
  if (m && Number(m[1]) !== ctx.from.id) refBy = Number(m[1]);

  const user = await db.upsertUser({
    id: ctx.from.id,
    username: ctx.from.username,
    first_name: ctx.from.first_name,
    ref_by: isNew ? refBy : null,
  });
  ctx.state.user = user;

  await ctx.reply(T.welcome(escapeHtml(ctx.from.first_name || 'do\'stim')), {
    parse_mode: 'HTML',
    ...mainMenu,
  });

  if (isNew) {
    await notifyAdmins(
      ctx.telegram,
      `🆕 <b>Yangi foydalanuvchi</b>\n\n${userLabel(user)}` +
        (user.ref_by ? `\n👥 Taklif qilgan: <code>${user.ref_by}</code>` : '')
    );

    // 5-rasm: "1 ta referal uchun N so'm beriladi" — bonus darhol beriladi
    if (user.ref_by && config.referralBonus > 0) {
      const referrer = await db.getUser(user.ref_by);
      if (referrer) {
        const updated = await db.addBalance(referrer.id, config.referralBonus);
        await db.addRefEarned(referrer.id, config.referralBonus);
        try {
          await ctx.telegram.sendMessage(
            referrer.id,
            T.refJoined(config.referralBonus, updated.balance),
            { parse_mode: 'HTML' }
          );
        } catch { /* referrer botni bloklagan bo'lishi mumkin */ }
      }
    }
  }
}

function register(bot) {
  bot.start(async (ctx) => {
    ctx.resetSession();

    if (!(await isSubscribed(ctx.telegram, ctx.from.id))) {
      // Keyinroq "✅ Obuna bo'ldim" bosilganda ref-payloadni yo'qotmaslik uchun saqlaymiz
      ctx.session.pendingStartPayload = ctx.startPayload || '';
      await ctx.reply(T.forceSubscribe, { parse_mode: 'HTML', ...forceSubKb() });
      return;
    }

    await finishStart(ctx, ctx.startPayload);
  });

  // "✅ Obuna bo'ldim" — har safar qayta tekshiradi, a'zo bo'lsagina davom etadi
  bot.action('checksub', async (ctx) => {
    if (!(await isSubscribed(ctx.telegram, ctx.from.id))) {
      await ctx.answerCbQuery(T.forceSubStillNot, { show_alert: true });
      return;
    }

    await ctx.answerCbQuery();
    const payload = ctx.session?.pendingStartPayload || '';
    ctx.resetSession();
    await ctx.deleteMessage().catch(() => {});
    await finishStart(ctx, payload);
  });

  // Menyuni qayta ko'rsatish
  bot.command('menu', async (ctx) => {
    ctx.resetSession();
    await ctx.reply(T.menu, mainMenu);
  });

  bot.action('menu', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.resetSession();
    await ctx.reply(T.menu, mainMenu);
  });

  bot.command('id', async (ctx) => {
    await ctx.reply(`🆔 Sizning ID: <code>${ctx.from.id}</code>`, { parse_mode: 'HTML' });
  });
}

module.exports = { register };
