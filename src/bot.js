'use strict';

const { Telegraf } = require('telegraf');
const config = require('./config');
const db = require('./db');
const T = require('./texts');
const { sessionMiddleware } = require('./session');
const { getStep } = require('./steps');
const { mainMenu } = require('./keyboards');
const ui = require('./ui');
const paymentService = require('./services/paymentService');

const handlers = [
  require('./handlers/start'),
  require('./handlers/order'),
  require('./handlers/orders'),
  require('./handlers/balance'),
  require('./handlers/account'),
  require('./handlers/referral'),
  require('./handlers/api'),
  require('./handlers/support'),
  require('./handlers/guide'),
  require('./handlers/admin'),
];

/** Foydalanuvchini bazadan yuklab, ctx.state.user ga qo'yadi */
async function attachUser(ctx, next) {  if (!ctx.from || ctx.from.is_bot) return next();

  const text = ctx.message?.text;
  const isStart = typeof text === 'string' && text.startsWith('/start');

  let user = await db.getUser(ctx.from.id);
  if (!user && !isStart) {
    // /start bosmasdan kirib qolganlar uchun
    user = await db.upsertUser({
      id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
    });
  }

  if (user?.is_blocked) {
    if (ctx.updateType === 'message') {
      await ctx.reply("🚫 Siz bloklangansiz. Savollar uchun: @" + config.supportUsername).catch(() => {});
    }
    return;
  }

  ctx.state.user = user || null;
  return next();
}

/** Foydalanuvchi "Bekor qilish"/"Orqaga" bossa, band qilingan unikal summani ham bo'shatamiz */
async function cancelPendingIfAny(ctx) {
  const amount = ctx.session?.topupUniqueAmount;
  if (amount) {
    await paymentService.cancelPending(amount).catch(() => {});
  }
}

function createBot() {
  if (!config.botToken) {
    throw new Error('BOT_TOKEN topilmadi! .env faylini to\'ldiring.');
  }

  const bot = new Telegraf(config.botToken, { handlerTimeout: 60_000 });

  bot.use(sessionMiddleware());
  bot.use(attachUser);

  // "Bekor qilish" tugmasi — har qanday qadamdan chiqadi
  bot.hears(T.BTN.CANCEL, async (ctx) => {
    await cancelPendingIfAny(ctx);
    await ui.resetAndSend(ctx, T.cancelled, mainMenu);
  });
  bot.hears(T.BTN.BACK, async (ctx) => {
    await cancelPendingIfAny(ctx);
    await ui.resetAndSend(ctx, T.menu, mainMenu);
  });

  for (const h of handlers) h.register(bot);

  // Qolgan barcha matnlar: joriy qadamga yo'naltirish
  bot.on('text', async (ctx) => {
    const stepName = ctx.session.step;
    const fn = stepName ? getStep(stepName) : null;

    if (fn) return fn(ctx, ctx.message.text);

    await ctx.reply(T.unknown, mainMenu);
  });

  // Boshqa turdagi xabarlar (stiker, video, ...)
  bot.on('message', async (ctx) => {
    if (ctx.session.step === 'topup:receipt') {
      return ctx.reply(T.needReceipt, { parse_mode: 'HTML' });
    }
    await ctx.reply(T.unknown, mainMenu);
  });

  bot.catch((err, ctx) => {
    console.error(`[bot] xatolik (${ctx.updateType}):`, err);
    ctx.reply?.(T.error, mainMenu).catch(() => {});
  });

  return bot;
}

async function setCommands(bot) {
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Botni ishga tushirish' },
    { command: 'menu', description: 'Asosiy menyu' },
    { command: 'balans', description: 'Balansim' },
    { command: 'help', description: "Qo'llanma" },
    { command: 'id', description: 'Mening ID raqamim' },
  ]);
}

module.exports = { createBot, setCommands };
