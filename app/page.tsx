import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase' // atau path firebase config anda
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
Langkah 2: 

export default function Home() {
  return (
    <div style={{ padding: '40px' }}>
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
      <Show when="signed-in">
        <UserButton userProfileUrl="https://safe-prawn-2987.accounts.dev/user" />
      </Show>
    </div>
  )
}