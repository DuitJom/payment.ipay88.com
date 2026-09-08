import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
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

const firebaseConfig = {
  apiKey: "AIza...", // Masukkan API Key sebenar
  authDomain: "duitjom-sign-up-in.firebaseapp.com",
  projectId: "duitjom-sign-up-in",
  storageBucket: "duitjom-sign-up-in.firebasestorage.app",
  messagingSenderId: "246834525616",
  appId: "SILA_MASUKKAN_APP_ID_ANDA" // Masukkan App ID dari Console
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Simpan pada global window supaya skrip auth-ui.js, phone-otp.js, dll. boleh guna
window.duitjomFirebaseAuth = auth;
window.firebaseAuth = {
  GoogleAuthProvider,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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

// Kekalkan export jika ada bahagian skrip berasaskan ES module lain yang memerlukannya
export { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
};
