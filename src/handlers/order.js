'use strict';

const db = require('../db');
const T = require('../texts');
const config = require('../config');
const catalog = require('../catalog');
const { placeOrder, OrderError } = require('../services/orderService');
const paymentService = require('../services/paymentService');
const { step } = require('../steps');
const {
  mainMenu,
  categoriesKb,
  servicesKb,
  askLinkKb,
  askQtyKb,
  confirmOrderKb,
  notEnoughBalanceKb,
  directPayCancelKb,
} = require('../keyboards');
const { isValidLink, escapeHtml } = require('../utils');
const ui = require('../ui');

function register(bot) {
  // 2-rasm: ijtimoiy tarmoqlar ro'yxati.
  // fromCallback=false — reply-keyboard tugmasidan (yangi xabar, eskisi o'chiriladi).
  // fromCallback=true  — inline tugmadan (xuddi shu xabar tahrirlanadi).
  const showCategories = async (ctx, fromCallback = false) => {
    const opts = { parse_mode: 'HTML', ...categoriesKb(catalog.categories) };
    if (fromCallback) {
      ctx.resetSession();
      await ui.edit(ctx, T.chooseCategory, opts);
    } else {
      await ui.resetAndSend(ctx, T.chooseCategory, opts);
    }
  };

  bot.hears(T.BTN.ORDER, (ctx) => showCategories(ctx, false));
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
        await ui.edit(ctx, T.chooseService(category), { parse_mode: 'HTML', ...servicesKb(category) });
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
    await ui.edit(ctx, T.chooseService(cat), { parse_mode: 'HTML', ...servicesKb(cat) });
  });

  // Xizmat tanlandi → havola so'raladi (bitta xabar ichida — yangi xabar qo'shilmaydi)
  bot.action(/^srv:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const service = catalog.getService(ctx.match[1]);
    if (!service) return ctx.reply(T.error);

    // Bepul xizmat limitini oldindan tekshiramiz
    if (service.free) {
      const used = await db.countFreeOrdersToday(ctx.from.id);
      if (used >= config.freeDailyLimit) {
        return ui.resetAndSend(ctx, T.freeLimitReached(config.freeDailyLimit), {
          parse_mode: 'HTML',
          ...mainMenu,
        });
      }
    }

    ctx.session.step = 'order:link';
    ctx.session.order = { serviceId: service.id };

    await ui.edit(ctx, T.askLink(service), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...askLinkKb(service),
    });
  });

  // Havolani qabul qilish (matn) → miqdor so'raladi.
  // Eski so'rov xabari VA foydalanuvchi yuborgan havola xabari o'chiriladi.
  step('order:link', async (ctx, text) => {
    if (!isValidLink(text)) {
      await ctx.deleteMessage(ctx.message.message_id).catch(() => {});
      return ctx.reply(T.badLink);
    }

    const service = catalog.getService(ctx.session.order?.serviceId);
    if (!service) {
      return ui.resetAndSend(ctx, T.error, mainMenu);
    }

    ctx.session.order.link = text.trim();
    ctx.session.step = 'order:qty';

    await ui.sendClean(ctx, T.askQuantity(service), { parse_mode: 'HTML', ...askQtyKb });
  });

  // Miqdorni qabul qilish → tasdiqlash ekrani
  step('order:qty', async (ctx, text) => {
    const service = catalog.getService(ctx.session.order?.serviceId);
    if (!service) {
      return ui.resetAndSend(ctx, T.error, mainMenu);
    }

    const qty = Number(String(text).replace(/[\s,]/g, ''));
    if (!Number.isInteger(qty) || qty < service.min || qty > service.max) {
      await ctx.deleteMessage(ctx.message.message_id).catch(() => {});
      return ctx.reply(T.badQuantity(service), { parse_mode: 'HTML' });
    }

    const user = await db.getUser(ctx.from.id);
    const price = catalog.calcPrice(service, qty);

    ctx.session.order.quantity = qty;
    ctx.session.order.price = price;
    ctx.session.step = 'order:confirm';

    await ui.sendClean(
      ctx,
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
      return ui.resetAndSend(ctx, T.error, mainMenu);
    }

    try {
      const { order } = await placeOrder({
        telegram: ctx.telegram,
        userId: ctx.from.id,
        serviceId: draft.serviceId,
        link: draft.link,
        quantity: draft.quantity,
        source: 'bot',
      });

      await ui.resetAndSend(ctx, T.orderCreated(order), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...mainMenu,
      });
    } catch (e) {
      if (e instanceof OrderError && e.code === 'balance') {
        const token = await paymentService.stashDraft({
          serviceId: draft.serviceId,
          link: draft.link,
          quantity: draft.quantity,
          price: e.need,
        });
        ctx.resetSession();
        await ui.edit(ctx, T.notEnoughBalance(e.need, e.have), {
          parse_mode: 'HTML',
          ...notEnoughBalanceKb(token),
        });
        return;
      }
      if (e instanceof OrderError && e.code === 'free_limit') {
        await ui.resetAndSend(ctx, T.freeLimitReached(config.freeDailyLimit), {
          parse_mode: 'HTML',
          ...mainMenu,
        });
        return;
      }

      console.error('[order] xatolik:', e);
      await ui.resetAndSend(ctx, T.error, mainMenu);
    }
  });

  bot.action('order:cancel', async (ctx) => {
    await ctx.answerCbQuery();
    await ui.resetAndSend(ctx, T.cancelled, mainMenu);
  });

  // "⏪ Orqaga": miqdor so'rashdan → havola so'rashga
  bot.action('order:back:link', async (ctx) => {
    await ctx.answerCbQuery();
    const service = catalog.getService(ctx.session.order?.serviceId);
    if (!service) return ui.resetAndSend(ctx, T.error, mainMenu);

    ctx.session.step = 'order:link';
    delete ctx.session.order.link;

    await ui.edit(ctx, T.askLink(service), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...askLinkKb(service),
    });
  });

  // "⏪ Orqaga": tasdiqlashdan → miqdor so'rashga
  bot.action('order:back:qty', async (ctx) => {
    await ctx.answerCbQuery();
    const service = catalog.getService(ctx.session.order?.serviceId);
    if (!service) return ui.resetAndSend(ctx, T.error, mainMenu);

    ctx.session.step = 'order:qty';
    delete ctx.session.order.quantity;
    delete ctx.session.order.price;

    await ui.edit(ctx, T.askQuantity(service), { parse_mode: 'HTML', ...askQtyKb });
  });

  // Balans yetarli bo'lmaganda: shu buyurtma uchun to'g'ridan-to'g'ri to'lov
  bot.action(/^order:directpay:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const token = ctx.match[1];
    const draft = await paymentService.popDraft(token);

    if (!draft) {
      return ui.resetAndSend(ctx, T.directPayDraftExpired, mainMenu);
    }

    const { uniqueAmount, ttlSec } = await paymentService.createPending({
      userId: ctx.from.id,
      baseAmount: draft.price,
      kind: 'direct_order',
      meta: {
        serviceId: draft.serviceId,
        link: draft.link,
        quantity: draft.quantity,
      },
    });

    ctx.resetSession();
    await ui.edit(ctx, T.directPayIntro(uniqueAmount, Math.round(ttlSec / 60)), {
      parse_mode: 'HTML',
      ...directPayCancelKb,
    });
  });
}

module.exports = { register };
