'use strict';

/**
 * Chat "toza" bo'lishi uchun kichik yordamchi: har bir yangi qadamda
 * eski bot xabarini o'chirib, kerak bo'lsa foydalanuvchining shu
 * qadamni boshlagan xabarini ham o'chirib tashlaydi — natijada chatda
 * eski xabarlar to'planib qolmaydi, doim bitta "joriy" ekran turadi.
 *
 * - edit()      — callback (inline tugma) orqali kelgan qadamlarda:
 *                  xabarni JOYIDA tahrirlaydi (yangi xabar qo'shmaydi).
 * - send()      — yangi xabar kerak bo'lganda (masalan reply-keyboard —
 *                  ReplyKeyboardMarkup — kerak bo'lsa, chunki uni faqat
 *                  yangi xabarda o'rnatib bo'ladi): eskisini o'chirib,
 *                  yangisini yuboradi.
 * - sendClean() — matn/rasm steplarida (foydalanuvchi javob yozganda):
 *                  eski bot xabarini VA foydalanuvchining shu xabarini
 *                  o'chirib, keyingi qadamni yuboradi.
 */

async function cleanupPrev(ctx) {
  const id = ctx.session?.lastBotMsgId;
  if (!id) return;
  try {
    await ctx.deleteMessage(id);
  } catch {
    /* xabar allaqachon o'chirilgan yoki 48 soatdan eski — e'tiborsiz qoldiramiz */
  }
}

async function send(ctx, text, extra = {}) {
  await cleanupPrev(ctx);
  const sent = await ctx.reply(text, extra);
  ctx.session.lastBotMsgId = sent.message_id;
  return sent;
}

async function sendClean(ctx, text, extra = {}) {
  await cleanupPrev(ctx);
  if (ctx.message?.message_id) {
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {
      /* shaxsiy chatda o'z xabarini o'chirish odatda ishlaydi, lekin kafolat yo'q */
    }
  }
  const sent = await ctx.reply(text, extra);
  ctx.session.lastBotMsgId = sent.message_id;
  return sent;
}

async function edit(ctx, text, extra = {}) {
  try {
    await ctx.editMessageText(text, extra);
    ctx.session.lastBotMsgId = ctx.callbackQuery?.message?.message_id || ctx.session.lastBotMsgId;
  } catch {
    // Xabar tahrirlab bo'lmadi (masalan juda eski) — o'rniga yangisini yuboramiz
    const sent = await ctx.reply(text, extra);
    ctx.session.lastBotMsgId = sent.message_id;
  }
}

/**
 * `ctx.resetSession()` sessiyani butunlay yangilaydi (shu jumladan
 * `lastBotMsgId`ni ham tozalaydi) — shuning uchun tozalashni ALDINDAN,
 * reset qilishdan OLDIN bajarish kerak. Flow oxirida (bekor qilindi,
 * buyurtma yaratildi va h.k.) ishlatiladigan umumiy pattern shu yerda.
 */
async function resetAndSend(ctx, text, extra = {}) {
  await cleanupPrev(ctx);
  if (ctx.message?.message_id) {
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {
      /* e'tiborsiz */
    }
  }
  ctx.resetSession();
  const sent = await ctx.reply(text, extra);
  ctx.session.lastBotMsgId = sent.message_id;
  return sent;
}

module.exports = { send, sendClean, edit, resetAndSend, cleanupPrev };
