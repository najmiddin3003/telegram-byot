'use strict';

const config = require('./config');

// Asosiy menyu tugmalari (1-rasmdagi kabi)
const BTN = {
  ORDER: '📁 Buyurtma berish',
  ORDERS: '📊 Buyurtmalar',
  TOPUP: "💰 Hisob to'ldirish",
  ACCOUNT: '💱 Mening hisobim',
  REFERRAL: '🔘 Referal tizimi',
  PARTNER: '🔐 Hamkorlik tizimi',
  SUPPORT: '☎️ Murojaat',
  GUIDE: "📚 Qo'llanma",
  BACK: '⏪ Orqaga',
  CANCEL: '❌ Bekor qilish',
  PRICES: '📜 Narxlar',
};

const NBSP = ' '; // ajralmas probel — raqamlar bo'linib ketmasligi uchun

/** Pul: 0.00 so'm / 16 000.00 so'm (4-rasmdagi format) */
function money(amount) {
  const n = Number(amount) || 0;
  const [int, dec] = n.toFixed(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}.${dec} ${config.currency}`;
}

/** Butun son: 12 500 */
function num(value) {
  return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

const T = {
  BTN,
  money,
  num,

  welcome: (name) =>
    `👋 Assalomu alaykum, <b>${name}</b>!\n\n` +
    `Botimizga xush kelibsiz. Bu yerda ijtimoiy tarmoqlar uchun SMM xizmatlariga buyurtma berishingiz mumkin.\n\n` +
    `Quyidagi menyudan kerakli bo'limni tanlang 👇`,

  menu: "📋 Asosiy menyu. Kerakli bo'limni tanlang:",
  cancelled: '❌ Amal bekor qilindi.',
  unknown: '🤷‍♂️ Tushunmadim. Iltimos, menyudagi tugmalardan foydalaning.',
  error: "⚠️ Xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.",

  // --- Buyurtma (2- va 3-rasm) ---
  chooseCategory: '📁 <b>Quyidagi ijtimoiy tarmoqlardan birini tanlang.</b>',
  chooseService: () => "<b>Quyidagi bo'limlardan birini tanlang.</b>",

  askLink: (service) =>
    `${service.name}\n\n` +
    (service.free
      ? `🎉 Bu xizmat <b>bepul</b> (kuniga ${config.freeDailyLimit} marta)\n`
      : `💵 Narx: <b>${money(service.price)}</b> / 1000 ta\n`) +
    `🔢 Miqdor: ${num(service.min)} – ${num(service.max)} ta\n\n` +
    `🔗 Iltimos, havolani yuboring:\n<i>${service.hint}</i>`,

  badLink: "⚠️ Havola noto'g'ri. To'liq havola yuboring (masalan: https://instagram.com/username)",

  askQuantity: (service) =>
    `🔢 Miqdorni kiriting.\n\n` +
    `Eng kam: <b>${num(service.min)}</b> ta\n` +
    `Eng ko'p: <b>${num(service.max)}</b> ta`,

  badQuantity: (service) =>
    `⚠️ Miqdor faqat son bo'lishi va ${num(service.min)} – ${num(service.max)} oralig'ida bo'lishi kerak.`,

  confirmOrder: (o) =>
    `🧾 <b>Buyurtmani tasdiqlang</b>\n\n` +
    `📦 Xizmat: <b>${o.serviceName}</b>\n` +
    `🔗 Havola: ${o.link}\n` +
    `🔢 Miqdor: <b>${num(o.quantity)}</b> ta\n` +
    `💵 Narx: <b>${o.price ? money(o.price) : 'BEPUL 🎉'}</b>\n\n` +
    `💰 Balansingiz: ${money(o.balance)}`,

  notEnoughBalance: (need, have) =>
    `❌ Hisobingizda mablag' yetarli emas.\n\n` +
    `Kerak: <b>${money(need)}</b>\n` +
    `Bor: <b>${money(have)}</b>\n\n` +
    `Quyidagi tugma orqali hisobingizni to'ldiring 👇`,

  freeLimitReached: (limit) =>
    `⏳ Bepul xizmat limiti tugadi.\n\n` +
    `Kuniga <b>${limit}</b> marta bepul buyurtma berish mumkin.\n` +
    `Ertaga qayta urinib ko'ring yoki pullik xizmatlardan foydalaning.`,

  orderCreated: (o) =>
    `✅ <b>Buyurtma qabul qilindi!</b>\n\n` +
    `🆔 Buyurtma raqami: <code>#${o.id}</code>\n` +
    `📦 Xizmat: ${o.service_name}\n` +
    `🔗 Havola: ${o.link}\n` +
    `🔢 Miqdor: ${num(o.quantity)} ta\n` +
    `💵 Summa: ${o.price ? money(o.price) : 'BEPUL 🎉'}\n\n` +
    `Holatini "${BTN.ORDERS}" bo'limidan kuzatib boring.`,

  // --- Buyurtmalar ro'yxati ---
  noOrders: `📊 Sizda hali buyurtmalar yo'q.\n\nBirinchi buyurtmangizni "${BTN.ORDER}" orqali bering.`,
  ordersHeader: '📊 <b>Sizning buyurtmalaringiz</b>\n',

  // --- Hisob to'ldirish ---
  topupIntro:
    `💰 <b>Hisobni to'ldirish</b>\n\n` +
    `To'ldirmoqchi bo'lgan summani yuboring (faqat son).\n` +
    `Eng kam summa: <b>${money(config.minTopup)}</b>`,

  badAmount: `⚠️ Summa noto'g'ri. Eng kam summa: ${money(config.minTopup)}`,

  topupInstructions: (amount) =>
    `💳 <b>To'lov ma'lumotlari</b>\n\n` +
    `💵 Summa: <b>${money(amount)}</b>\n\n` +
    `💳 Karta raqami:\n<code>${config.cardNumber}</code>\n` +
    `👤 Karta egasi: <b>${config.cardHolder}</b>\n\n` +
    `⚠️ To'lovni amalga oshirgach, <b>chek rasmini (skrinshot)</b> shu yerga yuboring.\n` +
    `Admin tasdiqlagach, mablag' hisobingizga qo'shiladi.`,

  needReceipt: "📸 Iltimos, to'lov chekining <b>rasmini</b> yuboring.",

  receiptSent: (id) =>
    `✅ Chek qabul qilindi!\n\n` +
    `🆔 So'rov raqami: <code>#${id}</code>\n` +
    `Admin tekshirgach, xabar beramiz. Odatda bu 5–30 daqiqa vaqt oladi.`,

  topupApproved: (amount, balance) =>
    `✅ <b>Hisobingiz to'ldirildi!</b>\n\n` +
    `➕ Qo'shildi: <b>${money(amount)}</b>\n` +
    `💰 Joriy balans: <b>${money(balance)}</b>`,

  topupRejected: (amount) =>
    `❌ To'lov so'rovingiz rad etildi.\n\n` +
    `💵 Summa: ${money(amount)}\n` +
    `Savollar bo'lsa: @${config.supportUsername}`,

  // --- Mening hisobim (4-rasm) ---
  account: (u, stats) =>
    `👤 <b>Sizning ID raqamingiz:</b> <code>${u.id}</code>\n\n` +
    `💰 <b>Balansingiz:</b> ${money(u.balance)}\n` +
    `📊 <b>Buyurtmalaringiz:</b> ${num(stats.orders)} ta\n` +
    `🔘 <b>Referallaringiz:</b> ${num(stats.referrals)} ta\n` +
    `🏅 <b>Kiritgan pullaringiz:</b> ${money(stats.deposited)}`,

  // --- Referal (5-rasm) ---
  referral: (link, count) =>
    `🔗 <b>Sizning referal havolangiz:</b>\n` +
    `${link}\n\n` +
    `<b>1 ta referal uchun ${num(config.referralBonus)} ${config.currency} beriladi</b>\n\n` +
    `🔘 <b>Referallaringiz:</b> ${num(count)} ta`,

  refJoined: (bonus, balance) =>
    `🎉 <b>Yangi referal!</b>\n\n` +
    `Sizning havolangiz orqali yangi foydalanuvchi qo'shildi.\n` +
    `➕ Bonus: <b>${money(bonus)}</b>\n` +
    `💰 Balans: <b>${money(balance)}</b>`,

  refBonus: (amount, from) =>
    `🎁 <b>Referal bonus!</b>\n\n` +
    `${from} hisobini to'ldirgani uchun sizga <b>${money(amount)}</b> qo'shildi.`,

  // --- Hamkorlik = API tizimi (5-rasm) ---
  api: (key) =>
    `🔗 <b>API manzil:</b>\n` +
    `<code>${config.apiUrl()}</code>\n` +
    `🔑 <b>API kalitingiz:</b>\n` +
    `<code>${key || 'Yaratilmagan'}</code>`,

  apiCreated: '✅ Yangi API kalit yaratildi. Uni hech kimga bermang!',

  apiInfo:
    `📚 <b>API haqida ma'lumot</b>\n\n` +
    `API orqali o'z saytingiz yoki botingizdan to'g'ridan-to'g'ri buyurtma bera olasiz.\n\n` +
    `<b>Format:</b> SMM Panel API v2 (POST, form-data)\n` +
    `<b>Manzil:</b> <code>${config.apiUrl()}</code>\n\n` +
    `Barcha so'rovlarda <code>key</code> parametri majburiy.\n` +
    `Javob har doim JSON ko'rinishida qaytadi.\n\n` +
    `⚠️ Buyurtma bot balansingizdan yechiladi — API dan foydalanishdan oldin hisobingizni to'ldiring.`,

  apiDocs:
    `📄 <b>API qo'llanma</b>\n\n` +
    `<b>1) Xizmatlar ro'yxati</b>\n` +
    `<code>key=KALIT&amp;action=services</code>\n\n` +
    `<b>2) Balans</b>\n` +
    `<code>key=KALIT&amp;action=balance</code>\n` +
    `→ <code>{"balance":"12000.00","currency":"UZS"}</code>\n\n` +
    `<b>3) Buyurtma berish</b>\n` +
    `<code>key=KALIT&amp;action=add&amp;service=ID&amp;link=URL&amp;quantity=100</code>\n` +
    `→ <code>{"order":123}</code>\n\n` +
    `<b>4) Buyurtma holati</b>\n` +
    `<code>key=KALIT&amp;action=status&amp;order=123</code>\n` +
    `→ <code>{"status":"Pending","charge":"1800.00",...}</code>\n\n` +
    `<b>Xatolik javobi:</b> <code>{"error":"Incorrect API key"}</code>\n\n` +
    `<b>cURL misol:</b>\n` +
    `<code>curl -X POST ${config.apiUrl()} \\\n` +
    `  -d "key=KALIT" -d "action=balance"</code>`,

  // --- Murojaat ---
  supportIntro:
    `☎️ <b>Murojaat</b>\n\n` +
    `Savolingiz yoki taklifingizni yozing — admin javob beradi.\n` +
    `Tez bog'lanish: @${config.supportUsername}`,
  supportSent: '✅ Murojaatingiz yuborildi. Tez orada javob beramiz.',
  supportReply: (text) => `📩 <b>Admin javobi:</b>\n\n${text}`,

  // --- Qo'llanma ---
  guide:
    `📚 <b>Qo'llanma</b>\n\n` +
    `<b>1. Hisobni to'ldirish</b>\n` +
    `"${BTN.TOPUP}" → summani kiriting → kartaga o'tkazing → chek rasmini yuboring.\n\n` +
    `<b>2. Buyurtma berish</b>\n` +
    `"${BTN.ORDER}" → tarmoqni tanlang → xizmatni tanlang → havolani yuboring → miqdorni kiriting → tasdiqlang.\n\n` +
    `<b>3. Havola qanday bo'ladi?</b>\n` +
    `• Obunachi: profil/kanal havolasi\n` +
    `• Like va ko'rish: post havolasi\n\n` +
    `<b>4. Muhim qoidalar</b>\n` +
    `• Profil <b>ochiq</b> (public) bo'lishi shart\n` +
    `• Buyurtma davomida username o'zgartirilmasin\n` +
    `• Bir havolaga bir vaqtda 2 ta buyurtma bermang\n\n` +
    `<b>5. Buyurtma holatlari</b>\n` +
    `⏳ Kutilmoqda — navbatda\n` +
    `🔄 Bajarilmoqda — jarayonda\n` +
    `✅ Bajarildi — tugadi\n` +
    `❌ Bekor qilindi — mablag' qaytarildi\n\n` +
    `<b>6. Referal</b>\n` +
    `Har bir taklif qilgan do'stingiz uchun ${num(config.referralBonus)} ${config.currency}.\n\n` +
    `Savollar bo'lsa: @${config.supportUsername}`,
};

module.exports = T;
