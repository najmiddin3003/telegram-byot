'use strict';

/**
 * Qadam (step) registri.
 * Har bir handler o'z matn-qadamlarini shu yerga ro'yxatdan o'tkazadi,
 * bot.js esa bitta `bot.on('text')` orqali kerakli qadamga yo'naltiradi.
 */

const registry = new Map();

function step(name, fn) {
  registry.set(name, fn);
}

function getStep(name) {
  return registry.get(name) || null;
}

module.exports = { step, getStep };
