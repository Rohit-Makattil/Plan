'use client'

import React, { useState, useEffect } from 'react'
import { X, HeartHandshake, MapPin, AlignLeft, Users, Calendar as CalIcon } from 'lucide-react'
import confetti from 'canvas-confetti'
import { CalendarEvent, EventAudience } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import { useCalendar } from '@/context/CalendarContext'
import {
  localToUtcIso,
  utcToLocalDateAndTimeString,
  formatTimeWithAbbr,
  getCountryFlag,
  IST_TIMEZONE,
  EINDHOVEN_TIMEZONE,
  formatDateInTz,
} from '@/lib/timezones'

interface CreatePlanModalProps {
  isOpen: boolean
  onClose: () => void
  initialPlan?: CalendarEvent | null
  initialDate?: string
  initialStartTime?: string // HH:mm or ISO
  initialEndTime?: string   // HH:mm or ISO
  presetTitle?: string
}

const PLAN_PRESETS = [
  { label: 'Call', icon: '📞' },
  { label: 'Movie night', icon: '🍿' },
  { label: 'Dinner', icon: '🍽️' },
  { label: 'Study together', icon: '📚' },
  { label: 'Gaming', icon: '🎮' },
  { label: 'Birthday', icon: '🎂' },
  { label: 'Trip', icon: '✈️' },
  { label: 'Meet friends', icon: '🥂', audience: 'FRIENDS' as EventAudience },
]

