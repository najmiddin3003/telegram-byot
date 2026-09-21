'use strict';

const express = require('express');
const config = require('./config');
const db = require('./db');
const { createBot, setCommands } = require('./bot');
const { mountApi } = require('./api');

async function main() {
  await db.init();

  const bot = createBot();
  const app = express();

  app.get('/', (req, res) => res.send('🤖 Bot ishlayapti'));
  app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

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
