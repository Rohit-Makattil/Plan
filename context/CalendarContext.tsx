'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityBlock, CalendarEvent, AvailabilityType, EventAudience } from '@/types/database'
import { useAuth } from './AuthContext'

interface CalendarContextType {
  availabilityBlocks: AvailabilityBlock[]
  events: CalendarEvent[]
  loading: boolean
  addAvailability: (data: {
    type: AvailabilityType
    startTime: string // ISO UTC
    endTime: string   // ISO UTC
    recurrenceRule?: string | null
  }) => Promise<{ error: Error | null; data?: AvailabilityBlock }>
  updateAvailability: (
    id: string,
    data: {
      type?: AvailabilityType
      startTime?: string
      endTime?: string
      recurrenceRule?: string | null
    }
  ) => Promise<{ error: Error | null }>
  deleteAvailability: (id: string) => Promise<{ error: Error | null }>
  addEvent: (data: {
    title: string
    description?: string | null
    startTime: string // ISO UTC
    endTime: string   // ISO UTC
    location?: string | null
    audience?: EventAudience
  }) => Promise<{ error: Error | null; data?: CalendarEvent }>
  updateEvent: (
    id: string,
    data: {
      title?: string
      description?: string | null
      startTime?: string
      endTime?: string
      location?: string | null
      audience?: EventAudience
    }
  ) => Promise<{ error: Error | null }>
  deleteEvent: (id: string) => Promise<{ error: Error | null }>
  refreshCalendarData: () => Promise<void>
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient())
  const { user, profile, partner, calendar } = useAuth()
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch all calendar availability & events
  const fetchAllCalendarData = useCallback(async () => {
    if (!calendar?.id) {
      setAvailabilityBlocks([])
      setEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // 1. Fetch Availability Blocks
      const { data: availData, error: availErr } = await supabase
        .from('availability_blocks')
        .select('*')
        .eq('calendar_id', calendar.id)
        .order('start_time', { ascending: true })

      if (availErr) {
        console.error('Error fetching availability:', availErr)
      }

      // 2. Fetch Events
      const { data: eventsData, error: eventsErr } = await supabase
        .from('events')
        .select('*')
        .eq('calendar_id', calendar.id)
        .order('start_time', { ascending: true })

      if (eventsErr) {
        console.error('Error fetching events:', eventsErr)
      }

      // Collect user profiles needed
      const userIds = new Set<string>()
      availData?.forEach((b) => userIds.add(b.user_id))
      eventsData?.forEach((e) => userIds.add(e.created_by))

      const profileMap = new Map<string, any>()
      if (profile?.id) profileMap.set(profile.id, profile)
      if (partner?.id) profileMap.set(partner.id, partner)

      const missingIds = Array.from(userIds).filter((id) => !profileMap.has(id))
      if (missingIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('*')
          .in('id', missingIds)
        profs?.forEach((p) => profileMap.set(p.id, p))
      }

      if (availData) {
        setAvailabilityBlocks(
          availData.map((item) => ({
            ...item,
            profile: profileMap.get(item.user_id) || undefined,
          })) as AvailabilityBlock[]
        )
      }

      if (eventsData) {
        setEvents(
          eventsData.map((item) => ({
            ...item,
            creator_profile: profileMap.get(item.created_by) || undefined,
          })) as CalendarEvent[]
        )
      }
    } catch (err) {
      console.error('Exception fetching calendar data:', err)
    } finally {
      setLoading(false)
    }
  }, [calendar?.id, profile, partner, supabase])

  // Initial load
  useEffect(() => {
    fetchAllCalendarData()
  }, [fetchAllCalendarData])

  // Supabase Realtime Subscription for Live Updates
  useEffect(() => {
    if (!calendar?.id) return

    const channel = supabase
      .channel(`calendar-realtime-${calendar.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability_blocks',
          filter: `calendar_id=eq.${calendar.id}`,
        },
        () => {
          fetchAllCalendarData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `calendar_id=eq.${calendar.id}`,
        },
        () => {
          fetchAllCalendarData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [calendar?.id, supabase, fetchAllCalendarData])

  // Add Availability
  const addAvailability = async ({
    type,
    startTime,
    endTime,
    recurrenceRule,
  }: {
    type: AvailabilityType
    startTime: string
    endTime: string
    recurrenceRule?: string | null
  }) => {
    if (!user || !calendar) return { error: new Error('Missing user or calendar context') }

    try {
      const { data, error } = await supabase
        .from('availability_blocks')
        .insert({
          calendar_id: calendar.id,
          user_id: user.id,
          type,
          start_time: startTime,
          end_time: endTime,
          recurrence_rule: recurrenceRule || null,
        })
        .select('*')
        .single()

      if (error) return { error }
      const newBlock: AvailabilityBlock = {
        ...(data as any),
        profile: profile || undefined,
      }
      await fetchAllCalendarData()
      return { error: null, data: newBlock }
    } catch (err: any) {
      return { error: err }
    }
  }

  // Update Availability
  const updateAvailability = async (
    id: string,
    {
      type,
      startTime,
      endTime,
      recurrenceRule,
    }: {
      type?: AvailabilityType
      startTime?: string
      endTime?: string
      recurrenceRule?: string | null
    }
  ) => {
    if (!user) return { error: new Error('Not authenticated') }

    try {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }
      if (type) updatePayload.type = type
      if (startTime) updatePayload.start_time = startTime
      if (endTime) updatePayload.end_time = endTime
      if (recurrenceRule !== undefined) updatePayload.recurrence_rule = recurrenceRule

      const { error } = await supabase
        .from('availability_blocks')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) return { error }
      await fetchAllCalendarData()
      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  // Delete Availability
  const deleteAvailability = async (id: string) => {
    if (!user) return { error: new Error('Not authenticated') }

    try {
      const { error } = await supabase
        .from('availability_blocks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) return { error }
      await fetchAllCalendarData()
      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  // Add Event / Plan
  const addEvent = async ({
    title,
    description,
    startTime,
    endTime,
    location,
    audience = 'TOGETHER',
  }: {
    title: string
    description?: string | null
    startTime: string
    endTime: string
    location?: string | null
    audience?: EventAudience
  }) => {
    if (!user || !calendar) return { error: new Error('Missing user or calendar context') }

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          calendar_id: calendar.id,
          created_by: user.id,
          title: title.trim(),
          description: description ? description.trim() : null,
          type: 'PLAN',
          start_time: startTime,
          end_time: endTime,
          location: location ? location.trim() : null,
          audience,
        })
        .select('*')
        .single()

      if (error) return { error }
      const newEvent: CalendarEvent = {
        ...(data as any),
        creator_profile: profile || undefined,
      }
      await fetchAllCalendarData()
      return { error: null, data: newEvent }
    } catch (err: any) {
      return { error: err }
    }
  }

  // Update Event
  const updateEvent = async (
    id: string,
    {
      title,
      description,
      startTime,
      endTime,
      location,
      audience,
    }: {
      title?: string
      description?: string | null
      startTime?: string
      endTime?: string
      location?: string | null
      audience?: EventAudience
    }
  ) => {
    if (!user || !calendar) return { error: new Error('Not authenticated') }

    try {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }
      if (title !== undefined) updatePayload.title = title.trim()
      if (description !== undefined) updatePayload.description = description ? description.trim() : null
      if (startTime !== undefined) updatePayload.start_time = startTime
      if (endTime !== undefined) updatePayload.end_time = endTime
      if (location !== undefined) updatePayload.location = location ? location.trim() : null
      if (audience !== undefined) updatePayload.audience = audience

      const { error } = await supabase
        .from('events')
        .update(updatePayload)
        .eq('id', id)
        .eq('calendar_id', calendar.id)

      if (error) return { error }
      await fetchAllCalendarData()
      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  // Delete Event
  const deleteEvent = async (id: string) => {
    if (!user || !calendar) return { error: new Error('Not authenticated') }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
        .eq('calendar_id', calendar.id)

      if (error) return { error }
      await fetchAllCalendarData()
      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  return (
    <CalendarContext.Provider
      value={{
        availabilityBlocks,
        events,
        loading,
        addAvailability,
        updateAvailability,
        deleteAvailability,
        addEvent,
        updateEvent,
        deleteEvent,
        refreshCalendarData: fetchAllCalendarData,
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}
