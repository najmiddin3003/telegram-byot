'use strict';

const db = require('../db');
const T = require('../texts');
const config = require('../config');
const catalog = require('../catalog');
const provider = require('./provider');
const { orderModerationKb } = require('../keyboards');
const { escapeHtml, isValidLink, userLabel, notifyAdmins } = require('../utils');

/** Buyurtma yarata olmaslik sabablari */
class OrderError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Buyurtmani yaratadi: tekshiruvlar → balansdan yechish → provayder → bazaga yozish.
 * Bot handleri ham, API ham shu funksiyadan foydalanadi.
 */
async function placeOrder({ telegram, userId, serviceId, link, quantity, source = 'bot' }) {
  const service = catalog.getService(serviceId);
  if (!service) throw new OrderError('service', 'Xizmat topilmadi');

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < service.min || qty > service.max) {
    throw new OrderError('quantity', `Miqdor ${service.min} – ${service.max} oralig'ida bo'lishi kerak`);
  }

  if (!isValidLink(link)) throw new OrderError('link', "Havola noto'g'ri");

  const user = await db.getUser(userId);
  if (!user) throw new OrderError('user', 'Foydalanuvchi topilmadi');

  // Bepul xizmatlar uchun kunlik limit
  if (service.free) {
    const used = await db.countFreeOrdersToday(userId);
    if (used >= config.freeDailyLimit) {
      throw new OrderError('free_limit', 'Bepul xizmat limiti tugadi');
    }
  }

  const price = catalog.calcPrice(service, qty);
  if (!service.free && Number(user.balance) < price) {
    const err = new OrderError('balance', "Mablag' yetarli emas");
    err.need = price;
    err.have = Number(user.balance);
    throw err;
  }

  if (price > 0) await db.addBalance(user.id, -price);

  // Provayderga uzatish (ulangan bo'lsa)
  let providerOrderId = null;
  let status = 'pending';
  if (provider.enabled) {
    try {
      providerOrderId = await provider.createOrder({ apiId: service.apiId, link, quantity: qty });
      status = 'processing';
    } catch (e) {
      console.error('[provider] buyurtma yuborilmadi:', e.message);
    }
  }

  const order = await db.createOrder({
    user_id: user.id,
    service_id: service.id,
    service_name: `${service.categoryTitle} — ${service.name}`,
    link,
    quantity: qty,
    price,
    status,
    provider_order_id: providerOrderId,
    is_free: Boolean(service.free),
    source,
  });

  if (telegram) {
    notifyAdmins(
      telegram,
      `🛒 <b>Yangi buyurtma #${order.id}</b>${source === 'api' ? ' <i>(API)</i>' : ''}\n\n` +
        `👤 ${userLabel(user)}\n` +
        `📦 ${escapeHtml(order.service_name)}\n` +
        `🔗 ${escapeHtml(order.link)}\n` +
        `🔢 ${T.num(order.quantity)} ta\n` +
        `💵 ${order.price ? T.money(order.price) : 'BEPUL 🎉'}\n` +
        (providerOrderId ? `🤖 Provayder ID: <code>${providerOrderId}</code>` : "⚙️ Qo'lda bajarilishi kerak"),
      { disable_web_page_preview: true, ...orderModerationKb(order.id) }
    ).catch(() => {});
  }

  return { order, service };
}

module.exports = { placeOrder, OrderError };
