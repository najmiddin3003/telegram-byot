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

Unikal-summa orqali avtomatik to'lov aniqlash uchun Redis kerak (ixtiyoriy,
lekin tavsiya qilinadi):

```bash
docker compose up -d redis
```

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
| `REDIS_URL` | *(ixtiyoriy)* Render Redis / Upstash kabi tashqi Redis manzili — bo'lmasa avtomatik to'lov aniqlash ishlamaydi, qolgani ishlayveradi |
| `PAYMENT_WEBHOOK_SECRET` | `/webhook/payment` uchun maxfiy token |
| `SMM_API_URL`, `SMM_API_KEY` | TopSMM (yoki boshqa panel) — bo'sh qoldirsangiz buyurtmalar qo'lda bajariladi |

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

### Avtomatik bajarish (tashqi SMM panel, masalan TopSMM)

`SMM_API_URL` va `SMM_API_KEY` ni to'ldirsangiz buyurtmalar avtomatik
provayderga yuboriladi (standart SMM Panel API v2 — [TopSMM](https://topsmm.uz)
ham aynan shu formatda ishlaydi: `POST /api/v2` ga `key`, `action`, `service`,
`link`, `quantity`). Bo'sh qoldirsangiz — adminga xabar boradi va u qo'lda
bajaradi.

```env
SMM_API_URL=https://topsmm.uz/api/v2
SMM_API_KEY=<TopSMM hisobingizdagi API kalit>
```

Xizmatdagi `apiId` maydonini provayderdagi (TopSMM'dagi) haqiqiy service ID
bilan almashtiring — bu ID'larni `action=services` so'rovi (yoki TopSMM
saytidagi "Mavjud xizmatlar" bo'limi) orqali bilib olasiz.

## 💳 To'lovlarni avtomatik aniqlash (unikal summa + webhook)

Karta orqali qilingan o'tkazmada kim qancha to'laganini avtomatik bilib
bo'lmaydi — faqat summa ko'rinadi. Shuning uchun bot har bir to'lov so'roviga
**unikal summa** beradi: foydalanuvchi so'ragan summaga (masalan 23 000)
tasodifiy 2 xonali raqam qo'shiladi (masalan **23 034**) va aynan shu summani
o'tkazish so'raladi.

- Bu unikal summa **Redis**'da 15 daqiqa (`UNIQUE_AMOUNT_TTL_SEC`) saqlanadi:
  `pending:amount:23034 -> { userId, baseAmount: 23000, kind: "topup" }`.
- 15 daqiqadan keyin summa avtomatik "bo'shaydi" (Redis TTL).
- Karta hisobingizga aynan shu summa tushganda, tasdiqlash uchun 3 ta yo'ldan
  birini tanlashingiz mumkin (pastda) — mos yozuv topilsa foydalanuvchi
  hisobi **avtomatik** to'ldiriladi (yoki to'g'ridan-to'g'ri buyurtma
  yaratiladi) va unga xabar ketadi.

### 🥇 Eng oson yo'l — telefoningizdagi SMS/notification'ni webhook'ga ulash (demo)

Bankdan yoki Click/Payme/Uzum kabi ilovadan kelgan xabarni avtomatik serverga
yuboradigan ilova (masalan skrinshotdagi "SMS → URL" ilovasi) orqali hech
qanday to'lov tizimisiz ham to'liq avtomatlashtirish mumkin:

1. Play Market'dan shunday ilovani (SMS'ni yoki notification'ni URL'ga
   yuboruvchi) o'rnating. Ikki xil manba bor, ikkalasini ham qo'shishingiz
   mumkin:
   - **SMS** — agar bank sizga oddiy SMS yuborsa (ko'pchilik bank kartalari
     shunday: Humo, Uzcard, Ipoteka bank, Kapitalbank va h.k.).
   - **Notification (bildirishnoma)** — Click, Payme, Uzum Bank kabi
     ilovalar ko'pincha SMS emas, balki telefon bildirishnomasi (push
     notification) yuboradi. Shunday hollarda "SMS forwarder" o'rniga
     **"Notification forwarder"** turidagi ilova kerak bo'ladi — u xuddi
     shu tamoyilda ishlaydi, faqat SMS o'rniga bildirishnoma matnini oladi
     va yuboradi. Qaysi ilova bo'lishidan qat'i nazar, natijada bizga xom
     matn (`text`) kelsa — bot uni bir xil tarzda qayta ishlaydi.
2. Ilovada aynan quyidagicha to'ldiring:

   | Maydon | Qiymat |
   |---|---|
   | Tip so'rovi | **POST** |
   | URL | `https://sizning-domen.com/webhooks/sms` |
   | Body turi | **JSON** |
   | Body | `{ "secretKey": "PAYMENT_WEBHOOK_SECRET_QIYMATI", "text": "{msg}" }` |

   (`{msg}` — ilovaning o'zidagi maxsus belgi, u kelgan SMS/bildirishnoma
   matnini shu joyga qo'yib yuboradi — ekranga tegmang, xuddi shunday
   qoldiring)

