'use client'

import React from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useCalendar } from '@/context/CalendarContext'
import { useModal } from '@/context/ModalContext'
import { FindTimeView } from '@/components/find-time/FindTimeView'

export default function FindTimePage() {
  const { availabilityBlocks, events } = useCalendar()
  const { openAddAvailability, openCreatePlan } = useModal()

  return (
    <AppShell>
      <FindTimeView
        availability={availabilityBlocks}
        events={events}
        onCreatePlanFromOverlap={(start, end) => openCreatePlan(undefined, start, end)}
        onAddAvailability={() => openAddAvailability()}
      />
    </AppShell>
  )
}
