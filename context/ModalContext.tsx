'use client'

import React, { createContext, useContext, useState } from 'react'
import { AvailabilityBlock, CalendarEvent } from '@/types/database'

interface ModalContextType {
  // Availability Modal
  isAvailabilityOpen: boolean
  selectedBlock: AvailabilityBlock | null
  availabilityDate?: string
  openAddAvailability: (date?: string) => void
  openEditAvailability: (block: AvailabilityBlock) => void
  closeAvailability: () => void

  // Create Plan Modal
  isCreatePlanOpen: boolean
  selectedPlanForEdit: CalendarEvent | null
  planInitialDate?: string
  planInitialStart?: string
  planInitialEnd?: string
  openCreatePlan: (date?: string, startIso?: string, endIso?: string) => void
  openEditPlan: (plan: CalendarEvent) => void
  closeCreatePlan: () => void

  // Plan Detail Modal
  isPlanDetailOpen: boolean
  selectedPlanDetail: CalendarEvent | null
  openPlanDetail: (plan: CalendarEvent) => void
  closePlanDetail: () => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<AvailabilityBlock | null>(null)
  const [availabilityDate, setAvailabilityDate] = useState<string | undefined>(undefined)

  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false)
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<CalendarEvent | null>(null)
  const [planInitialDate, setPlanInitialDate] = useState<string | undefined>(undefined)
  const [planInitialStart, setPlanInitialStart] = useState<string | undefined>(undefined)
  const [planInitialEnd, setPlanInitialEnd] = useState<string | undefined>(undefined)

  const [isPlanDetailOpen, setIsPlanDetailOpen] = useState(false)
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<CalendarEvent | null>(null)

  const openAddAvailability = (date?: string) => {
    setSelectedBlock(null)
    setAvailabilityDate(date)
    setIsAvailabilityOpen(true)
  }

  const openEditAvailability = (block: AvailabilityBlock) => {
    setSelectedBlock(block)
    setIsAvailabilityOpen(true)
  }

  const closeAvailability = () => {
    setIsAvailabilityOpen(false)
    setSelectedBlock(null)
    setAvailabilityDate(undefined)
  }

  const openCreatePlan = (date?: string, startIso?: string, endIso?: string) => {
    setSelectedPlanForEdit(null)
    setPlanInitialDate(date)
    setPlanInitialStart(startIso)
    setPlanInitialEnd(endIso)
    setIsCreatePlanOpen(true)
  }

  const openEditPlan = (plan: CalendarEvent) => {
    setSelectedPlanForEdit(plan)
    setIsPlanDetailOpen(false)
    setIsCreatePlanOpen(true)
  }

  const closeCreatePlan = () => {
    setIsCreatePlanOpen(false)
    setSelectedPlanForEdit(null)
    setPlanInitialDate(undefined)
    setPlanInitialStart(undefined)
    setPlanInitialEnd(undefined)
  }

  const openPlanDetail = (plan: CalendarEvent) => {
    setSelectedPlanDetail(plan)
    setIsPlanDetailOpen(true)
  }

  const closePlanDetail = () => {
    setIsPlanDetailOpen(false)
    setSelectedPlanDetail(null)
  }

  return (
    <ModalContext.Provider
      value={{
        isAvailabilityOpen,
        selectedBlock,
        availabilityDate,
        openAddAvailability,
        openEditAvailability,
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
        openPlanDetail,
        closePlanDetail,
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
