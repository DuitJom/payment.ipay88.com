# DuitJom: OTP email melalui Cloudflare Worker dan Mailjet

Modul `otp-worker.js` menggantikan pengendali OTP lama, mengesahkan keputusan Turnstile dan Mailjet, serta mengeluarkan sesi server selepas OTP sah. Frontend dalam PR yang sama menggunakan kontrak baharu ini. Kod dan ujian telah disediakan; pemasangan Cloudflare, secret sebenar dan penghantaran ke inbox belum disahkan.

## 1. Pasang backend dahulu

1. Gunakan Worker sedia ada yang melayani `https://e-kyc.duitjom.my`. Tambah fail `otp-worker.js` sebagai modul. Jangan menggantikan keseluruhan Worker yang mempunyai API pelanggan/pembayaran lain dengan entry point standalone ini.
2. Tambah atau kekalkan binding D1 bernama `AUTH_DB`. Jalankan [`schema.sql`](./schema.sql) pada database tersebut. Ia menambah jadual `email_*`; jadual lama `auth_challenges` kekal. Gunakan database production yang betul, bukan database ujian.
3. Masukkan tetapan di bawah. Secret mesti berada dalam Cloudflare Worker, bukan frontend, GitHub atau mesej chat.

| Nama | Jenis | Nilai / kegunaan |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Secret untuk widget yang sitekey-nya digunakan dalam `index.html` |
| `MJ_APIKEY_PUBLIC` | Secret | Mailjet API Key akaun/subakaun penghantaran |
| `MJ_APIKEY_PRIVATE` | Secret | Mailjet Secret Key pasangan API Key tersebut |
| `OTP_PEPPER` | Secret | Nilai rawak sekurang-kurangnya 32 aksara; kekalkan selepas deployment |
| `MAIL_FROM_EMAIL` | Variable | Alamat penghantar yang telah disahkan pada akaun Mailjet yang sama |
| `MAIL_FROM_NAME` | Variable | `DuitJom` |
| `ALLOWED_ORIGINS` | Variable | `https://www.duitjom.my,https://duitjom.my` |
| `TURNSTILE_ACTION` | Variable | `auth` |
| `SESSION_TTL_SECONDS` | Variable | `86400` — sesi 24 jam |
| `WELCOME_EMAIL_ENABLED` | Variable | `false` dahulu; `true` untuk email selamat datang selepas OTP sah |

`MAIL_FROM_EMAIL = noreply@duitjom.my` dalam fail contoh hanya contoh: gunakan alamat yang benar-benar telah disahkan. Alias `TURNSTILE_SECRET`, `MAILJET_API_KEY`, `MAILJET_SECRET_KEY` dan `MAILJET_FROM_EMAIL` juga diterima oleh modul. Gunakan satu set nama yang konsisten.

4. Import pengendali dalam fail utama Worker. Laluan relatif bergantung pada tempat fail modul diletakkan:

```js
import { handleEmailAuth, drainWelcomeEmails, cleanupEmailAuth } from "./otp-worker.js";
```

Masukkan baris berikut pada permulaan fungsi `fetch(request, env, ctx)`, **sebelum** pengendali OPTIONS/CORS dan Turnstile global yang lama:

```js
const emailAuthResponse = await handleEmailAuth(request, env, ctx);
if (emailAuthResponse) return emailAuthResponse;
// Teruskan kod routing sedia ada untuk API lain di bawah ini.
```

Buang dua blok `/api/send-otp` dan `/api/verify-otp` lama yang digantikan. Modul mengembalikan `null` untuk laluan lain. Satu permintaan OTP mesti melalui Siteverify sekali sahaja; token yang sudah disahkan tidak boleh disahkan semula oleh middleware lama. Kekalkan pengendali dan perlindungan API lain.

5. Jika menggunakan email selamat datang atau pembersihan automatik, tambah kerja ini dalam pengendali `scheduled` sedia ada dan gabungkan cron setiap lima minit dengan jadual sedia ada:

```js
ctx.waitUntil(Promise.all([drainWelcomeEmails(env), cleanupEmailAuth(env)]));
```

6. Deploy Worker yang telah digabungkan, kemudian deploy frontend PR ini. Frontend baharu memerlukan `challengeId`, `/api/session` dan `/api/logout`; deploy frontend sebelum backend siap boleh menyebabkan login gagal.

