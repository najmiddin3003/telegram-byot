'use strict';

const express = require('express');
const config = require('./config');
const db = require('./db');
const { createBot, setCommands } = require('./bot');
const { mountApi } = require('./api');
const paymentService = require('./services/paymentService');
const { confirmMatchedPayment } = require('./services/paymentConfirm');

async function main() {
  await db.init();

  const bot = createBot();
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/', (req, res) => res.send('🤖 Bot ishlayapti'));
  app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  // --- To'lov webhook: unikal summa orqali avtomatik tasdiqlash ---
  //
  // Tashqi tizim (to'lov agregatori — Click/Payme, yoki bank SMS'larini
  // o'qib yuboradigan xizmat) yangi tushgan pul haqida shu manzilga
  // xabar beradi. Biz o'sha summani Redis'dagi kutilayotgan
  // to'lovlar bilan solishtiramiz — mos kelsa avtomatik tasdiqlaymiz.
  //
  // So'rov:
  //   POST /webhook/payment?token=<PAYMENT_WEBHOOK_SECRET>
  //   Content-Type: application/json  { "amount": 23034 }
  //   (yoki x-www-form-urlencoded: amount=23034)
  //
  // Himoya: token query parametri YOKI X-Webhook-Secret header orqali
  // config.paymentWebhookSecret bilan solishtiriladi.
  app.post('/webhook/payment', async (req, res) => {
    const token = req.query.token || req.headers['x-webhook-secret'];
    if (token !== config.paymentWebhookSecret) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, error: 'bad_amount' });
    }

    try {
      const payload = await paymentService.matchAndConsume(Math.round(amount));
      if (!payload) {
        // Bu summaga mos kutilayotgan to'lov topilmadi (muddati o'tgan,
        // noto'g'ri summa yoki bu bizga aloqasi yo'q tushum bo'lishi mumkin).
        return res.status(404).json({ ok: false, error: 'no_pending_match' });
      }

      const result = await confirmMatchedPayment(bot.telegram, payload);
      return res.json({ ok: true, ...result });
    } catch (e) {
      console.error('[webhook/payment] xatolik:', e);
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  // --- SMS-forwarder ilova uchun webhook (rasmda ko'rsatilgan ilova formatida) ---
  //
  // Ilovada aynan skrindagidek sozlanadi:
  //   Tip so'rovi: POST
  //   URL:         https://sizning-domen.com/webhooks/sms
  //   Body (JSON):
  //     {
  //       "secretKey": "<.env dagi PAYMENT_WEBHOOK_SECRET>",
  //       "text": "{msg}"
  //     }
  //
  // ({msg} — ilovaning o'zi shu joyga kelgan bank SMS matnini qo'yib yuboradi)
  //
  // Karta SMS'i kelganda ilova shu manzilga xabar yuboradi, biz SMS matnidan
  // summani (masalan "...23 034.00 so'm kirim qilindi" -> 23034) ajratib
  // olib, xuddi /webhook/payment kabi Redis'dagi kutilayotgan to'lov bilan
  // solishtiramiz.
  app.post('/webhooks/sms', async (req, res) => {
    const token = req.body?.secretKey || req.query.token || req.headers['x-webhook-secret'];
    if (token !== config.paymentWebhookSecret) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const amount = paymentService.extractAmountFromSms(req.body?.text);
    if (!amount) {
      // Pul haqida bo'lmagan SMS (OTP, reklama va h.k.) — bu normal holat,
      // shuning uchun 200 qaytaramiz (ilova xatoga chiqib "qayta urinmasin").
      return res.json({ ok: true, matched: false, reason: 'amount_not_found' });
    }

    try {
      const payload = await paymentService.matchAndConsume(amount);
      if (!payload) {
        return res.json({ ok: true, matched: false, amount, reason: 'no_pending_match' });
      }
      const result = await confirmMatchedPayment(bot.telegram, payload);
      return res.json({ ok: true, matched: true, amount, ...result });
    } catch (e) {
      console.error('[webhooks/sms] xatolik:', e);
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  // Hamkorlar uchun API: /api/v2 va /<BotNomi>/api/v2
  mountApi(app, bot.telegram);

  if (config.publicUrl) {
    // --- Render / production: WEBHOOK ---
    const path = `/telegraf/${config.webhookSecret}`;
    app.use(
      await bot.createWebhook({
        domain: config.publicUrl,
        path,
        secret_token: config.webhookSecret.replace(/[^A-Za-z0-9_-]/g, ''),
        drop_pending_updates: true,
      })
    );
    app.listen(config.port, () => {
      console.log(`✅ Webhook rejimi: ${config.publicUrl}${path}`);
      console.log(`🌐 Server ${config.port}-portda`);
    });
  } else {
    // --- Lokal ishlab chiqish: LONG POLLING ---
    app.listen(config.port, () => console.log(`🌐 Server ${config.port}-portda`));
    await bot.telegram.deleteWebhook({ drop_pending_updates: true }).catch(() => {});
    bot.launch({ dropPendingUpdates: true });
    console.log('✅ Polling rejimi (PUBLIC_URL berilmagan)');
  }

  await setCommands(bot).catch((e) => console.error('[bot] setMyCommands:', e.message));

  const me = await bot.telegram.getMe();
  console.log(`🤖 @${me.username} ishga tushdi`);
  console.log(`🔗 Hamkor API: ${config.apiUrl()}`);
  if (!config.adminIds.length) {
    console.warn("⚠️  ADMIN_IDS bo'sh — to'lovlarni tasdiqlash uchun uni to'ldiring!");
  }

  const stop = (signal) => {
    console.log(`\n${signal} — to'xtatilmoqda...`);
    bot.stop(signal);
    process.exit(0);
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));
}

main().catch((e) => {
  console.error('❌ Ishga tushmadi:', e);
  process.exit(1);
});
