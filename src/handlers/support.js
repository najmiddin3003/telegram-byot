'use strict';

const db = require('../db');
const T = require('../texts');
const config = require('../config');
const { step } = require('../steps');
const { mainMenu, cancelMenu, supportKb } = require('../keyboards');
const { escapeHtml, userLabel, notifyAdmins } = require('../utils');

function register(bot) {
  bot.hears(T.BTN.SUPPORT, async (ctx) => {
    ctx.resetSession();
    ctx.session.step = 'support:text';
    await ctx.reply(T.supportIntro, { parse_mode: 'HTML', ...supportKb() });
    await ctx.reply('✍️ Xabaringizni yozing:', cancelMenu);
  });

  step('support:text', async (ctx, text) => {
    ctx.resetSession();
    await ctx.reply(T.supportSent, mainMenu);

    const user = await db.getUser(ctx.from.id);
    await notifyAdmins(
      ctx.telegram,
      `☎️ <b>Yangi murojaat</b>\n\n` +
        `👤 ${userLabel(user)}\n\n` +
        `${escapeHtml(text)}\n\n` +
        `Javob berish: <code>/javob ${ctx.from.id} matn</code>`
    );
  });

  // Admin: foydalanuvchiga javob yozish
  bot.command('javob', async (ctx) => {
    if (!config.isAdmin(ctx.from.id)) return;

    const parts = ctx.message.text.split(/\s+/);
    const id = Number(parts[1]);
    const text = parts.slice(2).join(' ');

    if (!id || !text) return ctx.reply('Foydalanish: /javob <user_id> <matn>');

    try {
      await ctx.telegram.sendMessage(id, T.supportReply(escapeHtml(text)), { parse_mode: 'HTML' });
      await ctx.reply('✅ Javob yuborildi.');
    } catch (e) {
      await ctx.reply(`❌ Yuborilmadi: ${e.message}`);
    }
  });
}

module.exports = { register };
