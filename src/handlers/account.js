'use strict';

const db = require('../db');
const T = require('../texts');
const { topupInlineKb } = require('../keyboards');

function register(bot) {
  // 4-rasm: Mening hisobim
  bot.hears(T.BTN.ACCOUNT, async (ctx) => {
    ctx.resetSession();
    const user = await db.getUser(ctx.from.id);
    if (!user) return ctx.reply('/start bosing');

    const stats = await db.userStats(user.id);
    await ctx.reply(T.account(user, stats), { parse_mode: 'HTML', ...topupInlineKb });
  });

  bot.command('balans', async (ctx) => {
    const user = await db.getUser(ctx.from.id);
    if (user) {
      await ctx.reply(`💰 <b>Balansingiz:</b> ${T.money(user.balance)}`, {
        parse_mode: 'HTML',
        ...topupInlineKb,
      });
    }
  });
}

module.exports = { register };
