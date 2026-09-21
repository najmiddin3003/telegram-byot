'use strict';

const Redis = require('ioredis');
const config = require('./config');

/**
 * Yagona Redis ulanishi. Unikal summalarni (to'lovni avtomatik aniqlash
 * uchun) va vaqtincha buyurtma qoralamalarini shu yerda saqlaymiz.
 *
 * REDIS_URL berilmagan bo'lsa ham ishga tushadi (standart:
 * redis://localhost:6379), lekin ulanib bo'lmasa xatoликлар faqat
 * log qilinadi — bot o'zi yiqilib qolmaydi (qo'lda tasdiqlash rejimi
 * baribir ishlayveradi).
 */
const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  retryStrategy(times) {
    return Math.min(times * 500, 5000);
  },
});

redis.on('error', (e) => console.error('[redis] xatolik:', e.message));
redis.on('connect', () => console.log(`[redis] ulandi: ${config.redisUrl}`));

module.exports = redis;
