'use strict';

const config = require('../config');

/**
 * SMM provayder integratsiyasi (ixtiyoriy).
 *
 * Ko'pchilik SMM panellar "API v2" standartida ishlaydi:
 *   POST {SMM_API_URL}
 *   key=API_KEY & action=add & service=ID & link=URL & quantity=N
 *
 * SMM_API_URL bo'sh bo'lsa — buyurtmalar qo'lda (admin tomonidan) bajariladi.
 */

const enabled = Boolean(config.smmApiUrl && config.smmApiKey);

async function call(params) {
  const body = new URLSearchParams({ key: config.smmApiKey, ...params });
  const res = await fetch(config.smmApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Provayder HTTP ${res.status}`);
  return res.json();
}

/** Buyurtma yaratish. Muvaffaqiyatli bo'lsa provayderdagi order ID qaytadi. */
async function createOrder({ apiId, link, quantity }) {
  if (!enabled) return null;
  const data = await call({
    action: 'add',
    service: String(apiId),
    link,
    quantity: String(quantity),
  });
  if (data.error) throw new Error(data.error);
  return String(data.order);
}

/** Buyurtma holatini tekshirish */
async function checkStatus(providerOrderId) {
  if (!enabled) return null;
  const data = await call({ action: 'status', order: String(providerOrderId) });
  if (data.error) throw new Error(data.error);
  return data; // { status, charge, start_count, remains, ... }
}

/** Provayderdagi balans */
async function balance() {
  if (!enabled) return null;
  return call({ action: 'balance' });
}

module.exports = { enabled, createOrder, checkStatus, balance };
