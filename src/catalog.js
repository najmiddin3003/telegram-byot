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
      { id: 'tg_subs_cheap', name: "👥 Obunachi ( 🌿 Arzon Baza )", price: 3000, min: 500, max: 100.000, hint: HINT_TG_CHANNEL, apiId: 101 },
      { id: 'tg_subs_super', name: "👥 Obunachi ( 🚀 Super Baza )", price: 6000, min: 10, max: 50000, hint: HINT_TG_CHANNEL, apiId: 102 },
      { id: 'tg_reactions', name: 'Reaksiya | Like', price: 5000, min: 50, max: 50000, hint: HINT_TG_POST, apiId: 103 },
      { id: 'tg_story_reactions_good', name: 'Tg hikoya reaktsiyalar (ijobi)', price: 1800, min: 1000, max: 50000, hint: HINT_TG_POST, apiId: 1035 },
      { id: 'tg_story_reactions_bad', name: 'Tg hikoya reaktsiyalar (salbiy)', price: 1800, min: 1000, max: 50000, hint: HINT_TG_POST, apiId: 1036 },
      { id: 'tg_views', name: 'Arzon prasmotr', price: 120, min: 10000, max: 500000, hint: HINT_TG_POST, apiId: 104 },
      { id: 'tg_views_fast', name: 'Super tez prasmotr', price: 214, min: 10000, max: 500000, hint: HINT_TG_POST, apiId: 1041 },
      { id: 'tg_subs_cheap_slow', name: 'Tg arzon obunachi (kafolatsiz, sekin)', price: 9999, min: 10000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 1011 },
      { id: 'tg_subs_cheap_3d', name: 'Tg obunachi (3 kun kafolat, sekin)', price: 2280, min: 1000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 1012 },
      { id: 'tg_subs_cheap_15d_fast', name: 'Tg obunachi (15 kun, tez)', price: 6200, min: 1000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 1013 },
      { id: 'tg_subs_cheap_30d_slow', name: 'Tg obunachi (30 kun, sekin)', price: 6200, min: 1000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 1014 },
      { id: 'tg_subs_cheap_60d_fast', name: 'Tg obunachi (60 kun, tez)', price: 8500, min: 1000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 1015 },
      { id: 'tg_subs_cheap_180d_fast', name: 'Tg obunachi (180 kun, tez)', price: 13800, min: 1000, max: 100000, hint: HINT_TG_CHANNEL, apiId: 1016 },
      { id: 'tg_comments', name: 'Camentariya | Izoh', price: 40000, min: 10, max: 1000, hint: HINT_TG_POST, apiId: 105 },
      { id: 'tg_share', name: '🔄 Repost xizmati', price: 12000, min: 50, max: 20000, hint: HINT_TG_POST, apiId: 106 },
      { id: 'tg_votes', name: "🗳 So'rovnomaga ovoz", price: 8000, min: 50, max: 20000, hint: HINT_TG_POST, apiId: 107 },
      { id: 'tg_premium', name: '⭐️ Premium obunachi', price: 90000, min: 20, max: 5000, hint: HINT_TG_CHANNEL, apiId: 108 },
      { id: 'tg_uz', name: "🇺🇿 O'zbek Xizmatlar", price: 45000, min: 50, max: 10000, hint: HINT_TG_CHANNEL, apiId: 109 },
    ],
  },
  {
    id: 'instagram',
    emoji: '🚀',
    title: 'Instagram',
    services: [
      { id: 'ig_subs_cheap', name: 'Obunachi (Arzon Baza)', price: 10000, min: 100, max: 1.000, hint: HINT_IG_PROFILE, apiId: 201 },
      { id: 'ig_subs_super', name: 'Obunachi (Super Baza)', price: 23000, min: 100, max: 50000, hint: HINT_IG_PROFILE, apiId: 202 },
      { id: 'ig_likes', name: 'Arzon Like', price: 2400, min: 500, max: 50000, hint: HINT_IG_POST, apiId: 203 },
      { id: 'ig_likes_fast', name: 'Super tezkor Like', price: 4700, min: 500, max: 50000, hint: HINT_IG_POST, apiId: 2031 },
      { id: 'ig_likes_30', name: '30 kunlik Like', price: 4800, min: 500, max: 50000, hint: HINT_IG_POST, apiId: 2032 },
      { id: 'ig_likes_90', name: '90 kunlik Like', price: 5200, min: 500, max: 50000, hint: HINT_IG_POST, apiId: 2033 },
      { id: 'ig_likes_lifetime', name: 'Bir umrlik Like', price: 6400, min: 500, max: 50000, hint: HINT_IG_POST, apiId: 2034 },
      { id: 'ig_story_views_cheap', name: "Instagram story ko'rish (eng arzon)", price: 1200, min: 1000, max: 500000, hint: HINT_IG_POST, apiId: 2041 },
      { id: 'ig_story_views_super', name: "Instagram story ko'rish (super)", price: 2300, min: 1000, max: 500000, hint: HINT_IG_POST, apiId: 2042 },
      { id: 'ig_story_views_standard', name: "Instagram story ko'rish (standart)", price: 3800, min: 1000, max: 500000, hint: HINT_IG_POST, apiId: 2043 },
      { id: 'ig_story_views_lake', name: 'Stories lake', price: 6900, min: 1000, max: 500000, hint: HINT_IG_POST, apiId: 2044 },
      { id: 'ig_story_views_30d', name: "Instagram story ko'rish (30 kun davomida)", price: 1365987, min: 1, max: 500000, hint: HINT_IG_POST, apiId: 2045 },
      { id: 'ig_views', name: "Video Ko'rishlar", price: 2000, min: 500, max: 500000, hint: HINT_IG_POST, apiId: 204 },
      { id: 'ig_comments', name: 'Instagram kommentlar (arzon)', price: 9999, min: 100, max: 10000, hint: HINT_IG_POST, apiId: 205 },
      { id: 'ig_comments_good', name: 'Instagram kommentlar (ijobi)', price: 20776, min: 100, max: 10000, hint: HINT_IG_POST, apiId: 2051 },
      { id: 'ig_repost', name: '🔄 Repost xizmati', price: 15000, min: 20, max: 10000, hint: HINT_IG_POST, apiId: 206 },
      { id: 'ig_live_15', name: '📡 Jonli efir ( Live ) — 15 daqiqa', price: 35000, min: 20, max: 5000, hint: HINT_IG_PROFILE, apiId: 207 },
      { id: 'ig_live_60', name: '🔴 Jonli efir ( Live ) — 60 daqiqa', price: 90000, min: 20, max: 5000, hint: HINT_IG_PROFILE, apiId: 208 },
      { id: 'ig_reach', name: "📈 Axvat | 💾 Save | 🚀 Ulashish", price: 9000, min: 100, max: 50000, hint: HINT_IG_POST, apiId: 209 },
      { id: 'ig_uz', name: "🇺🇿 O'zbek Xizmatlar", price: 60000, min: 50, max: 10000, hint: HINT_IG_PROFILE, apiId: 210 },
    ],
  },
  {
    id: 'youtube',
    emoji: '🚀',
    title: 'Youtube',
    services: [
      { id: 'yt_subs', name: '👥 Obunachi ( 🚀 Super Baza )', price: 120000, min: 50, max: 10000, hint: HINT_YT_CHANNEL, apiId: 301 },
      { id: 'yt_likes', name: '❤️ Like Yoqtirishlar', price: 30000, min: 50, max: 20000, hint: HINT_YT_VIDEO, apiId: 302 },
      { id: 'yt_views', name: "👁 Video Ko'rishlar", price: 25000, min: 500, max: 200000, hint: HINT_YT_VIDEO, apiId: 303 },
      { id: 'yt_comments', name: '💬 Camentariya | Izoh', price: 90000, min: 10, max: 500, hint: HINT_YT_VIDEO, apiId: 304 },
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
      { id: 'tt_subs_cheap', name: '👥 Obunachi ( 🌿 Arzon Baza )', price: 18000, min: 100, max: 100000, hint: HINT_TT_PROFILE, apiId: 401 },
      { id: 'tt_subs_super', name: '👥 Obunachi ( 🚀 Super Baza )', price: 30000, min: 100, max: 50000, hint: HINT_TT_PROFILE, apiId: 402 },
      { id: 'tt_likes', name: '❤️ Like Yoqtirishlar', price: 7000, min: 100, max: 50000, hint: HINT_TT_VIDEO, apiId: 403 },
      { id: 'tt_views', name: "👁 Video Ko'rishlar", price: 1200, min: 1000, max: 1000000, hint: HINT_TT_VIDEO, apiId: 404 },
      { id: 'tt_comments', name: '💬 Camentariya | Izoh', price: 50000, min: 10, max: 1000, hint: HINT_TT_VIDEO, apiId: 405 },
      { id: 'tt_share', name: "📈 Save | 🚀 Ulashish", price: 8000, min: 100, max: 50000, hint: HINT_TT_VIDEO, apiId: 406 },
      { id: 'tt_live', name: '🔴 Jonli efir ( Live )', price: 60000, min: 50, max: 5000, hint: HINT_TT_PROFILE, apiId: 407 },
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
