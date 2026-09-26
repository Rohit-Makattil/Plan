'use client'

import React, { useState } from 'react'
import { Clock, Heart, Globe, ArrowRight, Sparkles, Check, KeyRound, UserPlus, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { POPULAR_TIMEZONES, TimezoneOption } from '@/lib/timezones'

export function LoginScreen({ onToggleMode }: { onToggleMode: () => void }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signErr } = await signIn(email, password)
    if (signErr) {
      setError(signErr.message || 'Invalid login credentials.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-ios-xl p-8 border border-warm-200/80 shadow-soft-lg">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-warm-800 text-white mx-auto flex items-center justify-center shadow-soft mb-4">
            <Clock className="w-8 h-8 text-amber-200" />
          </div>
          <h1 className="text-2xl font-bold font-display text-warm-900 tracking-tight">
            TogetherTime
          </h1>
          <p className="text-sm text-warm-600 mt-1 font-medium italic">
            &ldquo;Make time for each other.&rdquo;
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-600 text-warm-900 text-sm bg-warm-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-600 text-warm-900 text-sm bg-warm-50/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-[0.98] text-white font-semibold text-sm shadow-soft transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Logging in...' : 'Log in'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-8 pt-6 border-t border-warm-200/80 text-center">
          <p className="text-xs text-warm-600">
            Don&apos;t have an account?{' '}
            <button
              onClick={onToggleMode}
              type="button"
              className="font-semibold text-warm-900 hover:underline inline-block ml-1"
            >
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export function SignupScreen({ onToggleMode }: { onToggleMode: () => void }) {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState('India')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleQuickSelect = (c: string, tz: string) => {
    setCountry(c)
    setTimezone(tz)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    setError(null)
    setLoading(true)

    const { error: signErr } = await signUp(email, password, name.trim(), country, timezone)
    if (signErr) {
      setError(signErr.message || 'Failed to create account. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-ios-xl p-8 border border-warm-200/80 shadow-soft-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-warm-800 text-white mx-auto flex items-center justify-center shadow-soft mb-3">
            <Heart className="w-8 h-8 text-rose-300 fill-rose-300" />
          </div>
          <h1 className="text-2xl font-bold font-display text-warm-900 tracking-tight">
            Create Account
          </h1>
          <p className="text-sm text-warm-600 mt-0.5">
            Join TogetherTime and stay connected across time zones.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Rohit or Paridhi"
              className="w-full px-4 py-3 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-600 text-warm-900 text-sm bg-warm-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-600 text-warm-900 text-sm bg-warm-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-600 text-warm-900 text-sm bg-warm-50/50"
            />
          </div>

          {/* Quick Select Buttons */}
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Your Location & Timezone
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => handleQuickSelect('India', 'Asia/Kolkata')}
                className={`p-3 rounded-xl border text-left flex flex-col items-start transition-all ${
                  timezone === 'Asia/Kolkata'
                    ? 'border-warm-700 bg-warm-100 ring-2 ring-warm-600/20'
                    : 'border-warm-200 hover:border-warm-300 bg-warm-50/50'
                }`}
              >
                <span className="text-xl mb-1">🇮🇳</span>
                <span className="text-xs font-bold text-warm-900">India</span>
                <span className="text-[10px] text-warm-600">Asia/Kolkata (IST)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('Netherlands', 'Europe/Amsterdam')}
                className={`p-3 rounded-xl border text-left flex flex-col items-start transition-all ${
                  timezone === 'Europe/Amsterdam'
                    ? 'border-warm-700 bg-warm-100 ring-2 ring-warm-600/20'
                    : 'border-warm-200 hover:border-warm-300 bg-warm-50/50'
                }`}
              >
                <span className="text-xl mb-1">🇳🇱</span>
                <span className="text-xs font-bold text-warm-900">Netherlands</span>
                <span className="text-[10px] text-warm-600">Europe/Amsterdam (CET)</span>
              </button>
            </div>

            {/* Manual dropdown option */}
            <select
              value={timezone}
              onChange={(e) => {
                const opt = POPULAR_TIMEZONES.find((t) => t.value === e.target.value)
                setTimezone(e.target.value)
                if (opt) setCountry(opt.country)
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-warm-200 bg-white text-warm-800 focus:outline-none focus:ring-2 focus:ring-warm-500/20"
            >
              {POPULAR_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.flag} {tz.country} - {tz.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 px-4 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-[0.98] text-white font-semibold text-sm shadow-soft transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating account...' : 'Create account'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-warm-200/80 text-center">
          <p className="text-xs text-warm-600">
            Already have an account?{' '}
            <button
              onClick={onToggleMode}
              type="button"
              className="font-semibold text-warm-900 hover:underline inline-block ml-1"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export function CalendarSetupScreen() {
  const { createCalendar, joinCalendar, profile } = useAuth()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [calendarName, setCalendarName] = useState(
    profile?.name ? `${profile.name}'s Shared Calendar` : 'Together Calendar'
  )
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCode, setSuccessCode] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { calendar, error: createErr } = await createCalendar(calendarName)
    if (createErr) {
      setError(createErr.message || 'Failed to create calendar.')
      setLoading(false)
    } else if (calendar) {
      setSuccessCode(calendar.invite_code)
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) {
      setError('Please enter a valid invite code.')
      return
    }
    setError(null)
    setLoading(true)

    const { success, error: joinErr } = await joinCalendar(inviteCode)
    if (!success) {
      setError(joinErr || 'Could not join calendar. Check invite code.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-ios-xl p-8 border border-warm-200/80 shadow-soft-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 mx-auto flex items-center justify-center shadow-soft-sm mb-3">
            <Users className="w-8 h-8 text-warm-800" />
          </div>
          <h1 className="text-2xl font-bold font-display text-warm-900 tracking-tight">
            Connect With Your Partner
          </h1>
          <p className="text-xs text-warm-600 mt-1">
            Create a private shared calendar or join one with an invite code.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Tab switch */}
        <div className="flex p-1 bg-warm-100 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('create')
              setError(null)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'create' ? 'bg-white text-warm-900 shadow-soft-sm' : 'text-warm-600 hover:text-warm-900'
            }`}
          >
            Create Calendar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('join')
              setError(null)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'join' ? 'bg-white text-warm-900 shadow-soft-sm' : 'text-warm-600 hover:text-warm-900'
            }`}
          >
            Join with Code
          </button>
        </div>

        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
                Calendar Name
              </label>
              <input
                type="text"
                value={calendarName}
                onChange={(e) => setCalendarName(e.target.value)}
                required
                placeholder="e.g. Together Calendar"
                className="w-full px-4 py-3 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-600 text-warm-900 text-sm bg-warm-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-[0.98] text-white font-semibold text-sm shadow-soft transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Creating...' : 'Create Shared Calendar'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                placeholder="e.g. TG-8F42K"
                className="w-full px-4 py-3 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-600 text-warm-900 text-sm uppercase tracking-wider font-mono text-center font-bold bg-warm-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-[0.98] text-white font-semibold text-sm shadow-soft transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Joining...' : 'Join Shared Calendar'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
