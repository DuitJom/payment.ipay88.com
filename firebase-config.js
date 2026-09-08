import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIza...", // Ganti dengan Web API Key sebenar dari Firebase Console
  authDomain: "duitjom-sign-up-in.firebaseapp.com",
  projectId: "duitjom-sign-up-in",
  storageBucket: "duitjom-sign-up-in.firebasestorage.app",
  messagingSenderId: "246834525616",
  appId: "SILA_MASUKKAN_APP_ID_ANDA" // Salin dari Firebase Console
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
