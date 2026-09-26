export interface TimezoneOption {
  value: string
  label: string
  country: string
  flag: string
  popular?: boolean
}

export const POPULAR_TIMEZONES: TimezoneOption[] = [
  {
    value: 'Asia/Kolkata',
    label: 'India Standard Time (IST)',
    country: 'India',
    flag: '🇮🇳',
    popular: true,
  },
  {
    value: 'Europe/Amsterdam',
    label: 'Central European Time (CET/CEST)',
    country: 'Netherlands',
    flag: '🇳🇱',
    popular: true,
  },
  {
    value: 'Europe/London',
    label: 'Greenwich Mean Time / BST',
    country: 'United Kingdom',
    flag: '🇬🇧',
    popular: true,
  },
  {
    value: 'America/New_York',
    label: 'Eastern Time (ET)',
    country: 'United States',
    flag: '🇺🇸',
    popular: true,
  },
  {
    value: 'America/Los_Angeles',
    label: 'Pacific Time (PT)',
    country: 'United States',
    flag: '🇺🇸',
    popular: true,
  },
  {
    value: 'America/Chicago',
    label: 'Central Time (CT)',
    country: 'United States',
    flag: '🇺🇸',
  },
  {
    value: 'America/Toronto',
    label: 'Eastern Time - Toronto',
    country: 'Canada',
    flag: '🇨🇦',
  },
  {
    value: 'Europe/Berlin',
    label: 'Central European Time - Germany',
    country: 'Germany',
    flag: '🇩🇪',
  },
  {
    value: 'Europe/Paris',
    label: 'Central European Time - France',
    country: 'France',
    flag: '🇫🇷',
  },
  {
    value: 'Asia/Dubai',
    label: 'Gulf Standard Time (GST)',
    country: 'United Arab Emirates',
    flag: '🇦🇪',
  },
  {
    value: 'Asia/Singapore',
    label: 'Singapore Standard Time (SGT)',
    country: 'Singapore',
    flag: '🇸🇬',
  },
  {
    value: 'Asia/Tokyo',
    label: 'Japan Standard Time (JST)',
    country: 'Japan',
    flag: '🇯🇵',
  },
  {
    value: 'Australia/Sydney',
    label: 'Australian Eastern Time (AEST/AEDT)',
    country: 'Australia',
    flag: '🇦🇺',
  },
  {
    value: 'Pacific/Auckland',
    label: 'New Zealand Time (NZST/NZDT)',
    country: 'New Zealand',
    flag: '🇳🇿',
  },
]

export function getCountryFlag(countryOrTz?: string | null): string {
  if (!countryOrTz) return '🌍'
  const match = POPULAR_TIMEZONES.find(
    (tz) =>
      tz.country.toLowerCase() === countryOrTz.toLowerCase() ||
      tz.value.toLowerCase() === countryOrTz.toLowerCase()
  )
  if (match) return match.flag

  if (countryOrTz.includes('India') || countryOrTz.includes('Kolkata')) return '🇮🇳'
  if (countryOrTz.includes('Netherlands') || countryOrTz.includes('Amsterdam')) return '🇳🇱'
  if (countryOrTz.includes('United States') || countryOrTz.includes('New_York') || countryOrTz.includes('Los_Angeles')) return '🇺🇸'
  if (countryOrTz.includes('United Kingdom') || countryOrTz.includes('London')) return '🇬🇧'
  if (countryOrTz.includes('Germany') || countryOrTz.includes('Berlin')) return '🇩🇪'
  if (countryOrTz.includes('France') || countryOrTz.includes('Paris')) return '🇫🇷'
  if (countryOrTz.includes('Canada')) return '🇨🇦'
  if (countryOrTz.includes('Australia')) return '🇦🇺'
  if (countryOrTz.includes('Singapore')) return '🇸🇬'
  if (countryOrTz.includes('Japan') || countryOrTz.includes('Tokyo')) return '🇯🇵'
  return '🌍'
}

/**
 * Formats a Date/ISO string to time in given IANA timezone with 12-hour format (e.g. "8:30 PM")
 */
export function formatTimeInTz(date: Date | string, timezone: string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '--:--'
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d)
  } catch (err) {
    console.error('Error formatting time in timezone', timezone, err)
    return '--:--'
  }
}

/**
 * Formats a Date/ISO string to time with timezone abbreviation (e.g. "11:32 PM IST" or "8:02 PM CEST")
 */
export function formatTimeWithAbbr(date: Date | string, timezone: string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '--:--'
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(d)
  } catch (err) {
    return formatTimeInTz(date, timezone)
  }
}

/**
 * Gets timezone short abbreviation (e.g. "IST", "CET", "CEST", "EDT") for a given date and timezone
 */
