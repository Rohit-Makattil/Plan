'use client'

import React, { useState } from 'react'
import {
  User,
  Globe,
  Users,
  Copy,
  Check,
  LogOut,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { POPULAR_TIMEZONES } from '@/lib/timezones'
import { PWAInstallGuide } from './PWAInstallGuide'
import { UserAvatar } from '../ui/UserAvatar'

export function SettingsView() {
  const { profile, partner, calendar, membership, updateProfile, signOut } = useAuth()

  const [name, setName] = useState(profile?.name || '')
  const [country, setCountry] = useState(profile?.country || 'India')
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Kolkata')
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSavedSuccess(false)
    setSaving(true)

    const { error: err } = await updateProfile({
      name: name.trim(),
      country,
      timezone,
    })

    if (err) {
      setError(err.message || 'Failed to update profile.')
    } else {
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    }
    setSaving(false)
  }

  const handleCopyCode = () => {
    if (!calendar?.invite_code) return
    navigator.clipboard.writeText(calendar.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-warm-900 tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-warm-600 mt-1">
          Manage your profile, time zone, and shared calendar connection.
        </p>
      </div>

      {/* 1. Profile Settings */}
      <div className="rounded-ios-lg bg-white border border-warm-200/80 p-5 shadow-soft">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-warm-100 flex items-center justify-center text-warm-800">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-warm-900 font-display">Profile</h2>
            <p className="text-[11px] text-warm-600">Your personal details and home time zone</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 text-warm-900 text-sm bg-warm-50/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Country & Timezone
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setCountry('India')
                  setTimezone('Asia/Kolkata')
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  timezone === 'Asia/Kolkata'
                    ? 'border-warm-700 bg-warm-100 ring-1 ring-warm-600/30'
                    : 'border-warm-200 bg-warm-50/40'
                }`}
              >
                <span className="text-lg">🇮🇳</span>
                <div>
                  <span className="text-xs font-bold text-warm-900 block">India</span>
                  <span className="text-[10px] text-warm-600">Asia/Kolkata (IST)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCountry('Netherlands')
                  setTimezone('Europe/Amsterdam')
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  timezone === 'Europe/Amsterdam'
                    ? 'border-warm-700 bg-warm-100 ring-1 ring-warm-600/30'
                    : 'border-warm-200 bg-warm-50/40'
                }`}
              >
                <span className="text-lg">🇳🇱</span>
                <div>
                  <span className="text-xs font-bold text-warm-900 block">Netherlands</span>
                  <span className="text-[10px] text-warm-600">Europe/Amsterdam</span>
                </div>
              </button>
            </div>

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
            disabled={saving}
            className="py-2.5 px-4 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-95 text-white text-xs font-semibold shadow-soft-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </form>
      </div>

      {/* 2. Shared Calendar & Partner Connection */}
      <div className="rounded-ios-lg bg-white border border-warm-200/80 p-5 shadow-soft space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-warm-100 flex items-center justify-center text-warm-800">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-warm-900 font-display">Shared Calendar</h2>
            <p className="text-[11px] text-warm-600">Your two-person shared calendar connection</p>
          </div>
        </div>

        {calendar ? (
          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-xl bg-warm-50/70 border border-warm-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">
                  Calendar Name
                </span>
                <span className="text-sm font-bold text-warm-900 font-display">
                  {calendar.name}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">
                  Invite Code (Share with Partner)
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-sm bg-white px-2.5 py-1 rounded-lg border border-warm-300 text-warm-900">
                    {calendar.invite_code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    type="button"
                    className="p-1.5 rounded-lg bg-warm-200 hover:bg-warm-300 text-warm-800 transition-colors"
                    title="Copy invite code"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Partner Status */}
            <div className="p-3.5 rounded-xl bg-warm-50/70 border border-warm-200/80">
              <span className="text-[10px] font-bold text-warm-500 uppercase tracking-wider block mb-2">
                Partner Status
              </span>
              {partner ? (
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={partner.name}
                    country={partner.country}
                    size="md"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-warm-900">{partner.name}</h4>
                    <p className="text-[11px] text-warm-600">
                      {partner.country} · {partner.timezone}
                    </p>
                  </div>
                  <span className="ml-auto text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-warm-600">
                    Waiting for partner to join with invite code: <strong>{calendar.invite_code}</strong>
                  </span>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Pending
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-warm-600">No active calendar connected.</p>
        )}
      </div>

      {/* 3. PWA Installation on iPhone */}
      <PWAInstallGuide />

      {/* 4. About & Account */}
      <div className="rounded-ios-lg bg-white border border-warm-200/80 p-5 shadow-soft space-y-4">
        <div>
          <h3 className="text-sm font-bold text-warm-900 font-display">About TogetherTime</h3>
          <p className="text-xs text-warm-600 mt-1 leading-relaxed">
            TogetherTime is a private shared scheduling application designed to keep two people in sync across time zones with real-time updates and seamless availability comparison.
          </p>
        </div>

        <div className="pt-3 border-t border-warm-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-warm-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>End-to-End Row Level Security (RLS)</span>
          </div>

          <button
            onClick={() => signOut()}
            type="button"
            className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
