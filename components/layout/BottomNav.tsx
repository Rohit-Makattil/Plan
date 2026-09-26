'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Sparkles, HeartHandshake, Settings, Plus } from 'lucide-react'

interface BottomNavProps {
  onOpenCreatePlan?: () => void
}

export function BottomNav({ onOpenCreatePlan }: BottomNavProps) {
  const pathname = usePathname()

  const navItems = [
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Find Time', href: '/find-time', icon: Sparkles },
    { label: 'Plans', href: '/plans', icon: HeartHandshake },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-warm-50/95 backdrop-blur-lg border-t border-warm-200/80 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-soft-lg">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || (item.href === '/calendar' && pathname === '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive ? 'text-warm-900 font-bold' : 'text-warm-500 hover:text-warm-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-warm-200/70 text-warm-900' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          )
        })}

        {/* Center Quick Create Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={onOpenCreatePlan}
            type="button"
            className="w-12 h-12 -mt-5 rounded-full bg-warm-800 text-white shadow-soft flex items-center justify-center hover:bg-warm-900 active:scale-95 transition-all border-2 border-warm-50"
            aria-label="Create Plan"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {navItems.slice(2, 4).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive ? 'text-warm-900 font-bold' : 'text-warm-500 hover:text-warm-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-warm-200/70 text-warm-900' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
