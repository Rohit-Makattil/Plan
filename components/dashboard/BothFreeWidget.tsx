'use client'

import React, { useMemo } from 'react'
import { Sparkles, CalendarPlus, Heart, ArrowRight } from 'lucide-react'
import { AvailabilityBlock, CalendarEvent } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import { calculateOverlaps } from '@/lib/find-time'
import { getCountryFlag } from '@/lib/timezones'

interface BothFreeWidgetProps {
  availability: AvailabilityBlock[]
  events: CalendarEvent[]
  onCreatePlanFromOverlap: (startIso: string, endIso: string) => void
  onGoToFindTime: () => void
}

export function BothFreeWidget({
  availability,
  events,
  onCreatePlanFromOverlap,
  onGoToFindTime,
}: BothFreeWidgetProps) {
  const { profile, partner } = useAuth()

  // Calculate nearest overlap
  const nearestOverlap = useMemo(() => {
    if (!profile || !partner) return null
    const overlaps = calculateOverlaps(
      profile,
      partner,
      availability,
      events,
      new Date(),
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    )
    return overlaps[0] || null
  }, [profile, partner, availability, events])

  return (
    <div className="rounded-ios-lg bg-gradient-to-br from-amber-50 via-warm-50 to-warm-100/70 border border-amber-200/70 p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] uppercase tracking-widest">
          <span>💛</span>
          <span>YOU&apos;RE BOTH FREE</span>
        </div>
        <button
          onClick={onGoToFindTime}
          className="text-[11px] font-semibold text-warm-700 hover:text-warm-900 flex items-center gap-1 hover:underline"
        >
          <span>See all</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {nearestOverlap ? (
        <div>
          <div className="mb-3">
            <span className="text-base font-bold font-display text-warm-900 block">
              {nearestOverlap.dateLabel}
            </span>
            <span className="text-xs text-warm-600 font-medium">
              Overlapping window ({nearestOverlap.durationMinutes} mins)
            </span>
          </div>

          <div className="space-y-1.5 bg-white/80 rounded-xl p-3 border border-warm-200/60 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-warm-700 flex items-center gap-1.5 font-medium">
                <span>{getCountryFlag(nearestOverlap.user1.country)}</span>
                <span>{nearestOverlap.user1.name} ({nearestOverlap.user1.country || 'India'}):</span>
              </span>
              <span className="font-bold text-warm-950 font-mono">
                {nearestOverlap.user1.formattedTime}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-warm-100">
              <span className="text-warm-700 flex items-center gap-1.5 font-medium">
                <span>{getCountryFlag(nearestOverlap.user2.country)}</span>
                <span>{nearestOverlap.user2.name} ({nearestOverlap.user2.country || 'Netherlands'}):</span>
              </span>
              <span className="font-bold text-warm-950 font-mono">
                {nearestOverlap.user2.formattedTime}
              </span>
            </div>
          </div>

          <button
            onClick={() =>
              onCreatePlanFromOverlap(
                nearestOverlap.start_time,
                nearestOverlap.end_time
              )
            }
            type="button"
            className="w-full py-2.5 px-4 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-[0.98] text-white text-xs font-semibold shadow-soft-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-xs text-warm-700 font-medium mb-3 leading-relaxed">
            {!partner
              ? 'Connect your partner to discover overlapping free time.'
              : 'No common free time found this week. Add more FREE blocks to find slots.'}
          </p>
          <button
            onClick={onGoToFindTime}
            type="button"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-warm-800 hover:bg-warm-900 text-white shadow-soft-sm transition-all"
          >
            Open Find Time
          </button>
        </div>
      )}
    </div>
  )
}
