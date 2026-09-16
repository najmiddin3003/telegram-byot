'use strict';

const { Markup } = require('telegraf');
const { BTN } = require('./texts');
const config = require('./config');

// 1-rasm: asosiy menyu (2 ustunli reply keyboard)
const mainMenu = Markup.keyboard([
  [BTN.ORDER, BTN.ORDERS],
  [BTN.TOPUP, BTN.ACCOUNT],
  [BTN.REFERRAL, BTN.PARTNER],
  [BTN.SUPPORT, BTN.GUIDE],
])
  .resize()
  .persistent();

const cancelMenu = Markup.keyboard([[BTN.CANCEL]]).resize();

/**
 * 2-rasm: ijtimoiy tarmoqlar 2 ustunda,
 * "🎉 Bepul xizmatlar" pastda to'liq kenglikda.
 */
function categoriesKb(categories) {
  const paid = categories.filter((c) => !c.free);
  const free = categories.filter((c) => c.free);

  const rows = [];
  for (let i = 0; i < paid.length; i += 2) {
    rows.push(
      paid.slice(i, i + 2).map((c) => Markup.button.callback(`${c.emoji} ${c.title}`, `cat:${c.id}`))
    );
  }
  for (const c of free) {
    rows.push([Markup.button.callback(`${c.emoji} ${c.title}`, `cat:${c.id}`)]);
  }
  return Markup.inlineKeyboard(rows);
}

/** 3-rasm: xizmatlar bitta ustunda, pastda "⏪ Orqaga" va callback narxlar tugmasi */
function servicesKb(category) {
  const rows = category.services.map((s) => [Markup.button.callback(s.name, `srv:${s.id}`)]);
  rows.push([Markup.button.callback(BTN.BACK, 'order'), Markup.button.callback(BTN.PRICES, 'order:prices')]);
  return Markup.inlineKeyboard(rows);
}

/** Havola so'rash ekrani: "⏪ Orqaga" xizmatlar ro'yxatiga qaytaradi, "❌ Bekor qilish" buyurtmani to'xtatadi */
function askLinkKb(service) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(BTN.BACK, `cat:${service.categoryId}`),
      Markup.button.callback(BTN.CANCEL, 'order:cancel'),
    ],
  ]);
}

const confirmOrderKb = Markup.inlineKeyboard([
  [Markup.button.callback('✅ Tasdiqlash', 'order:confirm')],
  [Markup.button.callback(BTN.CANCEL, 'order:cancel')],
]);

/** 4-rasm: hisob ostidagi "💰 Hisob to'ldirish" tugmasi */
const topupInlineKb = Markup.inlineKeyboard([
  [Markup.button.callback(BTN.TOPUP, 'topup:start')],
]);

const topupPaidKb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'topup:cancel')]]);

/** 5-rasm: referal — "↗️ Ulashish" */
function referralKb(link) {
  const share = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
    "Arzon va tez SMM xizmatlari! Botga qo'shiling 👇"
  )}`;
  return Markup.inlineKeyboard([[Markup.button.url('↗️ Ulashish', share)]]);
}

/** 5-rasm: hamkorlik (API) tugmalari */
function apiKb(hasKey) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(hasKey ? '🔄 API kalitni yangilash' : '➕ API kalit yaratish', 'api:new')],
    [
      Markup.button.callback("📚 Ma'lumot", 'api:info'),
      Markup.button.callback("📄 Qo'llanma", 'api:docs'),
    ],
  ]);
}

function supportKb() {
  const rows = [[Markup.button.url('💬 Adminga yozish', `https://t.me/${config.supportUsername}`)]];
  if (config.channelUrl) rows.push([Markup.button.url('📢 Kanalimiz', config.channelUrl)]);
  return Markup.inlineKeyboard(rows);
}

function paymentModerationKb(paymentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', `pay:ok:${paymentId}`),
      Markup.button.callback('❌ Rad etish', `pay:no:${paymentId}`),
    ],
  ]);
}

function orderModerationKb(orderId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔄 Bajarilmoqda', `ord:run:${orderId}`),
      Markup.button.callback('✅ Bajarildi', `ord:done:${orderId}`),
    ],
    [Markup.button.callback('❌ Bekor + qaytarish', `ord:cancel:${orderId}`)],
  ]);
}

const adminMenu = Markup.inlineKeyboard([
  [Markup.button.callback('📊 Statistika', 'adm:stats')],
  [Markup.button.callback("💳 Kutilayotgan to'lovlar", 'adm:pending')],
  [Markup.button.callback('📢 Xabar yuborish (broadcast)', 'adm:cast')],
]);

module.exports = {
  mainMenu,
  cancelMenu,
  categoriesKb,
  servicesKb,
  askLinkKb,
  confirmOrderKb,
  topupInlineKb,
  topupPaidKb,
  referralKb,
  apiKb,
  supportKb,
  paymentModerationKb,
  orderModerationKb,
  adminMenu,
};
