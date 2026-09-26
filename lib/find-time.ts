import { AvailabilityBlock, CalendarEvent, Profile, TimeSlotOverlap } from '@/types/database'
import {
  formatDateInTz,
  formatTimeRangeInTz,
  getCountryFlag,
} from './timezones'

interface Interval {
  start: number // ms timestamp
  end: number   // ms timestamp
}

/**
 * Merge overlapping or contiguous intervals
 */
function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const merged: Interval[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
    } else {
      merged.push(current)
    }
  }
  return merged
}

/**
 * Subtract busy intervals B from free intervals A (A \ B)
 */
function subtractIntervals(freeList: Interval[], busyList: Interval[]): Interval[] {
  if (busyList.length === 0) return freeList
  let result = [...freeList]

  for (const busy of busyList) {
    const nextResult: Interval[] = []
    for (const free of result) {
      if (busy.end <= free.start || busy.start >= free.end) {
        // No overlap
        nextResult.push(free)
      } else {
        // Overlap: subtract busy from free
        if (free.start < busy.start) {
          nextResult.push({ start: free.start, end: busy.start })
        }
        if (busy.end < free.end) {
          nextResult.push({ start: busy.end, end: free.end })
        }
      }
    }
    result = nextResult
  }

  return result
}

/**
 * Intersect two lists of intervals
 */
function intersectIntervals(list1: Interval[], list2: Interval[]): Interval[] {
  const overlaps: Interval[] = []
  let i = 0
  let j = 0

  const s1 = mergeIntervals(list1)
  const s2 = mergeIntervals(list2)

  while (i < s1.length && j < s2.length) {
    const start = Math.max(s1[i].start, s2[j].start)
    const end = Math.min(s1[i].end, s2[j].end)

    if (start < end) {
      overlaps.push({ start, end })
    }

    if (s1[i].end < s2[j].end) {
      i++
    } else {
      j++
    }
  }

  return overlaps
}

/**
 * Expand recurring availability blocks into explicit intervals between rangeStart and rangeEnd
 */
export function expandAvailability(
  blocks: AvailabilityBlock[],
  rangeStart: Date,
  rangeEnd: Date
): AvailabilityBlock[] {
  const expanded: AvailabilityBlock[] = []
  const startMs = rangeStart.getTime()
  const endMs = rangeEnd.getTime()

  for (const block of blocks) {
    const bStart = new Date(block.start_time).getTime()
    const bEnd = new Date(block.end_time).getTime()

    if (!block.recurrence_rule) {
      // Normal single occurrence
      if (bEnd >= startMs && bStart <= endMs) {
        expanded.push(block)
      }
    } else if (block.recurrence_rule.startsWith('WEEKLY')) {
      // Weekly recurrence: repeat every 7 days across the range
      const duration = bEnd - bStart
      const oneWeek = 7 * 24 * 60 * 60 * 1000

      // Find initial alignment
      let currentStart = bStart
      // Shift backward/forward to cover rangeStart to rangeEnd
      while (currentStart > startMs) {
        currentStart -= oneWeek
      }

      while (currentStart <= endMs) {
        const currentEnd = currentStart + duration
        if (currentEnd >= startMs && currentStart <= endMs) {
          expanded.push({
            ...block,
            id: `${block.id}_${currentStart}`,
            start_time: new Date(currentStart).toISOString(),
            end_time: new Date(currentEnd).toISOString(),
          })
        }
        currentStart += oneWeek
      }
    }
  }

  return expanded
}

/**
 * Calculates all overlapping free time intervals between two users
 */
export function calculateOverlaps(
  user1: Profile,
  user2: Profile,
  availabilityBlocks: AvailabilityBlock[],
  events: CalendarEvent[],
  rangeStart: Date = new Date(),
  rangeEnd: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
): TimeSlotOverlap[] {
  const expanded = expandAvailability(availabilityBlocks, rangeStart, rangeEnd)

  // 1. Gather FREE and BUSY intervals for User 1
  const u1Free: Interval[] = []
  const u1Busy: Interval[] = []

  // 2. Gather FREE and BUSY intervals for User 2
  const u2Free: Interval[] = []
  const u2Busy: Interval[] = []

  for (const block of expanded) {
    const interval: Interval = {
      start: new Date(block.start_time).getTime(),
      end: new Date(block.end_time).getTime(),
    }
    if (block.user_id === user1.id) {
      if (block.type === 'FREE') u1Free.push(interval)
      else u1Busy.push(interval)
    } else if (block.user_id === user2.id) {
      if (block.type === 'FREE') u2Free.push(interval)
      else u2Busy.push(interval)
    }
  }

  // 3. Add existing events as busy intervals for both users
  for (const event of events) {
    const interval: Interval = {
      start: new Date(event.start_time).getTime(),
      end: new Date(event.end_time).getTime(),
    }
    u1Busy.push(interval)
    u2Busy.push(interval)
  }

  // 4. Calculate Net Free Intervals for each user
  const u1NetFree = subtractIntervals(mergeIntervals(u1Free), mergeIntervals(u1Busy))
  const u2NetFree = subtractIntervals(mergeIntervals(u2Free), mergeIntervals(u2Busy))

  // 5. Intersect Free Intervals
  const overlaps = intersectIntervals(u1NetFree, u2NetFree)

  // 6. Filter out slots < 15 minutes and map to rich TimeSlotOverlap
  const nowMs = Date.now()
  const validOverlaps = overlaps
    .filter((slot) => slot.end > nowMs && slot.end - slot.start >= 15 * 60 * 1000)
    .sort((a, b) => a.start - b.start)

  return validOverlaps.map((slot, index) => {
    const startDate = new Date(slot.start)
    const endDate = new Date(slot.end)
    const durationMinutes = Math.round((slot.end - slot.start) / (60 * 1000))

    const dateLabel = formatDateInTz(startDate, user1.timezone)

    const u1TimeFormatted = formatTimeRangeInTz(startDate, endDate, user1.timezone, true)
    const u2TimeFormatted = formatTimeRangeInTz(startDate, endDate, user2.timezone, true)

    return {
      id: `overlap_${index}_${slot.start}`,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      durationMinutes,
      dateLabel,
      user1: {
        id: user1.id,
        name: user1.name,
        timezone: user1.timezone,
        country: user1.country,
        formattedTime: u1TimeFormatted,
      },
      user2: {
        id: user2.id,
        name: user2.name,
        timezone: user2.timezone,
        country: user2.country,
        formattedTime: u2TimeFormatted,
      },
    }
  })
}
