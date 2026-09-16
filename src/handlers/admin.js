'use strict';

const db = require('../db');
const T = require('../texts');
const config = require('../config');
const { step } = require('../steps');
const { mainMenu, cancelMenu, adminMenu, paymentModerationKb } = require('../keyboards');
const { escapeHtml, statusLabel, userLabel, sleep } = require('../utils');

function register(bot) {
  const guard = (ctx) => config.isAdmin(ctx.from?.id);

  bot.command('admin', async (ctx) => {
    if (!guard(ctx)) return;
    ctx.resetSession();
    await ctx.reply('🛠 <b>Admin panel</b>', { parse_mode: 'HTML', ...adminMenu });
  });

  // --- Statistika ---
  bot.action('adm:stats', async (ctx) => {
    if (!guard(ctx)) return ctx.answerCbQuery("Ruxsat yo'q", { show_alert: true });
    await ctx.answerCbQuery();

    const s = await db.globalStats();
    await ctx.reply(
      `📊 <b>Statistika</b>\n\n` +
        `👥 Foydalanuvchilar: <b>${T.num(s.users)}</b>\n` +
        `🆕 Bugun qo'shilgan: <b>${T.num(s.newToday)}</b>\n` +
        `📦 Buyurtmalar: <b>${T.num(s.orders)}</b>\n` +
        `💵 Buyurtmalar summasi: <b>${T.money(s.revenue)}</b>\n` +
        `💰 Tasdiqlangan to'lovlar: <b>${T.money(s.topups)}</b>\n` +
        `⏳ Kutilayotgan to'lovlar: <b>${T.num(s.pending)}</b>`,
      { parse_mode: 'HTML' }
    );
  });

  // --- Kutilayotgan to'lovlar ---
  bot.action('adm:pending', async (ctx) => {
    if (!guard(ctx)) return ctx.answerCbQuery("Ruxsat yo'q", { show_alert: true });
    await ctx.answerCbQuery();

    const list = await db.pendingPayments(10);
    if (!list.length) return ctx.reply("✅ Kutilayotgan to'lovlar yo'q.");

    for (const p of list) {
      const user = await db.getUser(p.user_id);
      const caption =
        `💳 <b>To'lov #${p.id}</b>\n\n` +
        `👤 ${user ? userLabel(user) : p.user_id}\n` +
        `💵 ${T.money(p.amount)}`;
      try {
        if (p.receipt_file_id) {
          await ctx.replyWithPhoto(p.receipt_file_id, {
            caption,
            parse_mode: 'HTML',
            ...paymentModerationKb(p.id),
          });
        } else {
          await ctx.reply(caption, { parse_mode: 'HTML', ...paymentModerationKb(p.id) });
        }
      } catch (e) {
        console.error('[admin] pending:', e.message);
      }
    }
  });

  // --- Broadcast ---
  bot.action('adm:cast', async (ctx) => {
    if (!guard(ctx)) return ctx.answerCbQuery("Ruxsat yo'q", { show_alert: true });
    await ctx.answerCbQuery();
    ctx.session.step = 'admin:cast';
    await ctx.reply('📢 Yubormoqchi bo\'lgan xabaringizni yozing:', cancelMenu);
  });

  step('admin:cast', async (ctx, text) => {
    if (!guard(ctx)) return;
    ctx.resetSession();

    const ids = await db.allUserIds();
    await ctx.reply(`📤 Yuborilmoqda... (${ids.length} ta foydalanuvchi)`, mainMenu);

    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await ctx.telegram.sendMessage(id, text, { parse_mode: 'HTML' });
        ok++;
      } catch {
        fail++;
      }
      await sleep(40); // Telegram limiti: ~30 xabar/sekund
    }

    await ctx.reply(`✅ Yuborildi: <b>${ok}</b>\n❌ Yuborilmadi: <b>${fail}</b>`, { parse_mode: 'HTML' });
  });

  // --- Buyurtma holatini o'zgartirish ---
  bot.action(/^ord:(run|done|cancel):(\d+)$/, async (ctx) => {
    if (!guard(ctx)) return ctx.answerCbQuery("Ruxsat yo'q", { show_alert: true });

    const action = ctx.match[1];
    const orderId = Number(ctx.match[2]);
    const order = await db.getOrder(orderId);
    if (!order) return ctx.answerCbQuery('Buyurtma topilmadi', { show_alert: true });

    const statusMap = { run: 'processing', done: 'completed', cancel: 'cancelled' };
    const status = statusMap[action];

    if (order.status === status) return ctx.answerCbQuery('Holat allaqachon shunday');

    // Bekor qilinsa — pulni qaytarish
    if (status === 'cancelled' && order.status !== 'cancelled') {
      await db.addBalance(order.user_id, order.price);
    }

    await db.updateOrder(orderId, { status });
    await ctx.answerCbQuery(`✅ ${statusLabel(status)}`);

    try {
      await ctx.telegram.sendMessage(
        order.user_id,
        `📦 <b>Buyurtma #${order.id}</b> holati yangilandi:\n${statusLabel(status)}` +
          (status === 'cancelled' ? `\n\n💰 ${T.money(order.price)} hisobingizga qaytarildi.` : ''),
        { parse_mode: 'HTML' }
      );
    } catch { /* bloklagan */ }
  });

  // --- Balansni qo'lda o'zgartirish: /balans <user_id> <summa> ---
  bot.command('qoshish', async (ctx) => {
    if (!guard(ctx)) return;

    const [, rawId, rawAmount] = ctx.message.text.split(/\s+/);
    const id = Number(rawId);
    const amount = Number(rawAmount);

    if (!id || !Number.isFinite(amount)) {
      return ctx.reply("Foydalanish: /qoshish <user_id> <summa>\nMinus bilan yechish ham mumkin: /qoshish 12345 -10000");
    }

    const user = await db.getUser(id);
    if (!user) return ctx.reply('Foydalanuvchi topilmadi.');

    const updated = await db.addBalance(id, amount);
    await ctx.reply(
      `✅ <code>${id}</code> balansi o'zgartirildi.\nYangi balans: <b>${T.money(updated.balance)}</b>`,
      { parse_mode: 'HTML' }
    );

    try {
      await ctx.telegram.sendMessage(
        id,
        amount >= 0
          ? T.topupApproved(amount, updated.balance)
          : `ℹ️ Hisobingizdan ${T.money(Math.abs(amount))} yechildi.\nJoriy balans: <b>${T.money(updated.balance)}</b>`,
        { parse_mode: 'HTML' }
      );
    } catch { /* bloklagan */ }
  });

  // --- Foydalanuvchi haqida ma'lumot: /user <id> ---
  bot.command('user', async (ctx) => {
    if (!guard(ctx)) return;

    const id = Number(ctx.message.text.split(/\s+/)[1]);
    if (!id) return ctx.reply('Foydalanish: /user <user_id>');

    const user = await db.getUser(id);
    if (!user) return ctx.reply('Foydalanuvchi topilmadi.');

    const stats = await db.userStats(id);
    await ctx.reply(
      `👤 ${userLabel(user)}\n\n` +
        `💰 Balans: <b>${T.money(user.balance)}</b>\n` +
        `📦 Buyurtmalar: <b>${T.num(stats.orders)}</b>\n` +
        `💸 Sarflagan: <b>${T.money(stats.spent)}</b>\n` +
        `👥 Referallar: <b>${T.num(stats.referrals)}</b>\n` +
        `🔐 Hamkor: <b>${user.is_partner ? 'ha' : "yo'q"}</b>\n` +
        `🚫 Bloklangan: <b>${user.is_blocked ? 'ha' : "yo'q"}</b>`,
      { parse_mode: 'HTML' }
    );
  });

  // --- Bloklash / blokdan chiqarish ---
  bot.command('block', async (ctx) => {
    if (!guard(ctx)) return;
    const id = Number(ctx.message.text.split(/\s+/)[1]);
    if (!id) return ctx.reply('Foydalanish: /block <user_id>');

    const user = await db.getUser(id);
    if (!user) return ctx.reply('Foydalanuvchi topilmadi.');

    const updated = await db.updateUser(id, { is_blocked: !user.is_blocked });
    await ctx.reply(
      `${updated.is_blocked ? '🚫 Bloklandi' : '✅ Blokdan chiqarildi'}: <code>${id}</code>`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('adminhelp', async (ctx) => {
    if (!guard(ctx)) return;
    await ctx.reply(
      `🛠 <b>Admin buyruqlari</b>\n\n` +
        `/admin — panel\n` +
        `/user &lt;id&gt; — foydalanuvchi ma'lumoti\n` +
        `/qoshish &lt;id&gt; &lt;summa&gt; — balansni o'zgartirish\n` +
        `/hamkor &lt;id&gt; — hamkor maqomi\n` +
        `/javob &lt;id&gt; &lt;matn&gt; — murojaatga javob\n` +
        `/block &lt;id&gt; — bloklash/ochish`,
      { parse_mode: 'HTML' }
    );
  });
}

module.exports = { register };
