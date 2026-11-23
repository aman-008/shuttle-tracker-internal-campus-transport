'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BusFront, LockKeyhole, Mail, Route, UserRound } from 'lucide-react'
import { errorMessage, signIn, signUp } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const registering = mode === 'register'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (registering && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const user = registering
        ? await signUp({ name: name.trim(), email: email.trim().toLowerCase(), password })
        : await signIn(email.trim().toLowerCase(), password)
      setUser(user)
      router.replace(user.role === 'admin' ? '/admin/dashboard' : '/dashboard')
    } catch (caught) {
      setError(errorMessage(caught, 'Could not authenticate. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-layout">
    <section className="auth-story">
      <Link href="/" className="wordmark"><span className="wordmark-icon"><Route size={19} /></span> Shuttle<span>Tracker</span></Link>
      <div className="auth-story-content">
        <div className="eyebrow"><span className="status-dot" /> CAMPUS TRANSIT, CONNECTED</div>
        <h1>Your next<br />ride is <span>closer.</span></h1>
        <p>Routes, schedules, and shuttle updates for a calmer campus commute.</p>
        <div className="auth-story-note"><span className="story-bus"><BusFront size={17} /></span><span><strong>One campus. One clear view.</strong><small>Student and transport operations workspaces.</small></span></div>
        <div className="auth-decoration" aria-hidden="true"><i /><i /><i /><i /><svg viewBox="0 0 480 150"><path d="M-20 130C74 110 67 22 161 32s110 113 205 89 73-64 132-93" /></svg></div>
      </div>
      <span className="auth-story-footer">Lovely Professional University · Campus transportation</span>
    </section>
    <section className="auth-panel">
      <Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to home</Link>
      <div className="auth-box">
        <span className="auth-icon"><LockKeyhole size={18} /></span>
        <p className="eyebrow">{registering ? 'GET STARTED' : 'WELCOME BACK'}</p>
        <h2>{registering ? 'Create your account' : 'Sign in to Shuttle Tracker'}</h2>
        <p className="auth-description">{registering ? 'Your campus commute, a little more predictable.' : 'Pick up right where your campus day takes you.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {registering && <label className="form-field"><span>Full name</span><div className="input-wrap"><UserRound size={16} /><input autoComplete="name" name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" minLength={2} maxLength={100} required /></div></label>}
          <label className="form-field"><span>Email address</span><div className="input-wrap"><Mail size={16} /><input autoComplete="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu" maxLength={254} required /></div></label>
          <label className="form-field"><span>Password</span><div className="input-wrap"><LockKeyhole size={16} /><input autoComplete={registering ? 'new-password' : 'current-password'} name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={registering ? 'At least 8 characters' : 'Enter your password'} minLength={8} required /></div></label>
          {registering && <label className="form-field"><span>Confirm password</span><div className="input-wrap"><LockKeyhole size={16} /><input autoComplete="new-password" name="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" minLength={8} required /></div></label>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button--primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : registering ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button>
        </form>
        <p className="auth-switch">{registering ? 'Already have an account?' : 'New to Shuttle Tracker?'} <Link href={registering ? '/login' : '/register'}>{registering ? 'Sign in' : 'Create an account'}</Link></p>
        <p className="auth-privacy">Your session is protected with a secure HttpOnly cookie. Session credentials are never stored in browser storage.</p>
      </div>
    </section>
  </main>
}
