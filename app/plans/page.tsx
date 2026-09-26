'use client'

import React, { useState } from 'react'
import { Plus, HeartHandshake, MapPin, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/context/AuthContext'
import { useCalendar } from '@/context/CalendarContext'
import { useModal } from '@/context/ModalContext'
import { CalendarEvent } from '@/types/database'
import {
  formatDateInTz,
  formatTimeRangeInTz,
  getCountryFlag,
} from '@/lib/timezones'

export default function PlansPage() {
  const { profile, partner } = useAuth()
  const { events } = useCalendar()
  const { openCreatePlan, openPlanDetail } = useModal()
  const [filter, setFilter] = useState<'ALL' | 'TOGETHER' | 'FRIENDS'>('ALL')
  const [tab, setTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING')

  const userTz = profile?.timezone || 'Asia/Kolkata'
  const partnerTz = partner?.timezone || 'Europe/Amsterdam'
  const now = new Date()

  const filteredEvents = events.filter((e) => {
    if (filter === 'TOGETHER' && e.audience !== 'TOGETHER') return false
    if (filter === 'FRIENDS' && e.audience !== 'FRIENDS') return false

    const isPast = new Date(e.end_time) < now
    if (tab === 'UPCOMING' && isPast) return false
    if (tab === 'PAST' && !isPast) return false

    return true
  })

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const timeA = new Date(a.start_time).getTime()
    const timeB = new Date(b.start_time).getTime()
    return tab === 'UPCOMING' ? timeA - timeB : timeB - timeA
  })

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-200/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-warm-900 tracking-tight">
              Shared Plans
            </h1>
            <p className="text-xs text-warm-600 mt-0.5">
              Everything you have scheduled together across time zones.
            </p>
          </div>

          <button
            onClick={() => openCreatePlan()}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-95 text-white text-xs font-semibold shadow-soft-sm flex items-center gap-1.5 self-start sm:self-auto transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        </div>

        {/* Filters and Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Upcoming vs Past */}
          <div className="flex bg-warm-200/60 p-1 rounded-xl border border-warm-300/40 self-start">
            <button
              onClick={() => setTab('UPCOMING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'UPCOMING'
                  ? 'bg-white text-warm-900 shadow-soft-sm'
                  : 'text-warm-700 hover:text-warm-950'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setTab('PAST')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'PAST'
                  ? 'bg-white text-warm-900 shadow-soft-sm'
                  : 'text-warm-700 hover:text-warm-950'
              }`}
            >
              Past
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { key: 'ALL', label: 'All Plans' },
                { key: 'TOGETHER', label: '❤️ Just Us' },
                { key: 'FRIENDS', label: '🥂 Friends' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                  filter === opt.key
                    ? 'bg-warm-800 text-white border-warm-800 shadow-soft-sm'
                    : 'bg-white text-warm-700 border-warm-200 hover:border-warm-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plans List */}
        {sortedEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedEvents.map((plan) => (
              <div
                key={plan.id}
                onClick={() => openPlanDetail(plan)}
                className="cursor-pointer bg-white rounded-ios-lg p-5 border border-warm-200/80 shadow-soft hover:shadow-soft-lg hover:border-warm-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {plan.audience === 'FRIENDS' ? '🥂' : '❤️'}
                      </span>
                      <h3 className="font-bold font-display text-warm-950 text-base">
                        {plan.title}
                      </h3>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        plan.audience === 'FRIENDS'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {plan.audience === 'FRIENDS' ? 'Friends' : 'Together'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-warm-700 mb-3">
                    {formatDateInTz(plan.start_time, userTz)}
                  </p>

                  <div className="space-y-1.5 bg-warm-50/70 rounded-xl p-3 border border-warm-200/60 mb-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-warm-700 flex items-center gap-1 font-medium">
                        <span>{getCountryFlag(profile?.country)}</span>
                        <span>{profile?.name || 'You'}:</span>
                      </span>
                      <span className="font-bold text-warm-950 font-mono">
                        {formatTimeRangeInTz(plan.start_time, plan.end_time, userTz, true)}
                      </span>
                    </div>

                    {partner && (
                      <div className="flex items-center justify-between pt-1 border-t border-warm-200/60">
                        <span className="text-warm-700 flex items-center gap-1 font-medium">
                          <span>{getCountryFlag(partner.country)}</span>
                          <span>{partner.name}:</span>
                        </span>
                        <span className="font-bold text-warm-950 font-mono">
                          {formatTimeRangeInTz(plan.start_time, plan.end_time, partnerTz, true)}
                        </span>
                      </div>
                    )}
                  </div>

                  {plan.location && (
                    <div className="flex items-center gap-1.5 text-xs text-warm-600 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-warm-400" />
                      <span>{plan.location}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-warm-500 border-t border-warm-100">
                  <span>
                    Created by <strong>{plan.creator_profile?.name || 'Member'}</strong>
                  </span>
                  <span className="font-semibold text-warm-800 flex items-center gap-1">
                    <span>Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-ios-xl p-10 border border-warm-200 text-center shadow-soft">
            <div className="w-14 h-14 rounded-2xl bg-warm-100 text-warm-700 flex items-center justify-center mx-auto mb-4">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-warm-900 mb-1 font-display">
              {tab === 'UPCOMING' ? 'No Upcoming Plans' : 'No Past Plans'}
            </h3>
            <p className="text-xs text-warm-600 max-w-sm mx-auto mb-5 leading-relaxed">
              {tab === 'UPCOMING'
                ? 'Create a shared plan for calls, movies, trips, or hanging out together.'
                : 'Your past completed plans will appear here.'}
            </p>
            {tab === 'UPCOMING' && (
              <button
                onClick={() => openCreatePlan()}
                type="button"
                className="px-4 py-2.5 rounded-xl bg-warm-800 hover:bg-warm-900 text-white text-xs font-semibold shadow-soft-sm transition-all"
              >
                + Create Plan
              </button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