3. `.env` faylida `PAYMENT_WEBHOOK_SECRET` ni ilovadagi `secretKey` bilan
   **bir xil** qilib qo'ying.
4. Tayyor! Endi SMS/bildirishnoma kelishi bilan:
   - ilova uning matnini `/webhooks/sms` ga yuboradi (`text` maydonida),
   - bot matndan summani o'zi ajratib oladi,
   - topilgan raqam Redis'dagi kutilayotgan to'lovlar bilan solishtiriladi,
   - mos kelsa — foydalanuvchi hisobi **shu zahoti** avtomatik to'ldiriladi.

#### Turli bank/ilovalarning matni har xil — shunga qaramay ishlaydi

Humo/Uzcard bank SMS'i, Click va Payme bildirishnomasi, Uzum Bank xabari —
hammasi boshqacha yozilgan bo'ladi (so'z tartibi, valyuta belgisining joyi
har xil). Shuning uchun har bir bank/ilova uchun alohida shablon yozish
o'rniga, `extractAmountFromSms()` (`src/services/paymentService.js`)
**universal qoida** bilan ishlaydi: matnda raqam bilan valyuta belgisi
(`so'm` / `сум` / `сўм` / `UZS`) qanday tartibda kelishidan qat'i nazar,
ularning juftligini qidiradi. Masalan, quyidagi xabarlarning barchasidan
to'g'ri summa topiladi:

| Kimdan (misol matn) | `text` maydonida keladigan matn | Bot topgan summa |
|---|---|---|
| Bank (Humo/Uzcard) | `Humo*9939 kartangizga 23 034.00 so'm kirim qilindi. Qoldiq: 150 000.00 so'm` | `23034` |
| Bank (oddiy SMS) | `9860196618453993 kartaga 23034 som keldi` | `23034` |
| Click | `Click: 23,034 UZS to'lov qabul qilindi. ID: 88213712` | `23034` |
| Payme | `Payme: UZS 23 034 miqdorida to'lov hisobingizga tushdi` | `23034` |
| Uzum Bank | `Uzum Bank: Hisobingizga 23034.00 so'm kredit qilindi` | `23034` |
| Pulga aloqasi yo'q SMS | `Sizning bir martalik kodingiz: 482913` | topilmaydi (`null`) — e'tiborsiz qoldiriladi |

> ⚠️ **Muhim nozik joy:** funksiya matndagi BIRINCHI raqam+valyuta juftini
> oladi — bu odatda tranzaksiya summasi bo'ladi (undan keyin ko'pincha
> "Qoldiq: ..." kabi balans yoziladi). Lekin agar SMS aksincha, **pul
> yechilgani** haqida bo'lsa (masalan "15 000 so'm yechib olindi"), bot
> baribir o'sha summani "topilgan" deb hisoblaydi — u pul chiqimi ekanini
> "tushunmaydi". **Bu muammo emas**, chunki xavfsizlik so'zlardan emas,
> **unikal 2 xonali suffiksdan** keladi: bot faqat aynan shu foydalanuvchi
> so'ragan, so'nggi 15 daqiqada yaratilgan, tasodifiy summaga mos kelgan
> holatdagina tasdiqlaydi — boshqa (chiqim) SMS'dagi summa tasodifan xuddi
> shu unikal raqamga to'g'ri kelib qolishi amalda deyarli mumkin emas.

Pul haqida bo'lmagan SMS (OTP, reklama va h.k.) kelsa — bot shunchaki
e'tibor bermaydi (`{"ok":true,"matched":false}` qaytaradi), hech narsa
buzilmaydi.

#### Ilovani ulashdan oldin qo'lda sinab ko'rish

Haqiqiy SMS kelishini kutmasdan, avval quyidagicha `curl` bilan tekshirib
ko'rishingiz mumkin (avval botda "Hisobni to'ldirish" orqali, masalan, 23 000
so'm uchun so'rov yuboring — bot sizga unikal summani, aytaylik `23034`, ko'rsatadi — o'sha
raqamni matn ichiga qo'ying):

```bash
curl -X POST https://sizning-domen.com/webhooks/sms \
  -H "Content-Type: application/json" \
  -d '{
        "secretKey": "PAYMENT_WEBHOOK_SECRET_QIYMATI",
        "text": "Humo*9939 kartangizga 23 034.00 so'"'"'m kirim qilindi. Qoldiq: 150 000.00 so'"'"'m"
      }'
```

Javobda `{"ok":true,"matched":true,...}` chiqsa — demak parsing va
moslashtirish to'g'ri ishlayapti, bot foydalanuvchiga "hisobingiz
to'ldirildi" xabarini yuborgan bo'ladi. `matched:false` chiqsa — yoki
summa noto'g'ri (15 daqiqa o'tib ketgan yoki bot ko'rsatgan unikal
summadan farq qiladi), yoki matndan summa umuman topilmadi (juda g'alati
formatdagi xabar) — bunday holatda admin baribir `/tolov <summa>` orqali
qo'lda tasdiqlashi mumkin.

