'use client'

import React from 'react'
import { Calendar as CalIcon, HeartHandshake, MapPin, ArrowRight } from 'lucide-react'
import { CalendarEvent } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import {
  formatDateInTz,
  formatTimeRangeInTz,
  getCountryFlag,
} from '@/lib/timezones'

interface UpcomingPlansListProps {
  events: CalendarEvent[]
  onSelectPlan: (plan: CalendarEvent) => void
  onCreatePlan: () => void
}

export function UpcomingPlansList({
  events,
  onSelectPlan,
  onCreatePlan,
}: UpcomingPlansListProps) {
  const { profile, partner } = useAuth()
  const userTz = profile?.timezone || 'Asia/Kolkata'
  const partnerTz = partner?.timezone || 'Europe/Amsterdam'

  const now = new Date()
  const upcoming = events
    .filter((e) => new Date(e.end_time) >= now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  return (
    <div className="rounded-ios-lg bg-white border border-warm-200/80 p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-warm-600">
          UPCOMING PLANS
        </span>
        <button
          onClick={onCreatePlan}
          type="button"
          className="text-xs font-semibold text-warm-800 hover:text-warm-950 flex items-center gap-1 hover:underline"
        >
          <span>+ Plan</span>
        </button>
      </div>

      {upcoming.length > 0 ? (
        <div className="divide-y divide-warm-100">
          {upcoming.map((plan) => (
            <div
              key={plan.id}
              onClick={() => onSelectPlan(plan)}
              className="py-3.5 first:pt-0 last:pb-0 cursor-pointer group flex items-start justify-between gap-3 hover:bg-warm-50/50 -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-warm-900 group-hover:text-warm-800 transition-colors">
                    {plan.title}
                  </h4>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                      plan.audience === 'FRIENDS'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {plan.audience === 'FRIENDS' ? 'Friends' : 'Together'}
                  </span>
                </div>

                <div className="text-xs text-warm-700 font-medium">
                  {formatDateInTz(plan.start_time, userTz)} ·{' '}
                  <span className="font-mono font-semibold">
                    {formatTimeRangeInTz(plan.start_time, plan.end_time, userTz, true)}
                  </span>
                </div>

                {partner && (
                  <div className="text-[11px] text-warm-500 font-mono">
                    {getCountryFlag(partner.country)} {partner.name}:{' '}
                    {formatTimeRangeInTz(plan.start_time, plan.end_time, partnerTz, true)}
                  </div>
                )}
              </div>

              <ArrowRight className="w-4 h-4 text-warm-400 group-hover:text-warm-800 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-xs text-warm-600 mb-3">No plans yet. Schedule time to look forward to!</p>
          <button
            onClick={onCreatePlan}
            type="button"
            className="px-3.5 py-1.5 rounded-xl bg-warm-800 hover:bg-warm-900 text-white text-xs font-semibold shadow-soft-sm transition-all"
          >
            Create Your First Plan
          </button>
        </div>
      )}
    </div>
  )
}
