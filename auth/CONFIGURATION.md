# Firebase Authentication Configuration

Website ini menggunakan Firebase Web SDK melalui ES modules CDN dan kekal serasi dengan GitHub Pages. Tiada Node.js server atau Firebase Admin SDK diperlukan untuk frontend.

## Firebase Web config yang diperlukan

Isi nilai ini dalam `firebase-config.js` daripada Firebase Console > Project settings > Your apps > Web app:

- `apiKey` — Web API key
- `authDomain` — biasanya `<project-id>.firebaseapp.com`
- `projectId` — Firebase project ID
- `storageBucket` — bucket Firebase Storage
- `messagingSenderId` — Firebase Cloud Messaging sender ID
- `appId` — Web app ID
- `measurementId` — optional, hanya jika Google Analytics digunakan

Firebase Web API key bukan password. Jangan masukkan Firebase Admin SDK private key, service-account JSON, OAuth client secret, password atau token ke frontend.

## Firebase Console checklist

1. Create atau pilih Firebase project.
2. Add Web app dan salin Web config ke `firebase-config.js`.
3. Authentication > Sign-in method: aktifkan Email/Password dan Google.
4. Authentication > Settings > Authorized domains: tambah semua domain sebenar, contohnya:
   - `duitjom.my`
   - `www.duitjom.my` jika digunakan
   - domain GitHub Pages sebenar jika masih digunakan
   - `localhost` untuk ujian tempatan
5. Authentication > Templates: semak email verification dan password reset.
6. Authentication > Sign-in method > Email link: aktifkan passwordless email link jika Magic Link digunakan.
7. Firestore Database: create database dan pilih lokasi yang sesuai.
8. Firestore Rules: gunakan sekurang-kurangnya konsep berikut sebelum menyimpan profile:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId
        && request.auth.token.email_verified == true;
    }
  }
}
```

Password tidak pernah disimpan dalam Firestore. Firebase Auth ialah sumber kebenaran identity; Firestore hanya menyimpan profile/application data pada `users/{uid}`.

## Flow yang tersedia

- Email + Password: register, login, logout.
- Email verification: hantar, hantar semula, reload status `emailVerified`.
- Forgot password: password reset email.
- Google login: popup Firebase; profile disimpan selepas pengguna verified.
- Magic Link: foundation menggunakan `sendSignInLinkToEmail` dan `signInWithEmailLink`; email sementara sahaja disimpan di localStorage untuk melengkapkan link.
- Payment page: dilindungi di UI oleh auth state dan `emailVerified`. Untuk data sebenar, Firestore Rules/backend juga mesti menguatkuasakan pemeriksaan ini.

## Nota GitHub Pages

Pastikan laman dihidangkan melalui HTTPS. Untuk custom domain, domain itu mesti berada dalam Authorized domains Firebase dan URL redirect Magic Link mesti sepadan dengan URL laman yang digunakan.