### 🥈 Boshqa variant — to'lov agregatori (Click, Payme va h.k.)

Agar bank SMS'i o'rniga Click/Payme kabi tizimdan haqiqiy webhook kelsa,
xuddi shunday ishlaydigan, faqat summani to'g'ridan-to'g'ri raqam sifatida
qabul qiladigan endpoint ham bor:

```
POST https://sizning-domen.com/webhook/payment?token=<PAYMENT_WEBHOOK_SECRET>
Content-Type: application/json

{ "amount": 23034 }
```

Javoblar: mos topilsa `{"ok":true,...}`, topilmasa `404
{"ok":false,"error":"no_pending_match"}`, token noto'g'ri bo'lsa `401`.

### 🥉 Hech qanday avtomatika ulanmasa — admin qo'lda tasdiqlaydi

Kartaga pul tushganini SMS/ilova orqali o'zingiz ko'rib, botga shunchaki
yozing:

```
/tolov 23034
```

Bu xuddi webhook kabi ishlaydi — mos kutilayotgan to'lov avtomatik
tasdiqlanadi. Eski "chek rasmi yuborish → admin ✅/❌ tugmasi" usuli ham
ishlayveradi — uchalasi bir-biriga xalaqit bermaydi, xohlagan birini
ishlating (yoki hammasini birga — qaysi biri birinchi bo'lib mos summani
topsa, o'sha ishlaydi).

### To'g'ridan-to'g'ri to'lov (balanssiz, faqat bitta buyurtma uchun)

Buyurtma berishda balans yetmasa, foydalanuvchiga uchta tugma chiqadi:

1. **💰 Hisob to'ldirish** — odatdagidek, umumiy balansni to'ldiradi.
2. **⚡ To'g'ridan-to'g'ri to'lov** — faqat shu buyurtma narxiga teng unikal
   summa beriladi; to'lov tushishi bilan (yuqoridagi 3 usuldan biri orqali)
   o'sha buyurtma **avtomatik** TopSMM'ga yuboriladi, umumiy balansga
   tegilmaydi.
3. **❌ Bekor qilish**.

### Redis'ni ishga tushirish (Docker)

```bash
docker compose up -d redis
```

`.env` faylida:

```env
REDIS_URL=redis://localhost:6379
```

Botning o'zini ham konteynerda ishlatmoqchi bo'lsangiz, `docker-compose.yml`
ichidagi (izohdagi) `bot` xizmatini yoqing — u holda `REDIS_URL` avtomatik
`redis://redis:6379` bo'lishi kerak (Compose tarmog'idagi xizmat nomi).

> ⚠️ Redis ishlamasa ham bot yiqilib qolmaydi — faqat unikal-summa/avtomatik
> tasdiqlash ishlamay qoladi, "chek rasmi → admin tasdig'i" yo'li baribir
> ishlayveradi.

## 🧭 Bot ichidagi navigatsiya (har bir qadamda "⏪ Orqaga")

Buyurtma va to'lov jarayonlarida endi:

- Har bir qadamda **"⏪ Orqaga"** tugmasi bor — oldingi qadamga qaytish
  uchun (masalan miqdordan → havolaga, tasdiqlashdan → miqdorga).
- Yangi qadamga o'tganda **eski xabar avtomatik o'chiriladi** (shu
  jumladan foydalanuvchi yozgan matn/rasm ham) — chat cheksiz ko'payib
  ketmaydi, doim bitta "joriy" ekran ko'rinadi.
- Bu mantiq `src/ui.js` faylida (`send`, `sendClean`, `edit`,
  `resetAndSend`) — yangi qadam qo'shsangiz shu yordamchilardan
  foydalaning.


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
/tolov <summa>      — kartaga tushgan unikal summani qo'lda tasdiqlash
/javob <id> <matn>  — murojaatga javob
/block <id>         — bloklash / blokdan chiqarish
/adminhelp          — buyruqlar ro'yxati
```

## 📁 Struktura

```
src/
├── index.js          # kirish nuqtasi (express + webhook/polling + API + /webhook/payment)
├── bot.js            # bot, middleware, handlerlarni ulash
├── api.js            # hamkorlar uchun ochiq API v2
├── config.js         # .env sozlamalari
├── redis.js          # Redis ulanishi (unikal summa uchun)
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
│   ├── orderService.js    # buyurtma yaratish (bot ham, API ham shundan foydalanadi)
│   ├── provider.js        # tashqi SMM panel API (TopSMM va h.k.)
│   ├── paymentService.js  # unikal summa: yaratish / moslashtirish / draft saqlash
│   └── paymentConfirm.js  # to'lov tasdiqlangach balans/buyurtma bilan ishlash (webhook + /tolov umumiy)
└── handlers/
    ├── start.js  order.js   orders.js  balance.js  account.js
    └── referral.js  api.js  support.js  guide.js  admin.js
```
