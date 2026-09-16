# 🤖 SMM Telegram Bot (JavaScript)

Ijtimoiy tarmoqlar uchun SMM xizmatlari boti. Telegraf + Express + PostgreSQL.
Render.com ga deploy qilishga tayyor.

## 📋 Imkoniyatlar

| Menyu | Nima qiladi |
|---|---|
| 📁 Buyurtma berish | Tarmoq (Telegram/Instagram/Youtube/Tiktok/🎉 Bepul) → xizmat → havola → miqdor → tasdiqlash |
| 📊 Buyurtmalar | Oxirgi 10 ta buyurtma va ularning holati |
| 💰 Hisob to'ldirish | Summa → karta rekvizitlari → chek rasmi → admin tasdig'i |
| 💱 Mening hisobim | ID, balans, buyurtmalar, referallar, kiritgan pullar |
| 🔘 Referal tizimi | `?start=<ID>` havola, har bir referal uchun qat'iy bonus |
| 🔐 Hamkorlik tizimi | **API kirish**: API manzil + kalit yaratish, ma'lumot va qo'llanma |
| ☎️ Murojaat | Adminga xabar, admin javob bera oladi |
| 📚 Qo'llanma | Foydalanish yo'riqnomasi |

Admin uchun: statistika, to'lovlarni tasdiqlash, broadcast, balans boshqaruvi.

## 🚀 Lokalda ishga tushirish

```bash
npm install
cp .env.example .env
```

`.env` faylida kamida shularni to'ldiring:

