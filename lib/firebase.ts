import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env."AIzaSyCKb-QOYSTP0scv0UXmraluMe3xFtfIH_0",
  authDomain: process.env."duitjom-sign-up-in.firebaseapp.com",
  projectId: process.env."duitjom-sign-up-in",
  storageBucket: process.env."duitjom-sign-up-in.firebasestorage.app",
  messagingSenderId: process.env."246834525616",
  appId: process.env."1:246834525616:web:a8429bda0166e6e03c1275",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
