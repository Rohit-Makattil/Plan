'use client'

import React, { useState, useEffect } from 'react'
import { X, Clock, Trash2, Calendar as CalIcon, Check, Repeat } from 'lucide-react'
import { AvailabilityBlock, AvailabilityType } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import { useCalendar } from '@/context/CalendarContext'
import {
  localToUtcIso,
  utcToLocalDateAndTimeString,
  formatTimeWithAbbr,
  IST_TIMEZONE,
  EINDHOVEN_TIMEZONE,
  formatDateInTz,
} from '@/lib/timezones'

interface AvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  initialBlock?: AvailabilityBlock | null
  initialDate?: string // YYYY-MM-DD
}

export function AvailabilityModal({
  isOpen,
  onClose,
  initialBlock,
  initialDate,
}: AvailabilityModalProps) {
  const { profile } = useAuth()
  const { addAvailability, updateAvailability, deleteAvailability } = useCalendar()

  const [selectedTz, setSelectedTz] = useState<string>(() => {
    if (profile?.timezone?.includes('Amsterdam') || profile?.timezone?.includes('Europe')) {
      return EINDHOVEN_TIMEZONE
    }
    return IST_TIMEZONE
  })

  const [type, setType] = useState<AvailabilityType>('FREE')
  const [date, setDate] = useState(() => {
    if (initialDate) return initialDate
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [startTime, setStartTime] = useState('19:00')
  const [endTime, setEndTime] = useState('22:00')
  const [isRecurring, setIsRecurring] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialBlock) {
      setType(initialBlock.type)
      const localStart = utcToLocalDateAndTimeString(initialBlock.start_time, selectedTz)
      const localEnd = utcToLocalDateAndTimeString(initialBlock.end_time, selectedTz)
      setDate(localStart.dateStr)
      setStartTime(localStart.timeStr)
      setEndTime(localEnd.timeStr)
      setIsRecurring(!!initialBlock.recurrence_rule)
    } else {
      setType('FREE')
      if (initialDate) setDate(initialDate)
      setStartTime('19:00')
      setEndTime('22:00')
      setIsRecurring(false)
    }
    setError(null)
  }, [initialBlock, initialDate, selectedTz, isOpen])

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
    setError(null)

    // Calculate UTC ISO
    const startUtcIso = localToUtcIso(date, startTime, selectedTz)
    const endUtcIso = localToUtcIso(date, endTime, selectedTz)

    if (new Date(endUtcIso).getTime() <= new Date(startUtcIso).getTime()) {
      setError('End time must be strictly after start time.')
      return
    }

    setLoading(true)

    const recurrenceRule = isRecurring ? 'WEEKLY' : null

    if (initialBlock) {
      const { error: err } = await updateAvailability(initialBlock.id, {
        type,
        startTime: startUtcIso,
        endTime: endUtcIso,
        recurrenceRule,
      })
      if (err) {
        setError(err.message || 'Failed to update availability')
        setLoading(false)
        return
      }
    } else {
      const { error: err } = await addAvailability({
        type,
        startTime: startUtcIso,
        endTime: endUtcIso,
        recurrenceRule,
      })
      if (err) {
        setError(err.message || 'Failed to add availability')
        setLoading(false)
        return
      }
    }

    setLoading(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!initialBlock) return
    if (!confirm('Are you sure you want to delete this availability block?')) return
    setLoading(true)
    const { error: err } = await deleteAvailability(initialBlock.id)
    if (err) {
      setError(err.message || 'Failed to delete availability')
      setLoading(false)
      return
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-ios-xl border border-warm-200 shadow-soft-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-100 bg-warm-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                type === 'FREE' ? 'bg-emerald-100 text-emerald-700' : 'bg-warm-200 text-warm-700'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-warm-900">
                {initialBlock ? 'Edit Availability' : 'Add Availability'}
              </h2>
              <p className="text-[11px] text-warm-600">
                Times converted and visible in both IST & Eindhoven
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Type Selector (FREE vs BUSY) */}
          <div>
            <label className="block text-xs font-semibold text-warm-800 mb-2 uppercase tracking-wider">
              Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('FREE')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs transition-all ${
                  type === 'FREE'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-soft-sm'
                    : 'border-warm-200 bg-warm-50/40 text-warm-600 hover:border-warm-300'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>FREE (Available)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('BUSY')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs transition-all ${
                  type === 'BUSY'
                    ? 'border-warm-600 bg-warm-200 text-warm-900 ring-2 ring-warm-600/20 shadow-soft-sm'
                    : 'border-warm-200 bg-warm-50/40 text-warm-600 hover:border-warm-300'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-warm-500" />
                <span>BUSY (Unavailable)</span>
              </button>
            </div>
          </div>

          {/* Timezone Selector */}
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

          {/* Weekly Recurrence Toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-warm-200 bg-warm-50/50 cursor-pointer hover:bg-warm-100/60 transition-colors">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-warm-800 focus:ring-warm-600 border-warm-300"
              />
              <div className="flex items-center gap-2 text-xs font-medium text-warm-800">
                <Repeat className="w-4 h-4 text-warm-600" />
                <span>Repeat weekly on this day</span>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-between gap-3 border-t border-warm-100">
            {initialBlock ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
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
                {loading ? 'Saving...' : initialBlock ? 'Save Changes' : 'Add Availability'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
