'use client'

import React, { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  formatTimeInTz,
  getTimezoneAbbreviation,
  getCountryFlag,
} from '@/lib/timezones'
import { UserAvatar } from '../ui/UserAvatar'

export function LiveClockCard() {
  const { profile, partner } = useAuth()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const userTz = profile?.timezone || 'Asia/Kolkata'
  const partnerTz = partner?.timezone || 'Europe/Amsterdam'

  const userTimeStr = formatTimeInTz(now, userTz)
  const userAbbr = getTimezoneAbbreviation(now, userTz)

  const partnerTimeStr = partner ? formatTimeInTz(now, partnerTz) : '--:--'
  const partnerAbbr = partner ? getTimezoneAbbreviation(now, partnerTz) : ''

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* YOU Card */}
      <div className="relative overflow-hidden rounded-ios-lg bg-gradient-to-br from-white via-warm-50 to-warm-100/60 border border-warm-200/80 p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-warm-600">
            YOU
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={profile?.name || 'You'}
              country={profile?.country}
              size="lg"
            />
            <div>
              <h3 className="text-base font-bold font-display text-warm-900 leading-tight">
                {profile?.name || 'Your Profile'}
              </h3>
              <p className="text-xs text-warm-600 font-medium">
                {profile?.country || 'Local'} · {userAbbr}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-warm-950 tracking-tight">
              {userTimeStr}
            </div>
          </div>
        </div>
      </div>

      {/* PARTNER Card */}
      <div className="relative overflow-hidden rounded-ios-lg bg-gradient-to-br from-white via-warm-50 to-warm-100/60 border border-warm-200/80 p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-warm-600">
            {partner ? partner.name.toUpperCase() : 'PARTNER'}
          </span>
          {partner && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {partner ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={partner.name}
                country={partner.country}
                size="lg"
              />
              <div>
                <h3 className="text-base font-bold font-display text-warm-900 leading-tight">
                  {partner.name}
                </h3>
                <p className="text-xs text-warm-600 font-medium">
                  {partner.country || 'Partner'} · {partnerAbbr}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-warm-950 tracking-tight">
                {partnerTimeStr}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <div>
              <h3 className="text-sm font-semibold text-warm-800">
                Partner not connected yet
              </h3>
              <p className="text-xs text-warm-600 mt-0.5">
                Share invite code in Settings to sync clocks
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
