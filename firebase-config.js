import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
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
  apiKey: "AIzaSyCKb-QOYSTP0scv0UXmraluMe3xFtfIH_0",
  authDomain: "duitjom-sign-up-in.firebaseapp.com",
  projectId: "duitjom-sign-up-in",
  storageBucket: "duitjom-sign-up-in.firebasestorage.app",
  messagingSenderId: "246834525616",
  appId: "1:246834525616:web:a8429bda0166e6e03c1275",
  measurementId: "G-T52Q57SJC4"
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
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
};