export function CreatePlanModal({
  isOpen,
  onClose,
  initialPlan,
  initialDate,
  initialStartTime,
  initialEndTime,
  presetTitle,
}: CreatePlanModalProps) {
  const { profile, partner } = useAuth()
  const { addEvent, updateEvent } = useCalendar()

  // Selected input timezone: IST (India) or Eindhoven (Netherlands)
  const [selectedTz, setSelectedTz] = useState<string>(() => {
    if (profile?.timezone?.includes('Amsterdam') || profile?.timezone?.includes('Europe')) {
      return EINDHOVEN_TIMEZONE
    }
    return IST_TIMEZONE
  })

  const [title, setTitle] = useState(presetTitle || 'Call')
  const [date, setDate] = useState(() => {
    if (initialDate) return initialDate
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [startTime, setStartTime] = useState('20:30')
  const [endTime, setEndTime] = useState('22:00')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [audience, setAudience] = useState<EventAudience>('TOGETHER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialPlan) {
      setTitle(initialPlan.title)
      const localStart = utcToLocalDateAndTimeString(initialPlan.start_time, selectedTz)
      const localEnd = utcToLocalDateAndTimeString(initialPlan.end_time, selectedTz)
      setDate(localStart.dateStr)
      setStartTime(localStart.timeStr)
      setEndTime(localEnd.timeStr)
      setDescription(initialPlan.description || '')
      setLocation(initialPlan.location || '')
      setAudience(initialPlan.audience)
    } else {
      if (presetTitle) setTitle(presetTitle)
      if (initialDate) setDate(initialDate)

      if (initialStartTime) {
        if (initialStartTime.includes('T')) {
          const loc = utcToLocalDateAndTimeString(initialStartTime, selectedTz)
          setDate(loc.dateStr)
          setStartTime(loc.timeStr)
        } else {
          setStartTime(initialStartTime)
        }
      }

      if (initialEndTime) {
        if (initialEndTime.includes('T')) {
          const loc = utcToLocalDateAndTimeString(initialEndTime, selectedTz)
          setEndTime(loc.timeStr)
        } else {
          setEndTime(initialEndTime)
        }
      }

      setDescription('')
      setLocation('')
      setAudience('TOGETHER')
    }
    setError(null)
  }, [
    initialPlan,
    initialDate,
    initialStartTime,
    initialEndTime,
    presetTitle,
    selectedTz,
    isOpen,
  ])

  // Handle switching between IST and Eindhoven
  const handleTimezoneChange = (newTz: string) => {
    if (newTz === selectedTz) return
    try {
      const currentStartUtc = localToUtcIso(date, startTime, selectedTz)
      const currentEndUtc = localToUtcIso(date, endTime, selectedTz)
      const newStartLocal = utcToLocalDateAndTimeString(currentStartUtc, newTz)
      const newEndLocal = utcToLocalDateAndTimeString(currentEndUtc, newTz)
      setDate(newStartLocal.dateStr)
      setStartTime(newStartLocal.timeStr)
      setEndTime(newEndLocal.timeStr)
    } catch {
      // fallback
    }
    setSelectedTz(newTz)
  }

  if (!isOpen) return null

  // Calculate live preview in both IST and Eindhoven
  let previewIstTime = ''
  let previewIstDate = ''
  let previewEindhovenTime = ''
  let previewEindhovenDate = ''
  try {
    const startIso = localToUtcIso(date, startTime, selectedTz)
    const endIso = localToUtcIso(date, endTime, selectedTz)
    previewIstTime = `${formatTimeWithAbbr(startIso, IST_TIMEZONE)} – ${formatTimeWithAbbr(endIso, IST_TIMEZONE)}`
    previewIstDate = formatDateInTz(startIso, IST_TIMEZONE)

    previewEindhovenTime = `${formatTimeWithAbbr(startIso, EINDHOVEN_TIMEZONE)} – ${formatTimeWithAbbr(endIso, EINDHOVEN_TIMEZONE)}`
    previewEindhovenDate = formatDateInTz(startIso, EINDHOVEN_TIMEZONE)
  } catch {
    // fallback
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please provide a title for the plan.')
      return
    }

    const startUtcIso = localToUtcIso(date, startTime, selectedTz)
    const endUtcIso = localToUtcIso(date, endTime, selectedTz)

    if (new Date(endUtcIso).getTime() <= new Date(startUtcIso).getTime()) {
      setError('End time must be strictly after start time.')
      return
    }

    setLoading(true)

    if (initialPlan) {
      const { error: err } = await updateEvent(initialPlan.id, {
        title,
        description,
        startTime: startUtcIso,
        endTime: endUtcIso,
        location,
        audience,
      })

      if (err) {
        setError(err.message || 'Failed to update plan.')
        setLoading(false)
        return
      }
    } else {
      const { error: err } = await addEvent({
        title,
        description,
        startTime: startUtcIso,
        endTime: endUtcIso,
        location,
        audience,
      })

      if (err) {
        setError(err.message || 'Failed to create plan.')
        setLoading(false)
        return
      }

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#E03131', '#FAB005', '#C9A77F'],
        })
      } catch {}
    }

    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-ios-xl border border-warm-200 shadow-soft-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-100 bg-warm-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-warm-800 text-amber-200 flex items-center justify-center shadow-soft-sm">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-warm-900">
                {initialPlan ? 'Edit Plan' : 'Create Plan'}
              </h2>
              <p className="text-[11px] text-warm-600">
                Make time together across both time zones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-warm-500 hover:text-warm-800 hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Activity
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PLAN_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setTitle(preset.label)
                    if (preset.audience) setAudience(preset.audience)
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    title.toLowerCase() === preset.label.toLowerCase()
                      ? 'border-warm-800 bg-warm-800 text-white shadow-soft-sm'
                      : 'border-warm-200 bg-warm-50/60 text-warm-800 hover:border-warm-300'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Call, Movie night, Dinner..."
              className="w-full px-4 py-2.5 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 text-warm-900 text-sm font-semibold bg-warm-50/30"
            />
          </div>

          {/* Timezone Selector for Planning */}
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Set Time In</span>
              <span className="text-[11px] text-warm-500 font-normal normal-case">
                Select which timezone to enter
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-warm-100/70 rounded-xl border border-warm-200">
              <button
                type="button"
                onClick={() => handleTimezoneChange(IST_TIMEZONE)}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedTz === IST_TIMEZONE
                    ? 'bg-white text-warm-950 shadow-soft-sm border border-warm-200'
                    : 'text-warm-600 hover:text-warm-900'
                }`}
              >
                <span>🇮🇳</span>
                <span>IST (India)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTimezoneChange(EINDHOVEN_TIMEZONE)}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedTz === EINDHOVEN_TIMEZONE
                    ? 'bg-white text-warm-950 shadow-soft-sm border border-warm-200'
                    : 'text-warm-600 hover:text-warm-900'
                }`}
              >
                <span>🇳🇱</span>
                <span>Eindhoven (NL)</span>
              </button>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Date ({selectedTz === IST_TIMEZONE ? 'IST' : 'Eindhoven'})
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 text-warm-900 text-sm bg-warm-50/30"
            />
          </div>

          {/* Start & End Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
                Start ({selectedTz === IST_TIMEZONE ? 'IST' : 'Eindhoven'})
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 text-warm-900 text-sm bg-warm-50/30 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
                End ({selectedTz === IST_TIMEZONE ? 'IST' : 'Eindhoven'})
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 text-warm-900 text-sm bg-warm-50/30 font-mono"
              />
            </div>
          </div>

          {/* Dual Local Time Conversion Preview Box */}
          <div className="p-3.5 rounded-xl bg-warm-100/70 border border-warm-200/80 space-y-2">
            <div className="text-[11px] font-bold text-warm-600 uppercase tracking-wider">
              Calculated Times in Both Locations:
            </div>
            <div className="flex items-center justify-between text-xs bg-white/70 px-3 py-2 rounded-lg border border-warm-200/60">
              <span className="text-warm-800 font-semibold flex items-center gap-1.5">
                <span>🇮🇳</span>
                <span>India (IST):</span>
              </span>
              <div className="text-right">
                <span className="font-bold text-warm-950 font-mono">{previewIstTime}</span>
                {previewIstDate && previewIstDate !== 'Today' && (
                  <span className="text-[10px] text-warm-500 ml-1.5 font-sans">({previewIstDate})</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs bg-white/70 px-3 py-2 rounded-lg border border-warm-200/60">
              <span className="text-warm-800 font-semibold flex items-center gap-1.5">
                <span>🇳🇱</span>
                <span>Eindhoven (CET):</span>
              </span>
              <div className="text-right">
                <span className="font-bold text-warm-950 font-mono">{previewEindhovenTime}</span>
                {previewEindhovenDate && previewEindhovenDate !== 'Today' && (
                  <span className="text-[10px] text-warm-500 ml-1.5 font-sans">({previewEindhovenDate})</span>
                )}
              </div>
            </div>
          </div>

          {/* Audience Option (Together vs With Friends) */}
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider">
              Type / Audience
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAudience('TOGETHER')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  audience === 'TOGETHER'
                    ? 'border-warm-800 bg-warm-800 text-white shadow-soft-sm'
                    : 'border-warm-200 bg-warm-50/40 text-warm-700 hover:border-warm-300'
                }`}
              >
                <span>❤️ Just Us (Together)</span>
              </button>
              <button
                type="button"
                onClick={() => setAudience('FRIENDS')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  audience === 'FRIENDS'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-soft-sm'
                    : 'border-warm-200 bg-warm-50/40 text-warm-700 hover:border-warm-300'
                }`}
              >
                <span>🥂 With Friends</span>
              </button>
            </div>
          </div>

          {/* Location / Link */}
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-warm-500" />
              <span>Location / Call App (Optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Google Meet, FaceTime, Discord, Restaurant"
              className="w-full px-4 py-2.5 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 text-warm-900 text-sm bg-warm-50/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-warm-500" />
              <span>Notes / Details (Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Add details, links, or notes..."
              className="w-full px-4 py-2.5 rounded-xl border border-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-500/30 text-warm-900 text-sm bg-warm-50/30 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-warm-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-warm-700 hover:bg-warm-100 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-95 text-white text-xs font-semibold shadow-soft-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : initialPlan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
