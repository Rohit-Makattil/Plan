'use client'

import React, { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalIcon,
  Clock,
  HeartHandshake,
  Users,
  Repeat,
} from 'lucide-react'
import { AvailabilityBlock, CalendarEvent } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import {
  formatTimeInTz,
  formatTimeRangeInTz,
  utcToLocalDateAndTimeString,
  getCountryFlag,
} from '@/lib/timezones'
import { expandAvailability } from '@/lib/find-time'

type ViewMode = 'WEEK' | 'MONTH' | 'DAY'

interface CalendarViewProps {
  availability: AvailabilityBlock[]
  events: CalendarEvent[]
  onSelectPlan: (plan: CalendarEvent) => void
  onSelectBlock: (block: AvailabilityBlock) => void
  onAddAvailability: (date?: string) => void
  onCreatePlan: (date?: string) => void
}

export function CalendarView({
  availability,
  events,
  onSelectPlan,
  onSelectBlock,
  onAddAvailability,
  onCreatePlan,
}: CalendarViewProps) {
  const { profile, partner, user } = useAuth()
  const userTz = profile?.timezone || 'Asia/Kolkata'
  const partnerTz = partner?.timezone || 'Europe/Amsterdam'

  const [viewMode, setViewMode] = useState<ViewMode>('WEEK')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate)
    if (viewMode === 'DAY') next.setDate(next.getDate() - 1)
    else if (viewMode === 'WEEK') next.setDate(next.getDate() - 7)
    else next.setMonth(next.getMonth() - 1)
    setCurrentDate(next)
  }

  const handleNext = () => {
    const next = new Date(currentDate)
    if (viewMode === 'DAY') next.setDate(next.getDate() + 1)
    else if (viewMode === 'WEEK') next.setDate(next.getDate() + 7)
    else next.setMonth(next.getMonth() + 1)
    setCurrentDate(next)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Calculate week start (Sunday or Monday, let's do Monday start standard)
  const getWeekDays = (baseDate: Date) => {
    const d = new Date(baseDate)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const monday = new Date(d.setDate(diff))

    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday)
      nextDay.setDate(monday.getDate() + i)
      days.push(nextDay)
    }
    return days
  }

  // Format header title
  const getHeaderTitle = () => {
    if (viewMode === 'DAY') {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: userTz,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(currentDate)
    }
    if (viewMode === 'WEEK') {
      const days = getWeekDays(currentDate)
      const first = new Intl.DateTimeFormat('en-US', {
        timeZone: userTz,
        month: 'short',
        day: 'numeric',
      }).format(days[0])
      const last = new Intl.DateTimeFormat('en-US', {
        timeZone: userTz,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(days[6])
      return `${first} – ${last}`
    }
    return new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      month: 'long',
      year: 'numeric',
    }).format(currentDate)
  }

  // Expand recurring availability across viewed month/week
  const expandedAvailability = React.useMemo(() => {
    const rangeStart = new Date(currentDate)
    rangeStart.setDate(rangeStart.getDate() - 35)
    const rangeEnd = new Date(currentDate)
    rangeEnd.setDate(rangeEnd.getDate() + 35)
    return expandAvailability(availability, rangeStart, rangeEnd)
  }, [availability, currentDate])

  // Helper to get items for a particular local date string (YYYY-MM-DD)
  const getItemsForDate = (dateStr: string) => {
    const dayAvail = expandedAvailability.filter((b) => {
      const loc = utcToLocalDateAndTimeString(b.start_time, userTz)
      return loc.dateStr === dateStr
    })

    const dayEvents = events.filter((e) => {
      const loc = utcToLocalDateAndTimeString(e.start_time, userTz)
      return loc.dateStr === dateStr
    })

    return { availability: dayAvail, events: dayEvents }
  }

  const todayIsoStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  return (
    <div className="bg-white rounded-ios-xl border border-warm-200/80 shadow-soft overflow-hidden">
      {/* Calendar Top Controls */}
      <div className="p-4 sm:p-5 border-b border-warm-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-warm-50/40">
        {/* Navigation & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-xl border border-warm-200 shadow-soft-sm p-0.5">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-warm-100 text-warm-700 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-warm-900 hover:bg-warm-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-warm-100 text-warm-700 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold font-display text-warm-950 tracking-tight">
            {getHeaderTitle()}
          </h2>
        </div>

        {/* View Mode Switcher + Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <div className="flex bg-warm-200/60 p-0.5 rounded-xl border border-warm-300/40">
            {(['MONTH', 'WEEK', 'DAY'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === mode
                    ? 'bg-white text-warm-900 shadow-soft-sm'
                    : 'text-warm-700 hover:text-warm-950'
                }`}
              >
                {mode === 'MONTH' ? 'Month' : mode === 'WEEK' ? 'Week' : 'Day'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onAddAvailability()}
              type="button"
              className="px-2.5 py-1.5 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-800 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Add Availability"
            >
              <Clock className="w-3.5 h-3.5 text-warm-600" />
              <span className="hidden sm:inline">Availability</span>
            </button>
            <button
              onClick={() => onCreatePlan()}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-95 text-white text-xs font-semibold flex items-center gap-1 shadow-soft-sm transition-all"
              title="Create Plan"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-2.5 bg-warm-50/20 border-b border-warm-100 flex flex-wrap items-center gap-4 text-[11px] text-warm-700">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>FREE (Available)</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-warm-400" />
          <span>BUSY (Unavailable)</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>PLAN (Scheduled)</span>
        </div>
      </div>

      {/* Views */}
      <div className="p-2 sm:p-4">
        {/* WEEK VIEW (Default) */}
        {viewMode === 'WEEK' && (
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
            {getWeekDays(currentDate).map((dayDate) => {
              const dayStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: userTz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              }).format(dayDate)

              const isToday = dayStr === todayIsoStr
              const weekdayName = new Intl.DateTimeFormat('en-US', {
                timeZone: userTz,
                weekday: 'short',
              }).format(dayDate)
              const dayNum = dayDate.getDate()

              const { availability: dayAvail, events: dayEvents } = getItemsForDate(dayStr)

              return (
                <div
                  key={dayStr}
                  className={`min-h-[140px] sm:min-h-[280px] rounded-2xl p-2.5 flex flex-col border transition-all ${
                    isToday
                      ? 'bg-amber-50/30 border-amber-300 ring-1 ring-amber-300/50 shadow-soft-sm'
                      : 'bg-warm-50/30 border-warm-200/70 hover:border-warm-300'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-warm-100">
                    <div>
                      <span className="text-[11px] font-bold text-warm-500 uppercase tracking-wider block">
                        {weekdayName}
                      </span>
                      <span
                        className={`text-sm font-extrabold font-display inline-block ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-warm-800 text-white text-center leading-6'
                            : 'text-warm-900'
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>

                    <button
                      onClick={() => onCreatePlan(dayStr)}
                      className="p-1 rounded-lg hover:bg-warm-200/70 text-warm-500 hover:text-warm-900 transition-colors"
                      title="Add to this day"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Day Items Container */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[220px]">
                    {/* Events */}
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => onSelectPlan(evt)}
                        className={`cursor-pointer p-2 rounded-xl text-left border shadow-soft-sm transition-all hover:scale-[1.02] ${
                          evt.audience === 'FRIENDS'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-950'
                            : 'bg-rose-50 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-bold text-xs truncate">
                          <span>{evt.audience === 'FRIENDS' ? '🥂' : '❤️'}</span>
                          <span className="truncate">{evt.title}</span>
                        </div>
                        <div className="text-[10px] font-mono font-medium opacity-85 mt-0.5">
                          {formatTimeInTz(evt.start_time, userTz)}
                        </div>
                      </div>
                    ))}

                    {/* Availability Blocks */}
                    {dayAvail.map((blk) => {
                      const isUser = blk.user_id === user?.id
                      const ownerName = isUser ? 'You' : blk.profile?.name?.split(' ')[0] || 'Partner'
                      const isFree = blk.type === 'FREE'

                      return (
                        <div
                          key={blk.id}
                          onClick={() => onSelectBlock(blk)}
                          className={`cursor-pointer p-1.5 rounded-lg text-left border text-[11px] font-medium transition-all hover:opacity-90 ${
                            isFree
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : 'bg-warm-100 text-warm-800 border-warm-300/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold flex items-center gap-1 truncate">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isFree ? 'bg-emerald-500' : 'bg-warm-500'
                                }`}
                              />
                              <span>{ownerName}</span>
                            </span>
                            <span className="text-[9px] uppercase font-bold opacity-75">
                              {blk.type}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono mt-0.5 text-warm-600">
                            {formatTimeRangeInTz(blk.start_time, blk.end_time, userTz, false)}
                          </div>
                        </div>
                      )
                    })}

                    {dayEvents.length === 0 && dayAvail.length === 0 && (
                      <div
                        onClick={() => onAddAvailability(dayStr)}
                        className="h-full flex items-center justify-center cursor-pointer text-[11px] text-warm-400 hover:text-warm-700 py-3 italic"
                      >
                        + Add
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* DAY VIEW */}
        {viewMode === 'DAY' && (
          (() => {
            const dayStr = new Intl.DateTimeFormat('en-CA', {
              timeZone: userTz,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(currentDate)

            const { availability: dayAvail, events: dayEvents } = getItemsForDate(dayStr)

            return (
              <div className="max-w-2xl mx-auto space-y-4 py-2">
                <div className="flex items-center justify-between bg-warm-50 p-4 rounded-2xl border border-warm-200">
                  <div>
                    <h3 className="text-lg font-bold font-display text-warm-900">
                      {new Intl.DateTimeFormat('en-US', {
                        timeZone: userTz,
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      }).format(currentDate)}
                    </h3>
                    <p className="text-xs text-warm-600">
                      Local timezone: {userTz}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAddAvailability(dayStr)}
                      className="px-3 py-1.5 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-800 text-xs font-semibold"
                    >
                      + Availability
                    </button>
                    <button
                      onClick={() => onCreatePlan(dayStr)}
                      className="px-3 py-1.5 rounded-xl bg-warm-800 hover:bg-warm-900 text-white text-xs font-semibold shadow-soft-sm"
                    >
                      + Plan
                    </button>
                  </div>
                </div>

                {/* Day's Events */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-warm-700">
                    Plans & Events ({dayEvents.length})
                  </h4>
                  {dayEvents.length > 0 ? (
                    dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => onSelectPlan(evt)}
                        className="cursor-pointer p-4 rounded-2xl bg-white border border-warm-200/80 shadow-soft-sm hover:shadow-soft transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base">
                              {evt.audience === 'FRIENDS' ? '🥂' : '❤️'}
                            </span>
                            <span className="font-bold text-sm text-warm-950">{evt.title}</span>
                          </div>
                          <div className="text-xs text-warm-600 font-mono mt-1">
                            {formatTimeRangeInTz(evt.start_time, evt.end_time, userTz, true)}
                            {partner && (
                              <span className="ml-2 text-warm-500">
                                ({partner.name}: {formatTimeRangeInTz(evt.start_time, evt.end_time, partnerTz, true)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-warm-500 italic p-3 bg-warm-50/50 rounded-xl">
                      No plans scheduled for this day.
                    </p>
                  )}
                </div>

                {/* Day's Availability */}
                <div className="space-y-2.5 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-warm-700">
                    Availability Blocks ({dayAvail.length})
                  </h4>
                  {dayAvail.length > 0 ? (
                    dayAvail.map((blk) => (
                      <div
                        key={blk.id}
                        onClick={() => onSelectBlock(blk)}
                        className={`cursor-pointer p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                          blk.type === 'FREE'
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-warm-100/60 border-warm-300/80 text-warm-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              blk.type === 'FREE' ? 'bg-emerald-500' : 'bg-warm-500'
                            }`}
                          />
                          <div>
                            <span className="text-xs font-bold">
                              {blk.user_id === user?.id
                                ? 'Your Availability'
                                : `${blk.profile?.name || 'Partner'}'s Availability`}
                            </span>
                            <span className="text-xs font-mono block text-warm-600">
                              {formatTimeRangeInTz(blk.start_time, blk.end_time, userTz, true)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            blk.type === 'FREE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-warm-200 text-warm-800'
                          }`}
                        >
                          {blk.type}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-warm-500 italic p-3 bg-warm-50/50 rounded-xl">
                      No availability blocks set for this day.
                    </p>
                  )}
                </div>
              </div>
            )
          })()
        )}

        {/* MONTH VIEW */}
        {viewMode === 'MONTH' && (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className="text-center py-2 text-xs font-bold text-warm-600 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}

            {(() => {
              const year = currentDate.getFullYear()
              const month = currentDate.getMonth()

              // First day of month
              const firstDay = new Date(year, month, 1)
              const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // monday index
              const daysInMonth = new Date(year, month + 1, 0).getDate()

              const cells = []
              // Blank leading cells
              for (let i = 0; i < startDay; i++) {
                cells.push(
                  <div key={`blank-${i}`} className="min-h-[80px] p-1.5 bg-warm-50/20 rounded-xl opacity-40" />
                )
              }

              // Days of current month
              for (let d = 1; d <= daysInMonth; d++) {
                const dayDate = new Date(year, month, d)
                const dayStr = new Intl.DateTimeFormat('en-CA', {
                  timeZone: userTz,
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                }).format(dayDate)

                const isToday = dayStr === todayIsoStr
                const { availability: dayAvail, events: dayEvents } = getItemsForDate(dayStr)

                cells.push(
                  <div
                    key={dayStr}
                    onClick={() => {
                      setCurrentDate(dayDate)
                      setViewMode('DAY')
                    }}
                    className={`min-h-[85px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:bg-warm-100/50 ${
                      isToday
                        ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/60'
                        : 'bg-white border-warm-200/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? 'w-5 h-5 rounded-full bg-warm-800 text-white flex items-center justify-center'
                            : 'text-warm-800'
                        }`}
                      >
                        {d}
                      </span>
                    </div>

                    <div className="space-y-1 my-1">
                      {dayEvents.slice(0, 1).map((e) => (
                        <div
                          key={e.id}
                          className="text-[9px] font-bold px-1 py-0.5 rounded bg-rose-100 text-rose-800 truncate"
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayAvail.length > 0 && (
                        <div className="flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[9px] text-warm-600 font-semibold">
                            {dayAvail.length} free
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              return cells
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
