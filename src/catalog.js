'use strict';

/**
 * Xizmatlar katalogi.
 *
 * price  — 1000 dona uchun narx (so'mda). Bepul xizmatlarda 0.
 * min/max — buyurtma miqdori chegaralari
 * apiId  — SMM provayderdagi xizmat ID (SMM_API_URL ishlatilsa kerak bo'ladi)
 * free   — true bo'lsa balansdan pul yechilmaydi (kunlik limit bilan)
 *
 * Tugmalarda faqat `name` ko'rinadi (2-rasmdagidek), narx keyingi ekranda chiqadi.
 */

const HINT_IG_PROFILE = 'Masalan: https://instagram.com/username';
const HINT_IG_POST = 'Masalan: https://instagram.com/p/Cxxxxxxx';
const HINT_TG_CHANNEL = 'Masalan: https://t.me/kanal_nomi';
const HINT_TG_POST = 'Masalan: https://t.me/kanal_nomi/123';
const HINT_YT_VIDEO = 'Masalan: https://youtube.com/watch?v=xxxxxxx';
const HINT_YT_CHANNEL = 'Masalan: https://youtube.com/@kanal';
const HINT_TT_PROFILE = 'Masalan: https://tiktok.com/@username';
const HINT_TT_VIDEO = 'Masalan: https://tiktok.com/@username/video/123456';

