"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function handleLogin() {
    setErrorMessage("");

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login gagal:", error);
      setErrorMessage("Log masuk gagal. Sila cuba lagi.");
    }
  }

  async function handleLogout() {
    setErrorMessage("");

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Log keluar gagal:", error);
      setErrorMessage("Log keluar gagal. Sila cuba lagi.");
    }
  }

  if (loading) {
    return (
      <main>
        <p>Memuatkan...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Firebase Authentication</h1>

      {errorMessage && <p>{errorMessage}</p>}

      {user ? (
        <section>
          <p>Anda telah log masuk.</p>
          <p>Nama: {user.displayName || "Tiada nama"}</p>
          <p>E-mel: {user.email || "Tiada e-mel"}</p>

          <button type="button" onClick={handleLogout}>
            Log Keluar
          </button>
        </section>
      ) : (
        <button type="button" onClick={handleLogin}>
          Log Masuk dengan Google
        </button>
      )}
    </main>
  );
}
