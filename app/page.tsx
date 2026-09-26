'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/context/AuthContext'
import { useCalendar } from '@/context/CalendarContext'
import { useModal } from '@/context/ModalContext'
import { LiveClockCard } from '@/components/dashboard/LiveClockCard'
import { NextPlanWidget } from '@/components/dashboard/NextPlanWidget'
import { BothFreeWidget } from '@/components/dashboard/BothFreeWidget'
import { TodayAvailabilityCard } from '@/components/dashboard/TodayAvailabilityCard'
import { UpcomingPlansList } from '@/components/dashboard/UpcomingPlansList'

export default function DashboardPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { availabilityBlocks, events } = useCalendar()
  const {
    openAddAvailability,
    openEditAvailability,
    openCreatePlan,
    openPlanDetail,
  } = useModal()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date())

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-warm-200/60 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-warm-950 tracking-tight">
              {getGreeting()}, {profile?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-xs font-semibold text-warm-600 mt-0.5">
              Today · {todayFormatted}
            </p>
          </div>
        </div>

        {/* 1. Live Dual Local Clocks */}
        <LiveClockCard />

        {/* 2. Key Action Widgets (Next Plan & Both Free Overlap) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NextPlanWidget
            events={events}
            onSelectPlan={(plan) => openPlanDetail(plan)}
            onCreatePlan={() => openCreatePlan()}
          />

          <BothFreeWidget
            availability={availabilityBlocks}
            events={events}
            onCreatePlanFromOverlap={(start, end) => openCreatePlan(undefined, start, end)}
            onGoToFindTime={() => router.push('/find-time')}
          />
        </div>

        {/* 3. Today's Availability & Upcoming Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TodayAvailabilityCard
            availability={availabilityBlocks}
            onAddAvailability={() => openAddAvailability()}
            onSelectBlock={(blk) => openEditAvailability(blk)}
          />

          <UpcomingPlansList
            events={events}
            onSelectPlan={(plan) => openPlanDetail(plan)}
            onCreatePlan={() => openCreatePlan()}
          />
        </div>
      </div>
    </AppShell>
  )
}
