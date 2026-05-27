import { useState } from 'react'
import { auth, db } from '../firebase.js'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'

export default function AuthModal({ onClose }) {
  const [tab, setTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email || !password) return
    if (tab === 'signup' && !displayName.trim()) return
    setLoading(true)
    setError('')
    try {
      if (tab === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: displayName.trim() })
        await setDoc(doc(db, 'users', cred.user.uid), {
          displayName: displayName.trim(),
          createdAt: new Date().toISOString(),
        })
      }
      onClose()
    } catch (e) {
      setError(friendlyError(e.code))
    } finally {
      setLoading(false)
    }
  }

  const onKey = e => e.key === 'Enter' && submit()

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem' }}>
            {tab === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={onClose}>✕</button>
        </div>

        <div className="auth-tabs">
          <button className={tab === 'signin' ? 'active' : ''} onClick={() => { setTab('signin'); setError('') }}>
            Sign In
          </button>
          <button className={tab === 'signup' ? 'active' : ''} onClick={() => { setTab('signup'); setError('') }}>
            Sign Up
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          {tab === 'signup' && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={onKey}
              autoFocus
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={onKey}
            autoFocus={tab === 'signin'}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={onKey}
          />
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: 20 }}
          disabled={loading || !email || !password || (tab === 'signup' && !displayName.trim())}
          onClick={submit}
        >
          {loading ? '…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </div>
    </div>
  )
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'Email already in use.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Invalid email address.',
  }
  return map[code] ?? 'Something went wrong. Try again.'
}
