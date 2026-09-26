'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useModal } from '@/context/ModalContext'
import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'
import { LoginScreen, SignupScreen, CalendarSetupScreen } from '../auth/AuthScreens'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { AvailabilityModal } from '../calendar/AvailabilityModal'
import { CreatePlanModal } from '../calendar/CreatePlanModal'
import { PlanDetailModal } from '../calendar/PlanDetailModal'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user, calendar, loading, calendarLoading } = useAuth()
  const [authMode, setAuthMode] = React.useState<'login' | 'signup'>('login')

  const {
    isAvailabilityOpen,
    selectedBlock,
    availabilityDate,
    openAddAvailability,
    closeAvailability,

    isCreatePlanOpen,
    selectedPlanForEdit,
    planInitialDate,
    planInitialStart,
    planInitialEnd,
    openCreatePlan,
    openEditPlan,
    closeCreatePlan,

    isPlanDetailOpen,
    selectedPlanDetail,
    closePlanDetail,
  } = useModal()

  // Register PWA Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('TogetherTime Service Worker registered:', reg.scope)
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err)
        })
    }
  }, [])

  // 1. Loading State
  if (loading || (user && calendarLoading)) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading TogetherTime..." />
      </div>
    )
  }

  // 2. Unauthenticated State
  if (!user) {
    if (authMode === 'login') {
      return <LoginScreen onToggleMode={() => setAuthMode('signup')} />
    }
    return <SignupScreen onToggleMode={() => setAuthMode('login')} />
  }

  // 3. Authenticated but no shared calendar created or joined yet
  if (!calendar) {
    return <CalendarSetupScreen />
  }

  // 4. Authenticated Application Shell
  return (
    <div className="min-h-screen bg-warm-50 flex flex-col selection:bg-warm-200">
      <Navbar
        onOpenCreatePlan={() => openCreatePlan()}
        onOpenAddAvailability={() => openAddAvailability()}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-12">
        {children}
      </main>

      <BottomNav onOpenCreatePlan={() => openCreatePlan()} />

      {/* Global Modals */}
      <AvailabilityModal
        isOpen={isAvailabilityOpen}
        onClose={closeAvailability}
        initialBlock={selectedBlock}
        initialDate={availabilityDate}
      />

      <CreatePlanModal
        isOpen={isCreatePlanOpen}
        onClose={closeCreatePlan}
        initialPlan={selectedPlanForEdit}
        initialDate={planInitialDate}
        initialStartTime={planInitialStart}
        initialEndTime={planInitialEnd}
      />

      <PlanDetailModal
        isOpen={isPlanDetailOpen}
        onClose={closePlanDetail}
        plan={selectedPlanDetail}
        onEdit={openEditPlan}
      />
    </div>
  )
}
