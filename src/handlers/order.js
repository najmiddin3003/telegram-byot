'use strict';

const db = require('../db');
const T = require('../texts');
const config = require('../config');
const catalog = require('../catalog');
const { placeOrder, OrderError } = require('../services/orderService');
const { step } = require('../steps');
const {
  mainMenu,
  cancelMenu,
  categoriesKb,
  servicesKb,
  askLinkKb,
  confirmOrderKb,
  topupInlineKb,
} = require('../keyboards');
const { isValidLink, escapeHtml } = require('../utils');

function register(bot) {
  // 2-rasm: ijtimoiy tarmoqlar ro'yxati
  const showCategories = async (ctx, edit = false) => {
    ctx.resetSession();
    const opts = { parse_mode: 'HTML', ...categoriesKb(catalog.categories) };
    if (edit) {
      await ctx.editMessageText(T.chooseCategory, opts).catch(() => ctx.reply(T.chooseCategory, opts));
    } else {
      await ctx.reply(T.chooseCategory, opts);
    }
  };

  bot.hears(T.BTN.ORDER, (ctx) => showCategories(ctx));
  bot.action('order', async (ctx) => {
    await ctx.answerCbQuery();
    await showCategories(ctx, true);
  });

  bot.action('order:prices', async (ctx) => {
    await ctx.answerCbQuery();

    const service = catalog.getService(ctx.session.order?.serviceId);
    if (service?.categoryId) {
      const category = catalog.getCategory(service.categoryId);
      if (category) {
        const opts = { parse_mode: 'HTML', ...servicesKb(category) };
        await ctx.editMessageText(T.chooseService(category), opts).catch(() => ctx.reply(T.chooseService(category), opts));
        return;
      }
    }

    await showCategories(ctx, true);
  });

  // 3-rasm: tanlangan tarmoq xizmatlari
  bot.action(/^cat:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const cat = catalog.getCategory(ctx.match[1]);
    if (!cat) return ctx.reply(T.error);

    // Havola ekranidan "Orqaga" qaytilganda boshlangan buyurtma bekor bo'ladi
    ctx.resetSession();

    const opts = { parse_mode: 'HTML', ...servicesKb(cat) };
    await ctx
      .editMessageText(T.chooseService(cat), opts)
      .catch(() => ctx.reply(T.chooseService(cat), opts));
  });

  // Xizmat tanlandi → havola so'raladi
  bot.action(/^srv:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const service = catalog.getService(ctx.match[1]);
    if (!service) return ctx.reply(T.error);

    // Bepul xizmat limitini oldindan tekshiramiz
    if (service.free) {
      const used = await db.countFreeOrdersToday(ctx.from.id);
      if (used >= config.freeDailyLimit) {
        return ctx.reply(T.freeLimitReached(config.freeDailyLimit), { parse_mode: 'HTML', ...mainMenu });
      }
    }

    ctx.session.step = 'order:link';
    ctx.session.order = { serviceId: service.id };

    await ctx.editMessageReplyMarkup(undefined).catch(() => {});

    // "⏪ Orqaga" — xizmatlar ro'yxatiga, "❌ Bekor qilish" — asosiy menyuga
    await ctx.reply(T.askLink(service), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...askLinkKb(service),
    });
  });

  // Havolani qabul qilish
  step('order:link', async (ctx, text) => {
    if (!isValidLink(text)) return ctx.reply(T.badLink);

    const service = catalog.getService(ctx.session.order?.serviceId);
    if (!service) {
      ctx.resetSession();
      return ctx.reply(T.error, mainMenu);
    }

    ctx.session.order.link = text.trim();
    ctx.session.step = 'order:qty';
    await ctx.reply(T.askQuantity(service), { parse_mode: 'HTML', ...cancelMenu });
  });

  // Miqdorni qabul qilish → tasdiqlash ekrani
  step('order:qty', async (ctx, text) => {
    const service = catalog.getService(ctx.session.order?.serviceId);
    if (!service) {
      ctx.resetSession();
      return ctx.reply(T.error, mainMenu);
    }

    const qty = Number(String(text).replace(/[\s,]/g, ''));
    if (!Number.isInteger(qty) || qty < service.min || qty > service.max) {
      return ctx.reply(T.badQuantity(service), { parse_mode: 'HTML' });
    }

    const user = await db.getUser(ctx.from.id);
    const price = catalog.calcPrice(service, qty);

    ctx.session.order.quantity = qty;
    ctx.session.order.price = price;
    ctx.session.step = 'order:confirm';

    await ctx.reply(
      T.confirmOrder({
        serviceName: `${service.categoryTitle} — ${service.name}`,
        link: escapeHtml(ctx.session.order.link),
        quantity: qty,
        price,
        balance: user.balance,
      }),
      { parse_mode: 'HTML', disable_web_page_preview: true, ...confirmOrderKb }
    );
  });

  // Tasdiqlash
  bot.action('order:confirm', async (ctx) => {
    await ctx.answerCbQuery();
    const draft = ctx.session.order;
    if (!draft?.serviceId || !draft?.link || !draft?.quantity) {
      ctx.resetSession();
      return ctx.reply(T.error, mainMenu);
    }

    await ctx.editMessageReplyMarkup(undefined).catch(() => {});

    try {
      const { order } = await placeOrder({
        telegram: ctx.telegram,
        userId: ctx.from.id,
        serviceId: draft.serviceId,
        link: draft.link,
        quantity: draft.quantity,
        source: 'bot',
      });

      ctx.resetSession();
      await ctx.reply(T.orderCreated(order), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...mainMenu,
      });
    } catch (e) {
      ctx.resetSession();

      if (e instanceof OrderError && e.code === 'balance') {
        return ctx.reply(T.notEnoughBalance(e.need, e.have), { parse_mode: 'HTML', ...topupInlineKb });
      }
      if (e instanceof OrderError && e.code === 'free_limit') {
        return ctx.reply(T.freeLimitReached(config.freeDailyLimit), { parse_mode: 'HTML', ...mainMenu });
      }

      console.error('[order] xatolik:', e);
      await ctx.reply(T.error, mainMenu);
    }
  });

  bot.action('order:cancel', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.resetSession();
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    await ctx.reply(T.cancelled, mainMenu);
  });
}

module.exports = { register };