[`wrangler.example.toml`](./wrangler.example.toml) menunjukkan binding dan nama tetapan. Ia tiada route production dan mempunyai UUID D1 placeholder. Gabungkan tetapan dengan konfigurasi Worker sebenar; jangan deploy contoh tanpa menukar nama Worker/database dan menyemak route. Potongan Worker asal tidak menunjukkan entry point, helper atau konfigurasi penuh, jadi fail itu belum boleh digantikan secara automatik dengan selamat.

## 2. Cari punca 403 Turnstile

Sitekey aktif dalam `index.html` ialah `0x4AAAAAAFDZ5bKGW2izQzbZ`, dengan `data-action="auth"`. Secret mesti datang daripada widget yang sama. Benarkan kedua-dua hostname portal dalam tetapan widget.

| Pemeriksaan | Pembetulan |
| --- | --- |
| JSON frontend tidak mempunyai `turnstileToken` | Hantar `{ email, turnstileToken }`. Modul menghantar nilai itu sebagai `response` kepada Siteverify. |
| Secret hilang / salah / pasangan sitekey berbeza | Semak secret widget dalam deployment production. Modul memulangkan `503 TURNSTILE_CONFIG` untuk penolakan secret oleh Siteverify. |
| Token luput atau digunakan semula | Dapatkan token baharu setiap permintaan. Frontend reset widget selepas cubaan penghantaran. |
| `hostname` atau `action` tidak sepadan | Hostname mesti hostname portal dalam `Origin`, bukan `e-kyc.duitjom.my`; action mesti `auth`. |
| Test sitekey digunakan dengan production secret | Gunakan pasangan test untuk ujian sahaja dan pasangan production untuk portal sebenar. |
| Respons 403 ialah HTML, bukan JSON | Semak Cloudflare Security Events untuk WAF/challenge pada API. Laraskan rule API yang berkaitan sambil mengekalkan pengesahan server. |
| Preflight / cookie disekat CORS | Pengendali baharu mesti mengendalikan OPTIONS dahulu: origin tepat dan `Access-Control-Allow-Credentials: true`; elakkan `*` untuk permintaan bercredential. |

