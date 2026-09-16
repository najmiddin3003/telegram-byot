'use strict';

/**
 * Yengil in-memory sessiya (foydalanuvchi qaysi qadamda turganini eslab qoladi).
 * Sessiya vaqtinchalik ma'lumot — bot qayta ishga tushsa tozalanadi, bu normal.
 */

const store = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 soat

function cleanup() {
  const now = Date.now();
  for (const [key, value] of store) {
    if (now - value.__t > TTL_MS) store.delete(key);
  }
}
setInterval(cleanup, 10 * 60 * 1000).unref();

function sessionMiddleware() {
  return async (ctx, next) => {
    const key = String(ctx.from?.id || ctx.chat?.id || 'anon');
    let data = store.get(key);
    if (!data) {
      data = { __t: Date.now() };
      store.set(key, data);
    }
    data.__t = Date.now();

    ctx.session = data;
    ctx.resetSession = () => {
      const fresh = { __t: Date.now() };
      store.set(key, fresh);
      ctx.session = fresh;
      return fresh;
    };

    return next();
  };
}

module.exports = { sessionMiddleware, store };