const categories = [
  {
    id: 'telegram',
    emoji: '🚀',
    title: 'Telegram',
    services: [
      { id: 'tg_subs_cheap', name: '👥 Arzon obunachi (kafolatsiz, sekin)', price: 8999, min: 10000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 101 },
      { id: 'tg_subs_guaranteed', name: '🛡️ Kafolatli obunachi (365 kun)', price: 23000, min: 1000, max: 50000, hint: HINT_TG_CHANNEL, apiId: 102 },
      { id: 'tg_views_cheap', name: '👁 Arzon prasmotr', price: 120, min: 10000, max: 100000, hint: HINT_TG_POST, apiId: 103 },
      { id: 'tg_views_fast', name: '⚡️ Super tez prasmotr', price: 214, min: 10000, max: 100000, hint: HINT_TG_POST, apiId: 104 },
      { id: 'tg_likes_cheap', name: '💰 Arzon Like', price: 2400, min: 500, max: 100000, hint: HINT_TG_POST, apiId: 105 },
      { id: 'tg_likes_fast', name: '⚡️ Super tezkor Like', price: 4700, min: 500, max: 100000, hint: HINT_TG_POST, apiId: 106 },
      { id: 'tg_likes_30', name: '🗓 30 kunlik Like', price: 4800, min: 500, max: 100000, hint: HINT_TG_POST, apiId: 107 },
      { id: 'tg_likes_90', name: '🗓 90 kunlik Like', price: 5200, min: 500, max: 100000, hint: HINT_TG_POST, apiId: 108 },
      { id: 'tg_likes_lifetime', name: '♾️ Bir umrlik Like', price: 6400, min: 500, max: 100000, hint: HINT_TG_POST, apiId: 109 },
      { id: 'tg_repost_cheap', name: '💰 Super arzon repost', price: 8900, min: 50, max: 20000, hint: HINT_TG_POST, apiId: 110 },
      { id: 'tg_repost_fast', name: '⚡ Tezkor repost', price: 9890, min: 50, max: 20000, hint: HINT_TG_POST, apiId: 111 },
      { id: 'tg_story_reactions', name: '❤️ Tg hikoya reaktsiyalar', price: 1800, min: 50, max: 50000, hint: HINT_TG_POST, apiId: 112 },
      { id: 'tg_subs_3d', name: '⏳ 3 kun kafolatli sekin obunachi', price: 2280, min: 10000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 113 },
      { id: 'tg_subs_15d_fast', name: '⚡ 15 kun tez obunachi', price: 6200, min: 10000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 114 },
      { id: 'tg_subs_30d_slow', name: '🕒 30 kun sekin obunachi', price: 6200, min: 10000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 115 },
      { id: 'tg_subs_60d_fast', name: '⚡ 60 kun tez obunachi', price: 8500, min: 10000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 116 },
      { id: 'tg_subs_180d_fast', name: '⚡ 180 kun tez obunachi', price: 13800, min: 10000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 117 },
      { id: 'tg_reactions', name: '❤️ Reaksiya | Like', price: 750, min: 50, max: 50000, hint: HINT_TG_POST, apiId: 118 },
      { id: 'tg_views', name: "👁 Post Ko'rishlar", price: 125, min: 100, max: 500000, hint: HINT_TG_POST, apiId: 119 },
      { id: 'tg_comments', name: '💬 Camentariya | Izoh', price: 9000, min: 10, max: 1000, hint: HINT_TG_POST, apiId: 120 },
      { id: 'tg_share', name: '🔄 Repost xizmati', price: 7300, min: 50, max: 20000, hint: HINT_TG_POST, apiId: 121 },
      { id: 'tg_votes', name: "🗳 So'rovnomaga ovoz", price: 8000, min: 50, max: 20000, hint: HINT_TG_POST, apiId: 122 },
      { id: 'tg_premium', name: '⭐️ Premium obunachi', price: 21555, min: 20, max: 5000, hint: HINT_TG_CHANNEL, apiId: 123 },
      { id: 'tg_uz', name: "🇺🇿 O'zbek Xizmatlar", price: 287800, min: 50, max: 10000, hint: HINT_TG_CHANNEL, apiId: 124 },
    ],
  },
  {
    id: 'instagram',
    emoji: '🚀',
    title: 'Instagram',
    services: [
      { id: 'ig_subs_cheap', name: '👥 Obunachi ( 🌿 Arzon Baza )', price: 4800, min: 100, max: 100000, hint: HINT_IG_PROFILE, apiId: 201 },
      { id: 'ig_subs_super', name: '👥 Obunachi ( 🚀 Super Baza )', price: 8200, min: 100, max: 50000, hint: HINT_IG_PROFILE, apiId: 202 },
      { id: 'ig_likes', name: '❤️ Like Yoqtirishlar', price: 1900, min: 50, max: 50000, hint: HINT_IG_POST, apiId: 203 },
      { id: 'ig_views', name: "👁 Video Ko'rishlar", price: 61, min: 500, max: 500000, hint: HINT_IG_POST, apiId: 204 },
      { id: 'ig_comments_cheap', name: '💬 Instagram kamentlar (Arzon)', price: 9999, min: 10, max: 1000, hint: HINT_IG_POST, apiId: 205 },
      { id: 'ig_comments_good', name: '💬 Instagram kamentlar (Ijobi)', price: 20776, min: 10, max: 1000, hint: HINT_IG_POST, apiId: 206 },
      { id: 'ig_story_views_cheap', name: '👁 Eng arzon ko\'rish', price: 1200, min: 100, max: 100000, hint: HINT_IG_POST, apiId: 207 },
      { id: 'ig_story_views_super', name: '👁 Super ko\'rish', price: 2300, min: 100, max: 100000, hint: HINT_IG_POST, apiId: 208 },
      { id: 'ig_story_views_ideal', name: '👁 Istora ko\'rish', price: 3800, min: 100, max: 100000, hint: HINT_IG_POST, apiId: 209 },
      { id: 'ig_story_views_lake', name: '📖 Stories lake', price: 6900, min: 100, max: 100000, hint: HINT_IG_POST, apiId: 210 },
      { id: 'ig_repost', name: '🔄 Repost xizmati', price: 7300, min: 20, max: 10000, hint: HINT_IG_POST, apiId: 211 },
      { id: 'ig_live_15', name: '📡 Jonli efir ( Live ) — 15 daqiqa', price: 12000, min: 20, max: 5000, hint: HINT_IG_PROFILE, apiId: 212 },
      { id: 'ig_live_60', name: '🔴 Jonli efir ( Live ) — 60 daqiqa', price: 21000, min: 20, max: 5000, hint: HINT_IG_PROFILE, apiId: 213 },
      { id: 'ig_reach', name: "📈 Axvat | 💾 Save | 🚀 Ulashish", price: 979, min: 5000, max: 50000, hint: HINT_IG_POST, apiId: 214 },
      { id: 'ig_uz', name: "🇺🇿 O'zbek Xizmatlar", price: 287800, min: 50, max: 10000, hint: HINT_IG_PROFILE, apiId: 215 },
    ],
  },
  {
    id: 'youtube',
    emoji: '🚀',
    title: 'Youtube',
    services: [
      { id: 'yt_subs', name: '👥 Obunachi ( 🚀 Super Baza )', price: 18000, min: 50, max: 10000, hint: HINT_YT_CHANNEL, apiId: 301 },
      { id: 'yt_likes', name: '❤️ Like Yoqtirishlar', price: 8000, min: 50, max: 20000, hint: HINT_YT_VIDEO, apiId: 302 },
      { id: 'yt_views', name: "👁 Video Ko'rishlar", price: 7000, min: 500, max: 200000, hint: HINT_YT_VIDEO, apiId: 303 },
      { id: 'yt_comments', name: '💬 Camentariya | Izoh', price: 30678, min: 10, max: 500, hint: HINT_YT_VIDEO, apiId: 304 },
      { id: 'yt_shorts', name: "🎬 Shorts Ko'rishlar", price: 12000, min: 500, max: 500000, hint: HINT_YT_VIDEO, apiId: 305 },
      { id: 'yt_watchtime', name: "⏱ Watch Time ( soat )", price: 400000, min: 100, max: 4000, hint: HINT_YT_VIDEO, apiId: 306 },
      { id: 'yt_live', name: '🔴 Jonli efir ( Live )', price: 70000, min: 50, max: 5000, hint: HINT_YT_VIDEO, apiId: 307 },
    ],
  },
  {
    id: 'tiktok',
    emoji: '🚀',
    title: 'Tiktok',
    services: [
      { id: 'tt_subs_cheap', name: '👥 Obunachi ( 🌿 Arzon Baza )', price: 27223, min: 100, max: 100000, hint: HINT_TT_PROFILE, apiId: 401 },
      { id: 'tt_subs_super', name: '👥 Obunachi ( 🚀 Super Baza )', price: 28481, min: 100, max: 50000, hint: HINT_TT_PROFILE, apiId: 402 },
      { id: 'tt_likes', name: '❤️ Like Yoqtirishlar', price: 7500, min: 100, max: 50000, hint: HINT_TT_VIDEO, apiId: 403 },
      { id: 'tt_views', name: "👁 Video Ko'rishlar", price: 3444, min: 1000, max: 1000000, hint: HINT_TT_VIDEO, apiId: 404 },
      { id: 'tt_comments', name: '💬 Camentariya | Izoh', price: 11825, min: 10, max: 1000, hint: HINT_TT_VIDEO, apiId: 405 },
      { id: 'tt_share', name: "📈 Save | 🚀 Ulashish", price: 17304, min: 100, max: 50000, hint: HINT_TT_VIDEO, apiId: 406 },
      { id: 'tt_live', name: '🔴 Jonli efir ( Live )', price: 14073, min: 50, max: 5000, hint: HINT_TT_PROFILE, apiId: 407 },
    ],
  },
  {
    id: 'free',
    emoji: '🎉',
    title: 'Bepul xizmatlar',
    free: true,
    services: [
      { id: 'free_tg_views', name: "👁 Telegram post ko'rish ( bepul )", price: 0, min: 50, max: 50, hint: HINT_TG_POST, apiId: 901, free: true },
      { id: 'free_ig_likes', name: '❤️ Instagram like ( bepul )', price: 0, min: 20, max: 20, hint: HINT_IG_POST, apiId: 902, free: true },
      { id: 'free_tt_views', name: "👁 TikTok ko'rish ( bepul )", price: 0, min: 200, max: 200, hint: HINT_TT_VIDEO, apiId: 903, free: true },
    ],
  },
];

const serviceIndex = new Map();
const categoryIndex = new Map();

for (const cat of categories) {
  categoryIndex.set(cat.id, cat);
  for (const srv of cat.services) {
    serviceIndex.set(srv.id, {
      ...srv,
      free: Boolean(srv.free || cat.free),
      categoryId: cat.id,
      categoryTitle: cat.title,
      emoji: cat.emoji,
    });
  }
}

function getCategory(id) {
  return categoryIndex.get(id) || null;
}

function getService(id) {
  return serviceIndex.get(id) || null;
}

function allServices() {
  return [...serviceIndex.values()];
}

/** 1000 dona narxidan miqdorga qarab yakuniy summani hisoblaydi */
function calcPrice(service, quantity) {
  if (service.free) return 0;
  return Math.round((Number(service.price) * Number(quantity)) / 1000);
}

module.exports = { categories, getCategory, getService, allServices, calcPrice };
