'use client'

import React from 'react'
import { Plus, Clock } from 'lucide-react'
import { AvailabilityBlock } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import {
  formatTimeRangeInTz,
  utcToLocalDateAndTimeString,
  getCountryFlag,
} from '@/lib/timezones'

interface TodayAvailabilityCardProps {
  availability: AvailabilityBlock[]
  onAddAvailability: () => void
  onSelectBlock?: (block: AvailabilityBlock) => void
}

export function TodayAvailabilityCard({
  availability,
  onAddAvailability,
  onSelectBlock,
}: TodayAvailabilityCardProps) {
  const { profile, partner, user } = useAuth()
  const userTz = profile?.timezone || 'Asia/Kolkata'

  // Get today's local date string
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  // Filter blocks that fall on today in user's timezone
  const todayBlocks = availability.filter((b) => {
    const locStart = utcToLocalDateAndTimeString(b.start_time, userTz)
    return locStart.dateStr === todayStr
  })

  const userTodayBlocks = todayBlocks.filter((b) => b.user_id === user?.id)
  const partnerTodayBlocks = partner
    ? todayBlocks.filter((b) => b.user_id === partner.id)
    : []

  return (
    <div className="rounded-ios-lg bg-white border border-warm-200/80 p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-warm-600">
          TODAY&apos;S AVAILABILITY
        </span>
        <button
          onClick={onAddAvailability}
          type="button"
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-800 flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* User Today Availability */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-warm-900 mb-1.5">
            <span className="flex items-center gap-1">
              <span>{getCountryFlag(profile?.country)}</span>
              <span>{profile?.name || 'You'}</span>
            </span>
          </div>

          {userTodayBlocks.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {userTodayBlocks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => onSelectBlock?.(b)}
                  className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    b.type === 'FREE'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-warm-100 text-warm-700 border-warm-200 hover:bg-warm-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      b.type === 'FREE' ? 'bg-emerald-500' : 'bg-warm-400'
                    }`}
                  />
                  <span>{formatTimeRangeInTz(b.start_time, b.end_time, userTz, false)}</span>
                  <span className="text-[10px] opacity-75">({b.type})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-warm-500 italic">No availability set for today</p>
          )}
        </div>

        {/* Partner Today Availability */}
        <div className="pt-3 border-t border-warm-100">
          <div className="flex items-center justify-between text-xs font-bold text-warm-900 mb-1.5">
            <span className="flex items-center gap-1">
              <span>{getCountryFlag(partner?.country)}</span>
              <span>{partner?.name || 'Partner'}</span>
            </span>
          </div>

          {partner ? (
            partnerTodayBlocks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {partnerTodayBlocks.map((b) => (
                  <div
                    key={b.id}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                      b.type === 'FREE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-warm-100 text-warm-700 border-warm-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        b.type === 'FREE' ? 'bg-emerald-500' : 'bg-warm-400'
                      }`}
                    />
                    <span>{formatTimeRangeInTz(b.start_time, b.end_time, userTz, false)}</span>
                    <span className="text-[10px] opacity-75">({b.type})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-warm-500 italic">No availability set for today</p>
            )
          ) : (
            <p className="text-xs text-warm-500 italic">Partner not connected yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