- `BOT_TOKEN` — [@BotFather](https://t.me/BotFather) dan
- `BOT_USERNAME` — bot username (@ belgisiz)
- `ADMIN_IDS` — sizning Telegram ID (botga `/id` yozib biling)

Keyin:

```bash
npm start
```

`PUBLIC_URL` bo'sh bo'lsa bot **polling** rejimida ishlaydi, ma'lumotlar
`data/db.json` ga yoziladi — lokal test uchun shu yetarli.

## ☁️ Render.com ga deploy

### 1. Kodni GitHub'ga yuklang

```bash
git init
git add .
git commit -m "SMM telegram bot"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### 2. PostgreSQL yarating

Render → **New → PostgreSQL** → nom bering → **Create**.
Yaratilgach **Internal Database URL** ni nusxa oling.

### 3. Web Service yarating

Render → **New → Web Service** → GitHub repongizni tanlang:

| Sozlama | Qiymat |
|---|---|
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

### 4. Environment Variables

| Kalit | Qiymat |
|---|---|
| `BOT_TOKEN` | BotFather tokeni |
| `BOT_USERNAME` | bot username |
| `ADMIN_IDS` | `123456789` (bir nechta bo'lsa vergul bilan) |
| `DATABASE_URL` | 2-qadamdagi Internal Database URL |
| `PUBLIC_URL` | `https://SIZNING-SERVICE.onrender.com` |
| `WEBHOOK_SECRET` | ixtiyoriy maxfiy so'z |
| `CARD_NUMBER` | to'lov kartangiz |
| `CARD_HOLDER` | karta egasi F.I.O |
| `SUPPORT_USERNAME` | admin username (@ belgisiz) |

> `PUBLIC_URL` ni birinchi deploy tugagach kiriting (URL o'shanda ma'lum bo'ladi),
> keyin **Manual Deploy → Deploy latest commit** qiling. Webhook avtomatik o'rnatiladi.

Yoki `render.yaml` orqali: Render → **New → Blueprint** → repo → hammasi avtomatik yaratiladi.

> ⚠️ Render'ning **free** tarifida servis 15 daqiqa harakatsizlikdan keyin uxlaydi.
> Webhook rejimida birinchi xabar botni uyg'otadi (5–30 soniya kechikish).
> Doimiy ishlashi uchun **Starter** ($7/oy) tarifiga o'ting.

## ⚙️ Sozlash

### Xizmatlar va narxlar

[`src/catalog.js`](src/catalog.js) — kategoriyalar, xizmatlar, 1000 dona uchun narx,
min/max miqdor. Yangi xizmat qo'shish uchun massivga bitta obyekt qo'shing.

### Matnlar

[`src/texts.js`](src/texts.js) — barcha o'zbekcha matnlar va tugma nomlari bir joyda.

### Bepul xizmatlar

`🎉 Bepul xizmatlar` kategoriyasidagi xizmatlar narxi `0` va balansdan pul
yechmaydi. `FREE_DAILY_LIMIT` (standart `1`) bir foydalanuvchi kuniga nechta
bepul buyurtma bera olishini belgilaydi.

### Referal

`REFERRAL_BONUS` (standart `100 so'm`) — havola orqali kelgan **har bir yangi
foydalanuvchi uchun** taklif qilganga darhol beriladi. Xohlasangiz
`REFERRAL_PERCENT` ni ham yoqib, referal hisob to'ldirganda foiz bonus
qo'shishingiz mumkin (standart `0` — o'chirilgan).

> ⚠️ Bonus ro'yxatdan o'tish paytida beriladi. Soxta akkauntlar bilan
> suiiste'mol qilinmasligi uchun `REFERRAL_BONUS` ni katta qilmang.

### Avtomatik bajarish (tashqi SMM panel)

`SMM_API_URL` va `SMM_API_KEY` ni to'ldirsangiz buyurtmalar avtomatik
provayderga yuboriladi (standart SMM Panel API v2). Bo'sh qoldirsangiz —
adminga xabar boradi va u qo'lda bajaradi.

Xizmatdagi `apiId` maydonini provayderdagi haqiqiy service ID bilan almashtiring.

## 🔐 Hamkorlik tizimi = sizning API'ingiz

Foydalanuvchi `🔐 Hamkorlik tizimi` → `➕ API kalit yaratish` bosadi va o'z
sayti/botidan buyurtma bera oladi. Manzil `PUBLIC_URL` dan avtomatik yasaladi:

```
https://sizning-domen.com/BOT_USERNAME/api/v2
```

Standart **SMM Panel API v2** formati (POST, form-data):

| Action | Parametrlar | Javob |
|---|---|---|
| `services` | `key` | xizmatlar massivi |
| `balance` | `key` | `{"balance":"12000.00","currency":"UZS"}` |
| `add` | `key, service, link, quantity` | `{"order":123}` |
| `status` | `key, order` (yoki `orders=1,2,3`) | `{"status":"Pending","charge":"1800.00",...}` |

```bash
curl -X POST https://sizning-domen.com/BOT_USERNAME/api/v2 -d "key=KALIT" -d "action=balance"
```

Buyurtma foydalanuvchining **bot balansidan** yechiladi. Xato bo'lsa
`{"error":"..."}` qaytadi.

## 🛠 Admin buyruqlari

```
/admin              — panel (statistika, to'lovlar, broadcast)
/user <id>          — foydalanuvchi ma'lumoti
/qoshish <id> <sum> — balansni o'zgartirish (minus ham bo'ladi)
/javob <id> <matn>  — murojaatga javob
/block <id>         — bloklash / blokdan chiqarish
/adminhelp          — buyruqlar ro'yxati
```

## 📁 Struktura

```
src/
├── index.js          # kirish nuqtasi (express + webhook/polling + API)
├── bot.js            # bot, middleware, handlerlarni ulash
├── api.js            # hamkorlar uchun ochiq API v2
├── config.js         # .env sozlamalari
├── texts.js          # barcha matnlar
├── keyboards.js      # tugmalar
├── catalog.js        # xizmatlar va narxlar
├── steps.js          # qadam registri
├── session.js        # sessiya
├── utils.js          # yordamchi funksiyalar
├── db/
│   ├── index.js      # PostgreSQL yoki JSON tanlash
│   ├── postgres.js
│   └── jsonStore.js
├── services/
│   ├── orderService.js  # buyurtma yaratish (bot ham, API ham shundan foydalanadi)
│   └── provider.js      # tashqi SMM panel API
└── handlers/
    ├── start.js  order.js   orders.js  balance.js  account.js
    └── referral.js  api.js  support.js  guide.js  admin.js
```
