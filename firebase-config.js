// Firebase Config - Format CDN (dimuat terus oleh browser, tiada bundler diperlukan)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  updateProfile,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  multiFactor,
  TotpMultiFactorGenerator
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyCKb-QOYSTP0scv0UXmraluMe3xFtfIH_0",
  authDomain: "duitjom-sign-up-in.firebaseapp.com",
  projectId: "duitjom-sign-up-in",
  storageBucket: "duitjom-sign-up-in.firebasestorage.app",
  messagingSenderId: "246834525616",
  appId: "1:246834525616:web:a8429bda0166e6e03c1275",
  measurementId: "G-T52Q57SJC4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Firebase browser persistence tidak tersedia:", error);
});
const db = getFirestore(app);

// Inisialisasi Messaging secara selamat menggunakan isSupported()
let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
    window.duitjomMessaging = messaging;
  } else {
    console.log("FCM tidak disokong pada pelayar ini (cth: mod Incognito atau Safari lama).");
  }
}).catch((err) => console.error("Ralat menyemak sokongan FCM:", err));

const VAPID_KEY = "BORAlMubbD_J0GIRGyX9DK4fX7lnjdUHFGmKzpOFlbeKou6hELQX1xzgWhRTnqI6rvlxj1xpIkBXWt5cohDmilc";

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

async function getNotificationToken() {
  try {
    if (!messaging) {
      console.log("FCM tidak sedia atau tidak disokong pada pelayar ini.");
      return null;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        console.log("FCM Token Pengguna:", currentToken);
        return currentToken;
      } else {
        console.log("Tiada token didapati. Sila pastikan Service Worker didaftarkan.");
      }
    } else {
      console.log("Kebenaran notifikasi ditolak oleh pengguna.");
    }
  } catch (err) {
    console.error("Ralat mendapatkan token notifikasi:", err);
  }
  return null;
}

window.duitjomFirebaseAuth = auth;
window.duitjomFirebaseDb = db;
window.getNotificationToken = getNotificationToken;

window.firebaseAuth = {
  GoogleAuthProvider,
  googleProvider,
  githubProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  updateProfile,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  multiFactor,
  TotpMultiFactorGenerator
};

export {
  app,
  auth,
  authPersistenceReady,
  db,
  messaging,
  VAPID_KEY,
  getNotificationToken,
  firebaseConfig,
  githubProvider,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  updateProfile,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
};
