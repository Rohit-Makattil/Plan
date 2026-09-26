export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  name: string
  country: string | null
  timezone: string
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface SharedCalendar {
  id: string
  name: string
  created_by: string
  invite_code: string
  created_at: string
}

export interface CalendarMember {
  id: string
  calendar_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  profile?: Profile
}

export type AvailabilityType = 'FREE' | 'BUSY'

export interface AvailabilityBlock {
  id: string
  calendar_id: string
  user_id: string
  type: AvailabilityType
  start_time: string // ISO UTC
  end_time: string   // ISO UTC
  recurrence_rule: string | null
  created_at: string
  updated_at: string
  profile?: Profile
}

export type EventAudience = 'TOGETHER' | 'FRIENDS'

export interface CalendarEvent {
  id: string
  calendar_id: string
  created_by: string
  title: string
  description: string | null
  type: 'PLAN'
  start_time: string // ISO UTC
  end_time: string   // ISO UTC
  location: string | null
  audience: EventAudience
  created_at: string
  updated_at: string
  creator_profile?: Profile
}

export interface TimeSlotOverlap {
  id: string
  start_time: string // ISO UTC
  end_time: string   // ISO UTC
  durationMinutes: number
  dateLabel: string
  user1: {
    id: string
    name: string
    timezone: string
    country: string | null
    formattedTime: string
  }
  user2: {
    id: string
    name: string
    timezone: string
    country: string | null
    formattedTime: string
  }
}
