'use client'

import React from 'react'
import { Calendar as CalIcon, HeartHandshake, ArrowRight, MapPin } from 'lucide-react'
import { CalendarEvent } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import {
  formatDateInTz,
  formatTimeRangeInTz,
  getCountryFlag,
} from '@/lib/timezones'

interface NextPlanWidgetProps {
  events: CalendarEvent[]
  onSelectPlan: (plan: CalendarEvent) => void
  onCreatePlan: () => void
}

export function NextPlanWidget({ events, onSelectPlan, onCreatePlan }: NextPlanWidgetProps) {
  const { profile, partner } = useAuth()
  const now = new Date()

  const upcomingPlans = events
    .filter((e) => new Date(e.end_time) >= now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const nextPlan = upcomingPlans[0]

  const userTz = profile?.timezone || 'Asia/Kolkata'
  const partnerTz = partner?.timezone || 'Europe/Amsterdam'

  return (
    <div className="rounded-ios-lg bg-white border border-warm-200/80 p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-warm-600">
          NEXT PLAN
        </span>
        {nextPlan && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              nextPlan.audience === 'FRIENDS'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {nextPlan.audience === 'FRIENDS' ? 'With Friends' : 'Together'}
          </span>
        )}
      </div>

      {nextPlan ? (
        <div
          onClick={() => onSelectPlan(nextPlan)}
          className="group cursor-pointer rounded-xl p-3 -mx-2 hover:bg-warm-50/80 transition-colors border border-transparent hover:border-warm-200/70"
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-lg font-bold font-display text-warm-900 group-hover:text-warm-800 transition-colors">
                {nextPlan.title}
              </h4>
              <p className="text-xs font-semibold text-warm-700 mt-0.5">
                {formatDateInTz(nextPlan.start_time, userTz)}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-warm-400 group-hover:text-warm-800 group-hover:translate-x-0.5 transition-all mt-1" />
          </div>

          <div className="mt-3.5 pt-3 border-t border-warm-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-warm-800">
              <span>{getCountryFlag(profile?.country)}</span>
              <span className="font-semibold text-warm-950 font-mono">
                {formatTimeRangeInTz(nextPlan.start_time, nextPlan.end_time, userTz, true)}
              </span>
              <span className="text-warm-500 text-[11px]">({profile?.country || 'India'})</span>
            </div>

            {partner && (
              <div className="flex items-center gap-1.5 text-warm-800">
                <span>{getCountryFlag(partner.country)}</span>
                <span className="font-semibold text-warm-950 font-mono">
                  {formatTimeRangeInTz(nextPlan.start_time, nextPlan.end_time, partnerTz, true)}
                </span>
                <span className="text-warm-500 text-[11px]">({partner.country || 'Netherlands'})</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm font-medium text-warm-700 mb-2">No upcoming plans scheduled</p>
          <button
            onClick={onCreatePlan}
            type="button"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-warm-800 hover:bg-warm-900 text-white shadow-soft-sm transition-all"
          >
            Create Plan
          </button>
        </div>
      )}
    </div>
  )
}
