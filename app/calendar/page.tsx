'use client'

import React from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useCalendar } from '@/context/CalendarContext'
import { useModal } from '@/context/ModalContext'
import { CalendarView } from '@/components/calendar/CalendarView'

export default function CalendarPage() {
  const { availabilityBlocks, events } = useCalendar()
  const {
    openAddAvailability,
    openEditAvailability,
    openCreatePlan,
    openPlanDetail,
  } = useModal()

  return (
    <AppShell>
      <div className="space-y-6">
        <CalendarView
          availability={availabilityBlocks}
          events={events}
          onSelectPlan={(plan) => openPlanDetail(plan)}
          onSelectBlock={(blk) => openEditAvailability(blk)}
          onAddAvailability={(date) => openAddAvailability(date)}
          onCreatePlan={(date) => openCreatePlan(date)}
        />
      </div>
    </AppShell>
  )
}
