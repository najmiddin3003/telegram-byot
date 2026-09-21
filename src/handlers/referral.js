'use strict';

const db = require('../db');
const T = require('../texts');
const config = require('../config');
const { referralKb } = require('../keyboards');

/** 5-rasmdagi format: https://t.me/BotNomi?start=<user_id> */
function buildLink(ctx) {
  const username = ctx.botInfo?.username || config.botUsername;
  return `https://t.me/${username}?start=${ctx.from.id}`;
}

function register(bot) {
  bot.hears(T.BTN.REFERRAL, async (ctx) => {
    ctx.resetSession();

    const link = buildLink(ctx);
    const count = await db.countReferrals(ctx.from.id);

    await ctx.reply(T.referral(link, count), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...referralKb(link),
    });
  });
}

module.exports = { register, buildLink };
