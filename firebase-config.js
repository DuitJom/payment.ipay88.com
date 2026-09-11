import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
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
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Web configuration boleh berada di frontend. Jangan letak Admin SDK key,
// service account JSON, password atau OAuth secret di dalam fail ini.
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
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// API global ini digunakan oleh partial auth lama (telefon/TOTP/magic link).
window.duitjomFirebaseAuth = auth;
window.duitjomFirebaseDb = db;
window.firebaseAuth = {
  GoogleAuthProvider,
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
  signInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  multiFactor,
  TotpMultiFactorGenerator
};

export {
  app,
  auth,
  db,
  firebaseConfig,
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
