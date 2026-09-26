'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { CalendarMember, Profile, SharedCalendar } from '@/types/database'
import { generateRandomInviteCode } from '@/lib/utils'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  calendar: SharedCalendar | null
  membership: CalendarMember | null
  partner: Profile | null
  loading: boolean
  calendarLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    password: string,
    name: string,
    country?: string,
    timezone?: string
  ) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>
  createCalendar: (name: string) => Promise<{ calendar: SharedCalendar | null; error: Error | null }>
  joinCalendar: (inviteCode: string) => Promise<{ success: boolean; error: string | null }>
  refreshProfile: () => Promise<void>
  refreshCalendar: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [calendar, setCalendar] = useState<SharedCalendar | null>(null)
  const [membership, setMembership] = useState<CalendarMember | null>(null)
  const [partner, setPartner] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [calendarLoading, setCalendarLoading] = useState(true)

  // Fetch User Profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      }

      if (data) {
        setProfile(data as Profile)
        return data as Profile
      }
      return null
    } catch (err) {
      console.error('Fetch profile exception:', err)
      return null
    }
  }, [supabase])

  // Fetch Calendar & Partner info
  const fetchCalendarData = useCallback(async (userId: string) => {
    setCalendarLoading(true)
    try {
      // Find calendar membership for this user
      const { data: memberRows, error: memberErr } = await supabase
        .from('calendar_members')
        .select('*, shared_calendars (*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(1)

      if (memberErr) {
        console.error('Error fetching calendar members:', memberErr)
        setCalendar(null)
        setMembership(null)
        setPartner(null)
        setCalendarLoading(false)
        return
      }

      if (!memberRows || memberRows.length === 0) {
        setCalendar(null)
        setMembership(null)
        setPartner(null)
        setCalendarLoading(false)
        return
      }

      const activeMember = memberRows[0]
      setMembership({
        id: activeMember.id,
        calendar_id: activeMember.calendar_id,
        user_id: activeMember.user_id,
        role: activeMember.role,
        joined_at: activeMember.joined_at,
      })

      const activeCal = activeMember.shared_calendars as unknown as SharedCalendar
      setCalendar(activeCal)

      // Fetch partner info (the other member in this calendar)
      const { data: allMembers, error: allMembersErr } = await supabase
        .from('calendar_members')
        .select('user_id, role')
        .eq('calendar_id', activeMember.calendar_id)

      if (allMembersErr) {
        console.error('Error fetching all members:', allMembersErr)
      } else if (allMembers) {
        const partnerRow = allMembers.find((m) => m.user_id !== userId)
        if (partnerRow) {
          const { data: partnerProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', partnerRow.user_id)
            .maybeSingle()
          setPartner((partnerProf as Profile) || null)
        } else {
          setPartner(null)
        }
      }
    } catch (err) {
      console.error('Error in fetchCalendarData:', err)
    } finally {
      setCalendarLoading(false)
    }
  }, [supabase])

  // Load initial session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id)
          await fetchCalendarData(initialSession.user.id)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user) {
        await fetchProfile(newSession.user.id)
        await fetchCalendarData(newSession.user.id)
      } else {
        setProfile(null)
        setCalendar(null)
        setMembership(null)
        setPartner(null)
      }
      setLoading(false)
    })

    return () => {
      authListener.unsubscribe()
    }
  }, [supabase, fetchProfile, fetchCalendarData])

  // Realtime subscription for calendar members and partner profile updates
  useEffect(() => {
    if (!calendar || !user) return

    const channel = supabase
      .channel(`calendar-members-${calendar.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_members',
          filter: `calendar_id=eq.${calendar.id}`,
        },
        () => {
          fetchCalendarData(user.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          if (partner && payload.new && payload.new.id === partner.id) {
            setPartner(payload.new as Profile)
          } else if (payload.new && payload.new.id === user.id) {
            setProfile(payload.new as Profile)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [calendar, user, partner, supabase, fetchCalendarData])

  // Sign In
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { error }

      if (data.user) {
        await fetchProfile(data.user.id)
        await fetchCalendarData(data.user.id)
      }
      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  // Sign Up
  const signUp = async (
    email: string,
    password: string,
    name: string,
    country?: string,
    timezone?: string
  ) => {
    try {
      const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            country: country || 'India',
            timezone: tz,
          },
        },
      })

      if (error) return { error }

      if (data.user) {
        // Create initial profile record
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name,
          country: country || 'India',
          timezone: tz,
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          console.error('Profile creation error during signup:', profileError)
        }

        await fetchProfile(data.user.id)
      }

      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  // Sign Out
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setCalendar(null)
    setMembership(null)
    setPartner(null)
  }

  // Update Profile
  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: new Error('User not authenticated') }
    try {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) return { error }
      if (updated) setProfile(updated as Profile)
      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  // Create Shared Calendar
  const createCalendar = async (name: string) => {
    if (!user) return { calendar: null, error: new Error('User not authenticated') }
    try {
      const inviteCode = generateRandomInviteCode()

      // 1. Insert calendar
      const { data: newCal, error: calErr } = await supabase
        .from('shared_calendars')
        .insert({
          name: name.trim(),
          created_by: user.id,
          invite_code: inviteCode,
        })
        .select()
        .single()

      if (calErr || !newCal) {
        return { calendar: null, error: calErr || new Error('Failed to create calendar') }
      }

      // 2. Insert owner membership
      const { data: member, error: memberErr } = await supabase
        .from('calendar_members')
        .insert({
          calendar_id: newCal.id,
          user_id: user.id,
          role: 'owner',
        })
        .select()
        .single()

      if (memberErr) {
        return { calendar: null, error: memberErr }
      }

      setCalendar(newCal as SharedCalendar)
      setMembership(member as CalendarMember)
      return { calendar: newCal as SharedCalendar, error: null }
    } catch (err: any) {
      return { calendar: null, error: err }
    }
  }

  // Join Shared Calendar via invite code
  const joinCalendar = async (inviteCode: string) => {
    if (!user) return { success: false, error: 'User not authenticated' }
    try {
      const code = inviteCode.trim().toUpperCase()
      // Try direct RPC function first
      const { data: rpcData, error: rpcErr } = await supabase.rpc('join_calendar_by_code', {
        p_invite_code: code,
      })

      if (!rpcErr && rpcData) {
        if (rpcData.success) {
          await fetchCalendarData(user.id)
          return { success: true, error: null }
        }
        return { success: false, error: rpcData.error || 'Failed to join calendar.' }
      }

      // Fallback: Direct table lookup if RPC is not present
      const { data: cal, error: calErr } = await supabase
        .from('shared_calendars')
        .select('*')
        .ilike('invite_code', code)
        .maybeSingle()

      if (calErr || !cal) {
        return { success: false, error: 'Invalid invite code. Please check and try again.' }
      }

      // Check member count
      const { count, error: countErr } = await supabase
        .from('calendar_members')
        .select('*', { count: 'exact', head: true })
        .eq('calendar_id', cal.id)

      if (countErr) {
        return { success: false, error: 'Failed to verify calendar capacity.' }
      }

      if ((count ?? 0) >= 2) {
        return { success: false, error: 'This shared calendar already has the maximum of 2 members.' }
      }

      // Insert membership
      const { error: insertErr } = await supabase.from('calendar_members').insert({
        calendar_id: cal.id,
        user_id: user.id,
        role: 'member',
      })

      if (insertErr) {
        if (insertErr.message?.includes('duplicate')) {
          await fetchCalendarData(user.id)
          return { success: true, error: null }
        }
        return { success: false, error: insertErr.message }
      }

      await fetchCalendarData(user.id)
      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred while joining' }
    }
  }

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  const refreshCalendar = useCallback(async () => {
    if (user) await fetchCalendarData(user.id)
  }, [user, fetchCalendarData])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        calendar,
        membership,
        partner,
        loading,
        calendarLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        createCalendar,
        joinCalendar,
        refreshProfile,
        refreshCalendar,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
