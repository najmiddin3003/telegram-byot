'use strict';

const crypto = require('crypto');
const db = require('../db');
const T = require('../texts');
const { apiKb } = require('../keyboards');

function newKey() {
  return crypto.randomBytes(16).toString('hex');
}

function register(bot) {
  // 5-rasm: "🔐 Hamkorlik tizimi" = API kirish
  bot.hears(T.BTN.PARTNER, async (ctx) => {
    ctx.resetSession();
    const user = await db.getUser(ctx.from.id);
    await ctx.reply(T.api(user?.api_key), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...apiKb(Boolean(user?.api_key)),
    });
  });

  // API kalit yaratish / yangilash
  bot.action('api:new', async (ctx) => {
    const user = await db.getUser(ctx.from.id);
    if (!user) return ctx.answerCbQuery('/start bosing', { show_alert: true });

    const key = newKey();
    await db.updateUser(user.id, { api_key: key });
    await ctx.answerCbQuery(T.apiCreated.replace(/<\/?b>/g, ''), { show_alert: true });

    await ctx
      .editMessageText(T.api(key), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...apiKb(true),
      })
      .catch(() =>
        ctx.reply(T.api(key), { parse_mode: 'HTML', disable_web_page_preview: true, ...apiKb(true) })
      );
  });

  bot.action('api:info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(T.apiInfo, { parse_mode: 'HTML', disable_web_page_preview: true });
  });

  bot.action('api:docs', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(T.apiDocs, { parse_mode: 'HTML', disable_web_page_preview: true });
  });
}

module.exports = { register };
