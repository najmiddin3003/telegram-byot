'use strict';

const T = require('../texts');
const { mainMenu, supportKb } = require('../keyboards');

function register(bot) {
  bot.hears(T.BTN.GUIDE, async (ctx) => {
    ctx.resetSession();
    await ctx.reply(T.guide, { parse_mode: 'HTML', ...mainMenu });
    await ctx.reply('Qo\'shimcha savollar bo\'lsa 👇', supportKb());
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(T.guide, { parse_mode: 'HTML', ...mainMenu });
  });
}

module.exports = { register };
