
"use client"

import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useState, useEffect } from 'react'

export default function Home() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
    })
    return () => unsubscribe()
  }, [])

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error('Login gagal:', error)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <>
      {user ? (
        <button onClick={handleLogout}>Log Keluar</button>
      ) : (
        <button onClick={handleLogin}>Log Masuk</button>
      )}
    </>
  )
}
