import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase.js'

// undefined = loading, null = signed out, object = signed in
export function useAuth() {
  const [user, setUser] = useState(undefined)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  return user
}
