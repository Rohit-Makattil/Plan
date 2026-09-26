'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Clock, HeartHandshake, Sparkles, Settings, Plus, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { formatTimeWithAbbr, getCountryFlag } from '@/lib/timezones'
import { UserAvatar } from '../ui/UserAvatar'

interface NavbarProps {
  onOpenCreatePlan?: () => void
  onOpenAddAvailability?: () => void
}

export function Navbar({ onOpenCreatePlan, onOpenAddAvailability }: NavbarProps) {
  const pathname = usePathname()
  const { user, profile, partner, signOut } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Keep live time ticking every 10s for header
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const navItems = [
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Find Time', href: '/find-time', icon: Sparkles },
    { label: 'Plans', href: '/plans', icon: HeartHandshake },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  const userTimezone = profile?.timezone || 'Asia/Kolkata'
  const partnerTimezone = partner?.timezone || 'Europe/Amsterdam'

  return (
    <header className="sticky top-0 z-40 bg-warm-50/85 backdrop-blur-md border-b border-warm-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-warm-800 flex items-center justify-center text-white shadow-soft-sm group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-warm-900 tracking-tight block leading-tight">
              TogetherTime
            </span>
            <span className="text-[10px] text-warm-600 font-medium tracking-wide block uppercase">
              Stay in Sync
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-warm-200/50 p-1 rounded-2xl border border-warm-300/40">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href || (item.href === '/calendar' && pathname === '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-warm-900 shadow-soft-sm'
                    : 'text-warm-700 hover:text-warm-950 hover:bg-white/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-warm-800' : 'text-warm-500'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right: Quick Clocks & Actions */}
        <div className="flex items-center gap-3">
          {/* Dual Local Time Quick Bar (Desktop) */}
          {profile && (
            <div className="hidden lg:flex items-center gap-2 text-xs bg-white/70 py-1.5 px-3 rounded-full border border-warm-200/80 shadow-soft-sm text-warm-800">
              <div className="flex items-center gap-1.5">
                <span>{getCountryFlag(profile.country)}</span>
                <span className="font-medium">{profile.name.split(' ')[0]}:</span>
                <span className="font-bold text-warm-950">
                  {formatTimeWithAbbr(currentTime, userTimezone)}
                </span>
              </div>
              {partner && (
                <>
                  <span className="text-warm-300">|</span>
                  <div className="flex items-center gap-1.5">
                    <span>{getCountryFlag(partner.country)}</span>
                    <span className="font-medium">{partner.name.split(' ')[0]}:</span>
                    <span className="font-bold text-warm-950">
                      {formatTimeWithAbbr(currentTime, partnerTimezone)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Quick Action Buttons */}
          {onOpenCreatePlan && (
            <button
              onClick={onOpenCreatePlan}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warm-800 hover:bg-warm-900 text-white text-xs font-semibold shadow-soft-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Plan</span>
            </button>
          )}

          {/* User Avatar */}
          {profile && (
            <Link href="/settings" className="hover:opacity-90 transition-opacity">
              <UserAvatar
                name={profile.name}
                country={profile.country}
                size="sm"
                className="cursor-pointer"
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
