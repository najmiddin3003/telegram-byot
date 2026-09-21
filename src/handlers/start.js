'use strict';

const db = require('../db');
const T = require('../texts');
const config = require('../config');
const { mainMenu } = require('../keyboards');
const { escapeHtml, userLabel, notifyAdmins } = require('../utils');

function register(bot) {
  bot.start(async (ctx) => {
    ctx.resetSession();

    const payload = ctx.startPayload || '';
    const isNew = !ctx.state.user;

    let refBy = null;
    const m = payload.match(/^(?:ref[_-]?)?(\d{5,})$/);
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