export function getTimezoneAbbreviation(date: Date | string, timezone: string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      timeZoneName: 'short',
    }).formatToParts(d)
    const tzPart = parts.find((p) => p.type === 'timeZoneName')
    return tzPart?.value || timezone.split('/').pop() || 'UTC'
  } catch {
    return timezone.split('/').pop() || 'UTC'
  }
}

/**
 * Formats a Date/ISO string to a human-friendly date in the specified timezone (e.g. "Tomorrow", "Today", "Sat, Oct 10")
 */
export function formatDateInTz(date: Date | string, timezone: string): string {
  try {
    const targetDate = typeof date === 'string' ? new Date(date) : date
    if (isNaN(targetDate.getTime())) return ''

    const now = new Date()

    const targetDayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(targetDate)

    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(tomorrow)

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(yesterday)

    if (targetDayStr === todayStr) return 'Today'
    if (targetDayStr === tomorrowStr) return 'Tomorrow'
    if (targetDayStr === yesterdayStr) return 'Yesterday'

    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(targetDate)
  } catch (err) {
    return ''
  }
}

/**
 * Formats full date and time for cards (e.g., "Saturday, Oct 10 · 8:30 PM IST")
 */
export function formatFullDateTimeInTz(date: Date | string, timezone: string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''
    const datePart = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(d)
    const timePart = formatTimeWithAbbr(d, timezone)
    return `${datePart} · ${timePart}`
  } catch {
    return ''
  }
}

/**
 * Formats a time range in a given timezone (e.g. "8:30 PM – 10:00 PM IST")
 */
export function formatTimeRangeInTz(
  start: Date | string,
  end: Date | string,
  timezone: string,
  includeAbbr = true
): string {
  const startTime = formatTimeInTz(start, timezone)
  const endTime = formatTimeInTz(end, timezone)
  const abbr = includeAbbr ? ` ${getTimezoneAbbreviation(start, timezone)}` : ''
  return `${startTime} – ${endTime}${abbr}`
}

/**
 * Converts a local date string (YYYY-MM-DD) and time string (HH:mm) in a given IANA timezone into a UTC ISO string.
 * This takes into account Daylight Saving Time correctly.
 */
export function localToUtcIso(dateStr: string, timeStr: string, timezone: string): string {
  // We can construct a target moment using Intl or Date manipulation
  // We parse year, month, day, hour, minute
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  // Approximation in UTC first
  const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))

  // Find the exact offset in milliseconds for the target timezone at this timestamp
  // Using Intl.DateTimeFormat parts to get exact local time in target timezone
  const getOffsetMs = (utcTime: Date): number => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    })
    const parts = formatter.formatToParts(utcTime)
    let pY = 0, pM = 0, pD = 0, pH = 0, pMin = 0, pS = 0
    for (const part of parts) {
      if (part.type === 'year') pY = parseInt(part.value, 10)
      if (part.type === 'month') pM = parseInt(part.value, 10)
      if (part.type === 'day') pD = parseInt(part.value, 10)
      if (part.type === 'hour') pH = parseInt(part.value, 10) % 24
      if (part.type === 'minute') pMin = parseInt(part.value, 10)
      if (part.type === 'second') pS = parseInt(part.value, 10)
    }
    const localInUtcMs = Date.UTC(pY, pM - 1, pD, pH, pMin, pS, 0)
    return localInUtcMs - utcTime.getTime()
  }

  // Iteratively refine to handle DST transition boundary
  let offset = getOffsetMs(approxUtc)
  let exactUtcTime = new Date(approxUtc.getTime() - offset)
  // Check once more in case offset changed due to DST boundary crossing
  const finalOffset = getOffsetMs(exactUtcTime)
  if (finalOffset !== offset) {
    exactUtcTime = new Date(approxUtc.getTime() - finalOffset)
  }

  return exactUtcTime.toISOString()
}

/**
 * Converts a UTC Date/ISO string to local "YYYY-MM-DD" and "HH:mm" in given timezone
 */
export function utcToLocalDateAndTimeString(
  utcIso: string,
  timezone: string
): { dateStr: string; timeStr: string } {
  try {
    const d = new Date(utcIso)
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(d)
    let y = '2026', m = '01', day = '01', hr = '00', min = '00'
    for (const p of parts) {
      if (p.type === 'year') y = p.value
      if (p.type === 'month') m = p.value
      if (p.type === 'day') day = p.value
      if (p.type === 'hour') hr = p.value
      if (p.type === 'minute') min = p.value
    }
    return {
      dateStr: `${y}-${m}-${day}`,
      timeStr: `${hr}:${min}`,
    }
  } catch {
    const now = new Date()
    return {
      dateStr: now.toISOString().split('T')[0],
      timeStr: '12:00',
    }
  }
}