Token Turnstile sah lima minit dan hanya boleh disahkan sekali. Log `turnstile-rejected` memaparkan `errorCodes`, hostname dan action tanpa token atau secret. Ini membezakan penolakan token daripada salah konfigurasi. Panduan rasmi: [Cloudflare Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

Had permintaan dipulangkan sebagai **429**, bukannya 403. Had dalam modul menggunakan bucket jam tetap UTC:

| Had | Cara dikira |
| --- | --- |
| 5 permintaan / email / jam | Selepas Turnstile sah; cubaan cooldown dan kegagalan Mailjet juga menggunakan kuota |
| 30 permintaan hantar / IP / jam | Sebelum Siteverify; cubaan token tidak sah juga menggunakan kuota |
| 60 saat antara permintaan diterima / email | Dikuatkuasakan oleh D1 selain countdown frontend; kegagalan Mailjet tidak mengunci cooldown ini |
| 150 permintaan sah format verify / IP / jam | Melindungi endpoint verify |
| 5 percubaan / OTP | Dikira secara atomik; kod luput selepas 300 saat dan hanya boleh digunakan sekali |

IP yang dikongsi ramai pelanggan boleh mencapai had IP. Ubah had hanya selepas menyemak trafik sebenar. Pepper yang ditukar membatalkan OTP sedia ada dan menukar bucket rate limit.

## 3. Sahkan penghantaran Mailjet

Modul menggunakan Send API v3.1 dengan HTTP Basic Auth dan menetapkan `SandboxMode: false`. `SandboxMode: true` hanya menguji payload dan tidak menghantar email: [Mailjet Sandbox Mode](https://dev.mailjet.com/docs/email-api/send-api-v31/sandbox.mode).

`success: true` hanya diberikan apabila HTTP berjaya, `Messages[0].Status === "success"` dan penerima mempunyai `MessageUUID` atau `MessageID`. HTTP 200 sahaja tidak mencukupi. Respons `Status: "error"`, HTTP 401/403 atau metadata kosong menjadi 502; OTP itu ditandakan gagal dan tidak boleh disahkan. Rujukan: [Mailjet Send API](https://dev.mailjet.com/docs/email-api/send-api-v31/send-basic-email).

1. Pastikan API Key/Secret Key betul dan alamat `From` disahkan pada akaun/subakaun yang menggunakan key itu.
2. Semak log Worker menggunakan `requestId` dari respons. Event `mailjet-accepted` mengandungi ID mesej; event `mailjet-rejected` mengandungi status HTTP dan kod ralat provider.
3. Cari mesej dalam sejarah/statistik Mailjet akaun yang sama. Semak sama ada masih queued, sent, bounced atau blocked. Semak peti masuk dan Spam penerima. **Accepted oleh API belum membuktikan email sampai ke inbox.** [Penjelasan status Mailjet](https://documentation.mailjet.com/hc/en-us/articles/360048398994-Email-statuses-all-metrics-explained).
4. Sahkan SPF/DKIM domain melalui nilai DNS yang diberikan Mailjet. Jika domain sudah menggunakan provider lain, gabungkan keperluan SPF dalam satu rekod SPF, bukannya menambah rekod SPF kedua. Rujukan: [SPF/DKIM Mailjet](https://dev.mailjet.com/docs/email-api/senders-domains/spf-dkim-validation).

Frontend memaparkan “Permintaan email OTP diterima” dan tidak mendakwa email sudah tiba. CI/Vercel/SonarCloud yang hijau tidak mengesahkan sender, secret production atau inbox pelanggan.

## 4. Kontrak frontend dan sesi

| Endpoint | Permintaan | Kejayaan |
| --- | --- | --- |
| `POST /api/send-otp` | `{ email, turnstileToken }` | `{ success: true, challengeId, delivery: "accepted", expiresIn: 300, resendAfter: 60, requestId }` |
| `POST /api/verify-otp` | `{ email, otp, challengeId }` | `{ success: true, user: { email }, expiresAt, requestId }` dan cookie HttpOnly |
| `GET /api/session` | Cookie sesi | `{ success: true, user: { email }, expiresAt, requestId }` atau 401 |
| `POST /api/logout` | `{ challengeId }` dan cookie jika ada | Membatalkan sesi/aliran berkenaan dan memadam cookie |

`expiresAt` ialah milisaat epoch. Semua permintaan frontend menggunakan `credentials: "include"`. Worker menetapkan cookie `__Host-duitjom_session` dengan `Secure`, `HttpOnly`, `SameSite=Lax` dan `Path=/`; token raw tidak dipulangkan dalam JSON atau disimpan di localStorage.

Frontend mengesahkan cookie melalui `/api/session` selepas verify, semasa reload dan sebelum Teruskan. Countdown 60 saat, kotak enam digit, paste kod, BM/English/中文 dan fallback apabila localStorage disekat kekal berfungsi. `duitjom_session` hanya cache paparan; ia tidak membuka Teruskan tanpa pengesahan server. Cookie disekat oleh browser akan menghasilkan ralat sesi.

Portal HTTPS `duitjom.my` dan API HTTPS `e-kyc.duitjom.my` berada dalam site yang sama. Preview Vercel berada pada site lain dan tidak dibenarkan oleh konfigurasi production ini. Uji OTP sebenar pada domain production atau domain staging yang dikonfigurasi dengan sengaja; kejayaan build preview tidak membuktikan cookie production.

## 5. Perlindungan kod dan API pelanggan

Kod asal menggunakan operasi berasingan untuk menambah percubaan dan consume OTP. Permintaan serentak boleh melepasi semakan awal. Kod baharu menggunakan UPDATE bersyarat dengan RETURNING dan batch transaksi: maksimum lima percubaan, sekali consume dan satu sesi untuk pengesahan serentak. Logout membatalkan challenge supaya verify yang masih berjalan tidak menghidupkan semula sesi.

OTP dijana dengan `crypto.getRandomValues` dan rejection sampling. D1 menyimpan HMAC-SHA256 yang mengikat challenge ID, email dan OTP dengan pepper. Perbandingan menggunakan `crypto.subtle.verify`, termasuk operasi dummy bagi rekod yang tiada. Ini mengelakkan perbandingan string hash dalam kod aplikasi; ia tidak menjadikan keseluruhan permintaan HTTP kebal daripada perbezaan masa.

Kod salah, luput, habis percubaan atau telah digunakan menerima `OTP_INVALID` yang sama. Aliran signup/signin tidak menyemak “akaun wujud” untuk memberikan mesej berbeza. JSON dibataskan kepada 8 KiB; OTP tepat enam digit; kuota D1 atomik; log tidak menyimpan OTP, cookie, secret atau alamat email/IP raw.

**API yang menyimpan atau memproses data pelanggan juga mesti mengesahkan sesi pada server.** Import helper berikut ke pengendali API tersebut; tangkap ralat `status === 401` dan pulangkan respons 401 dengan CORS yang sama:

```js
import { requireEmailSession } from "./otp-worker.js";
// Dalam pengendali API pelanggan, sebelum membaca/menulis data:
const { email } = await requireEmailSession(request, env);
// Gunakan email yang disahkan ini; jangan mempercayai email/userId dari body sahaja.
```

Google kekal menggunakan Firebase SDK. Cookie modul ini hanya untuk OTP email. API yang turut menerima pelanggan Google perlu mengesahkan Firebase ID token secara berasingan; cache localStorage atau penukaran UI bukan bukti authorization. API lain belum diubah kerana kod Worker penuh tidak diberikan.

## 6. Email selamat datang dan email transaksi lain

Tetapkan `WELCOME_EMAIL_ENABLED=true` selepas OTP sebenar disahkan. Selepas email disahkan, D1 menyimpan profil email minimum dan satu tugas welcome bagi setiap email. Worker mencuba penghantaran selepas verify; cron boleh menyambung tugas tertangguh, maksimum tiga percubaan. Kegagalan welcome tidak membatalkan login. Ini queue dengan kemungkinan penghantaran berulang jika Worker terhenti selepas Mailjet menerima mesej tetapi sebelum status D1 dikemas kini; bukan jaminan exactly-once.

`sendTransactionalEmail(env, email, { Subject, TextPart, HTMLPart })` juga dieksport untuk dipanggil **dari kod server yang dibenarkan**, contohnya notifikasi pelanggan. Tiada endpoint umum untuk menghantar kandungan/alamat sewenang-wenangnya. Rekod profil ini bukan akaun Firebase dan bukan profil E-KYC lengkap.

## 7. Ujian automatik dan ujian sebenar

Dengan Node.js 24 dari root repo:

```sh
node --test workers/email-auth/otp-worker.test.js
node --experimental-vm-modules --test tests/auth-email-flow.test.cjs
```

15 ujian backend dan 5 ujian gabungan lulus. SQL/transaction dijalankan pada SQLite sebenar dan HMAC/cookie/session menggunakan kod Worker sebenar. Pelayar/Firebase serta respons Turnstile/Mailjet disimulasikan; tiada email sebenar dihantar oleh ujian ini.

Selepas deployment backend dan frontend, jalankan aliran sebenar ini menggunakan email ujian yang anda kawal:

1. Buka `https://www.duitjom.my` dan pilih login email. Isi email, lengkapkan Turnstile dan tekan **Minta Kod OTP**. Network mesti menunjukkan JSON 200 dengan `delivery: "accepted"`, `challengeId` dan `requestId`; countdown menjadi 60 saat.
2. Padankan `requestId` dengan log Worker dan ID mesej Mailjet. Pastikan email sebenar tiba. Jangan menyalin OTP, cookie atau secret ke log/chat.
3. Isi kod salah sekali: mesti gagal. Isi kod sebenar sebelum lima minit: verify 200, cookie HttpOnly tersimpan dan `/api/session` 200. Butang **Teruskan** mesti kelihatan dan membuka borang pelanggan.
4. Reload: sesi server dipulihkan. Logout: `/api/session` menjadi 401. OTP yang sudah digunakan mesti ditolak. Sesi localStorage yang direka sendiri tidak membuka Teruskan.
5. Minta semula selepas 60 saat dengan token Turnstile baharu; kod terdahulu diganti. Uji tamat tempoh dan lima percubaan salah pada email ujian lain dengan menjaga kuota.
6. Jika gagal, simpan hanya HTTP status, `code`, `requestId` dan ID mesej untuk diagnosis. 403 JSON Turnstile, 403 HTML WAF, 429 kuota, 502 Mailjet dan 503 konfigurasi memerlukan pembetulan berbeza.

Build Cloudflare Worker yang merah dalam GitHub juga boleh berpunca daripada entry point, nama Worker, binding atau konfigurasi CI. Semak log build bagi deployment yang tepat; itu tidak membuktikan punca 403 ketika pelanggan meminta OTP.
