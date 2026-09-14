const admin = require("firebase-admin");

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    console.error(
      "[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT env var is missing. " +
      "Server-side Firebase Admin will not be initialized."
    );
    // Jangan throw error supaya app tidak crash sepenuhnya
  }
}

module.exports = admin.apps.length ? admin : null;