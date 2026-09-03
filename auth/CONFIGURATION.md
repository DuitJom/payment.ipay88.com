# Kerangka log masuk Supabase

Semua kaedah menggunakan klien Supabase yang dikonfigurasi dalam `script.js`.

- `email-magic-link.js`: pautan log masuk tanpa kata laluan.
- `phone-otp.js`: OTP SMS. Aktifkan **Phone provider** dalam Supabase Authentication dan konfigurasi pembekal SMS.
- `totp.js`: daftar serta sahkan MFA TOTP. Ia hanya boleh didaftarkan selepas pengguna sudah log masuk.

Tambahkan URL laman anda (contohnya `https://domain-anda/`) di **Authentication > URL Configuration > Redirect URLs** pada Supabase. Untuk Google, aktifkan provider Google dan tampal OAuth Client ID/Secret di tetapan provider Supabase; tiada Client ID diletakkan dalam kod ini.
