'use client'

import React, { useState, useMemo } from 'react'
import { Sparkles, CalendarPlus, Clock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { AvailabilityBlock, CalendarEvent } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import { calculateOverlaps } from '@/lib/find-time'
import { getCountryFlag } from '@/lib/timezones'

interface FindTimeViewProps {
  availability: AvailabilityBlock[]
  events: CalendarEvent[]
  onCreatePlanFromOverlap: (startIso: string, endIso: string) => void
  onAddAvailability: () => void
}

export function FindTimeView({
  availability,
  events,
  onCreatePlanFromOverlap,
  onAddAvailability,
}: FindTimeViewProps) {
  const { profile, partner } = useAuth()
  const [daysRange, setDaysRange] = useState<number>(7)

  const overlaps = useMemo(() => {
    if (!profile || !partner) return []
    const rangeStart = new Date()
    const rangeEnd = new Date(Date.now() + daysRange * 24 * 60 * 60 * 1000)
    return calculateOverlaps(profile, partner, availability, events, rangeStart, rangeEnd)
  }, [profile, partner, availability, events, daysRange])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-ios-xl bg-gradient-to-r from-amber-500/10 via-warm-500/10 to-rose-500/10 border border-warm-200/80 p-6 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-warm-800 text-amber-200 flex items-center justify-center shrink-0 shadow-soft-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-warm-900 tracking-tight">
                Find Common Free Time
              </h1>
              <p className="text-xs sm:text-sm text-warm-700 mt-1 max-w-xl">
                TogetherTime compares both of your free availability schedules and accounts for timezone differences to pinpoint exactly when you are both free.
              </p>
            </div>
          </div>

          {/* Days range selector */}
          <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-xl border border-warm-200 self-start md:self-auto shadow-soft-sm">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setDaysRange(days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  daysRange === days
                    ? 'bg-warm-800 text-white shadow-soft-sm'
                    : 'text-warm-700 hover:text-warm-950'
                }`}
              >
                Next {days} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Results */}
      {!partner ? (
        <div className="bg-white rounded-ios-xl p-8 border border-warm-200 text-center shadow-soft">
          <div className="w-14 h-14 rounded-2xl bg-warm-100 flex items-center justify-center mx-auto mb-4 text-warm-700">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-warm-900 mb-1">Partner Not Connected</h3>
          <p className="text-xs text-warm-600 max-w-md mx-auto mb-4">
            Invite your partner using your shared invite code in Settings so you can calculate overlapping free time together.
          </p>
        </div>
      ) : overlaps.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-warm-700">
              💛 Available Overlaps ({overlaps.length} Found)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overlaps.map((slot) => (
              <div
                key={slot.id}
                className="bg-white rounded-ios-lg p-5 border border-warm-200/80 shadow-soft hover:shadow-soft-lg hover:border-warm-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold font-display text-warm-900">
                      {slot.dateLabel}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {slot.durationMinutes} mins free
                    </span>
                  </div>

                  <div className="space-y-2 bg-warm-50/70 rounded-xl p-3 border border-warm-200/60 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-warm-700 flex items-center gap-1.5 font-medium">
                        <span>{getCountryFlag(slot.user1.country)}</span>
                        <span>{slot.user1.name} ({slot.user1.country || 'India'}):</span>
                      </span>
                      <span className="font-bold text-warm-950 font-mono">
                        {slot.user1.formattedTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-warm-200/60">
                      <span className="text-warm-700 flex items-center gap-1.5 font-medium">
                        <span>{getCountryFlag(slot.user2.country)}</span>
                        <span>{slot.user2.name} ({slot.user2.country || 'Netherlands'}):</span>
                      </span>
                      <span className="font-bold text-warm-950 font-mono">
                        {slot.user2.formattedTime}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onCreatePlanFromOverlap(slot.start_time, slot.end_time)}
                  type="button"
                  className="w-full py-2.5 px-4 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-[0.98] text-white text-xs font-semibold shadow-soft-sm flex items-center justify-center gap-2 transition-all"
                >
                  <CalendarPlus className="w-4 h-4 text-amber-200" />
                  <span>Create Plan from this Slot</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-ios-xl p-8 border border-warm-200 text-center shadow-soft">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4 text-amber-700">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-warm-900 mb-1 font-display">
            No Common Free Time Found
          </h3>
          <p className="text-xs text-warm-600 max-w-md mx-auto mb-5 leading-relaxed">
            You don&apos;t have any overlapping FREE availability in the next {daysRange} days. Add more free time blocks so TogetherTime can discover when you&apos;re both free.
          </p>
          <button
            onClick={onAddAvailability}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-warm-800 hover:bg-warm-900 text-white text-xs font-semibold shadow-soft-sm transition-all"
          >
            + Add Your Free Time
          </button>
        </div>
      )}
    </div>
  )
}
