'use strict';

const express = require('express');
const db = require('./db');
const config = require('./config');
const catalog = require('./catalog');
const { placeOrder, OrderError } = require('./services/orderService');

/**
 * Hamkorlar uchun ochiq API (5-rasmdagi "Hamkorlik tizimi").
 * Standart "SMM Panel API v2" ko'rinishi:
 *   POST /api/v2   key=...&action=services|balance|add|status
 */

const STATUS_MAP = {
  pending: 'Pending',
  processing: 'In progress',
  completed: 'Completed',
  cancelled: 'Canceled',
};

function money2(n) {
  return (Number(n) || 0).toFixed(2);
}

function createApiRouter(telegram) {
  const router = express.Router();

  router.use(express.urlencoded({ extended: false, limit: '64kb' }));
  router.use(express.json({ limit: '64kb' }));

  const handler = async (req, res) => {
    const p = { ...req.query, ...req.body };
    const key = String(p.key || '').trim();
    const action = String(p.action || '').trim().toLowerCase();

    if (!key) return res.json({ error: 'Incorrect API key' });

    const user = await db.getUserByApiKey(key);
    if (!user) return res.json({ error: 'Incorrect API key' });
    if (user.is_blocked) return res.json({ error: 'Account is blocked' });

    switch (action) {
      case 'services':
        return res.json(
          catalog.allServices().map((s) => ({
            service: s.id,
            name: s.name
              .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
              .replace(/\s+/g, ' ')
              .trim(),
            type: 'Default',
            category: s.categoryTitle,
            rate: money2(s.price),
            min: String(s.min),
            max: String(s.max),
            refill: false,
            cancel: true,
          }))
        );

      case 'balance':
        return res.json({ balance: money2(user.balance), currency: 'UZS' });

      case 'add': {
        try {
          const { order } = await placeOrder({
            telegram,
            userId: user.id,
            serviceId: String(p.service || ''),
            link: String(p.link || ''),
            quantity: Number(p.quantity),
            source: 'api',
          });
          return res.json({ order: order.id });
        } catch (e) {
          if (e instanceof OrderError) {
            const messages = {
              service: 'Incorrect service ID',
              quantity: 'Incorrect quantity',
              link: 'Incorrect link',
              balance: 'Not enough funds on balance',
              free_limit: 'Free service daily limit reached',
              user: 'Incorrect API key',
            };
            return res.json({ error: messages[e.code] || e.message });
          }
          console.error('[api] add:', e);
          return res.status(500).json({ error: 'Internal error' });
        }
      }

      case 'status': {
        const ids = String(p.orders || p.order || '')
          .split(',')
          .map((x) => Number(x.trim()))
          .filter(Boolean)
          .slice(0, 100);

        if (!ids.length) return res.json({ error: 'Incorrect order ID' });

        const describe = async (id) => {
          const o = await db.getOrder(id);
          if (!o || Number(o.user_id) !== Number(user.id)) return { error: 'Incorrect order ID' };
          return {
            charge: money2(o.price),
            start_count: '0',
            status: STATUS_MAP[o.status] || o.status,
            remains: o.status === 'completed' ? '0' : String(o.quantity),
            currency: 'UZS',
          };
        };

        // Bitta buyurtma → obyekt, bir nechta → {id: {...}} ko'rinishida
        if (p.order && !p.orders) return res.json(await describe(ids[0]));

        const out = {};
        for (const id of ids) out[id] = await describe(id);
        return res.json(out);
      }

      default:
        return res.json({ error: 'Incorrect action' });
    }
  };

  router.post('/', handler);
  router.get('/', handler);

  return router;
}

/** API'ni express ilovasiga ulash: /api/v2 va /<BotNomi>/api/v2 */
function mountApi(app, telegram) {
  const router = createApiRouter(telegram);
  app.use('/api/v2', router);
  if (config.botUsername) app.use(`/${config.botUsername}/api/v2`, router);
}

module.exports = { createApiRouter, mountApi };
