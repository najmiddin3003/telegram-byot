'use strict';

const db = require('../db');
const T = require('../texts');
const { mainMenu } = require('../keyboards');
const { statusLabel, formatDate, escapeHtml } = require('../utils');

function register(bot) {
  bot.hears(T.BTN.ORDERS, async (ctx) => {
    ctx.resetSession();
    const orders = await db.getOrders(ctx.from.id, 10);

    if (!orders.length) {
      return ctx.reply(T.noOrders, mainMenu);
    }

    const lines = orders.map(
      (o) =>
        `<b>#${o.id}</b> — ${statusLabel(o.status)}\n` +
        `📦 ${escapeHtml(o.service_name)}\n` +
        `🔢 ${T.num(o.quantity)} ta · 💵 ${T.money(o.price)}\n` +
        `🔗 ${escapeHtml(o.link)}\n` +
        `🕒 ${formatDate(o.created_at)}`
    );

    await ctx.reply(`${T.ordersHeader}\n${lines.join('\n\n')}`, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...mainMenu,
    });
  });
}

module.exports = { register };
