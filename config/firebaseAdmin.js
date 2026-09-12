const admin = require("firebase-admin");

// Menyemak sama ada Firebase Admin sudah di-initialize sebelum ini
if (!admin.apps.length) {
  // Option A: Jika ada Environment Variable (Untuk Server/Deployment)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } 
  // Option B: Menggunakan fail tempatan (Untuk Ujian di Komputer Sendiri)
  else {
    const serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

module.exports = admin;
