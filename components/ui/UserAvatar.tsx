import React from 'react'
import { getCountryFlag } from '@/lib/timezones'

interface UserAvatarProps {
  name: string
  country?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showFlag?: boolean
}

export function UserAvatar({
  name,
  country,
  size = 'md',
  className = '',
  showFlag = true,
}: UserAvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  const flag = getCountryFlag(country)

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-xl font-bold',
  }

  const flagSizeClasses = {
    sm: 'text-xs -bottom-1 -right-1',
    md: 'text-sm -bottom-1 -right-1',
    lg: 'text-base -bottom-1 -right-1',
    xl: 'text-lg -bottom-1.5 -right-1.5',
  }

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-warm-200 via-warm-300 to-warm-400 text-warm-900 flex items-center justify-center shadow-soft-sm font-display tracking-tight border border-warm-300/60`}
      >
        {initial}
      </div>
      {showFlag && (
        <span
          className={`absolute ${flagSizeClasses[size]} leading-none drop-shadow-sm filter`}
          title={country || ''}
        >
          {flag}
        </span>
      )}
    </div>
  )
}
