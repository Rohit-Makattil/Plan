import {
  formatTimeInTz,
  formatTimeWithAbbr,
  getTimezoneAbbreviation,
  localToUtcIso,
  utcToLocalDateAndTimeString,
} from '../lib/timezones'
import { calculateOverlaps } from '../lib/find-time'
import { AvailabilityBlock, CalendarEvent, Profile } from '../types/database'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`✅ PASS: ${message}`)
}

console.log('==============================================')
console.log('🧪 RUNNING TOGETHERTIME TEST SUITE')
console.log('==============================================\n')

// 1. TIMEZONE TEST: Netherlands Winter Time (CET: UTC+1) vs Daylight Saving Time (CEST: UTC+2)
console.log('--- 1. Testing Netherlands Winter Time (CET) vs Summer Time (CEST) ---')

// Winter date: January 15, 2026 at 12:00:00 UTC
const winterUtc = new Date('2026-01-15T12:00:00Z')
const winterNlTime = formatTimeInTz(winterUtc, 'Europe/Amsterdam')
const winterNlAbbr = getTimezoneAbbreviation(winterUtc, 'Europe/Amsterdam')
console.log(`Winter Netherlands Time for 12:00 UTC: ${winterNlTime} ${winterNlAbbr}`)
assert(winterNlTime === '1:00 PM', 'Winter UTC 12:00 should be 1:00 PM in Amsterdam (UTC+1)')
assert(winterNlAbbr === 'GMT+1' || winterNlAbbr === 'CET', 'Winter abbr should indicate CET / GMT+1')

// Summer date: July 15, 2026 at 12:00:00 UTC
const summerUtc = new Date('2026-07-15T12:00:00Z')
const summerNlTime = formatTimeInTz(summerUtc, 'Europe/Amsterdam')
const summerNlAbbr = getTimezoneAbbreviation(summerUtc, 'Europe/Amsterdam')
console.log(`Summer Netherlands Time for 12:00 UTC: ${summerNlTime} ${summerNlAbbr}`)
assert(summerNlTime === '2:00 PM', 'Summer UTC 12:00 should be 2:00 PM in Amsterdam (UTC+2 DST)')
assert(summerNlAbbr === 'GMT+2' || summerNlAbbr === 'CEST', 'Summer abbr should indicate CEST / GMT+2')

// India Time: Constant UTC+5:30 throughout the year (no DST)
const winterIndiaTime = formatTimeInTz(winterUtc, 'Asia/Kolkata')
const summerIndiaTime = formatTimeInTz(summerUtc, 'Asia/Kolkata')
console.log(`India Time Winter: ${winterIndiaTime}, Summer: ${summerIndiaTime}`)
assert(winterIndiaTime === '5:30 PM', 'UTC 12:00 is always 5:30 PM IST in India')
assert(summerIndiaTime === '5:30 PM', 'UTC 12:00 is always 5:30 PM IST in India')

// 2. LOCAL TO UTC ROUND-TRIP TEST
console.log('\n--- 2. Testing Local Time Input to UTC Conversion ---')
const localDate = '2026-10-10'
const localTime = '20:30'
const convertedUtcIso = localToUtcIso(localDate, localTime, 'Asia/Kolkata')
console.log(`Local India 2026-10-10 20:30 -> UTC ISO: ${convertedUtcIso}`)
// 20:30 IST minus 5:30 = 15:00 UTC
assert(convertedUtcIso === '2026-10-10T15:00:00.000Z', '20:30 IST converts to 15:00 UTC exactly')

const roundTrip = utcToLocalDateAndTimeString(convertedUtcIso, 'Asia/Kolkata')
assert(roundTrip.dateStr === '2026-10-10', 'Round-trip date matches')
assert(roundTrip.timeStr === '20:30', 'Round-trip time matches')

// 3. DETERMINISTIC FIND-TIME OVERLAP TEST (Prompt Example)
console.log('\n--- 3. Testing Find-Time Deterministic Overlap Engine ---')
/*
Prompt Example:
Rohit (India): 7:00 PM – 11:00 PM IST (19:00 - 23:00 IST -> 13:30 - 17:30 UTC)
Paridhi (Netherlands): 4:00 PM – 8:00 PM CET (16:00 - 20:00 CET -> 15:00 - 19:00 UTC)
Expected Overlap:
15:00 UTC to 17:30 UTC
In India: 8:30 PM – 11:00 PM (or 8:30 PM – 10:00 PM if Paridhi ends at 6:30 CET)
Let's test exact prompt example:
Rohit free: 13:30 to 17:30 UTC
Paridhi free: 15:00 to 18:30 UTC
Overlap window: 15:00 to 17:30 UTC
In India (UTC+5:30): 8:30 PM – 11:00 PM IST
In Netherlands (UTC+2 CEST): 5:00 PM – 7:30 PM CEST
*/

const userA: Profile = {
  id: 'user-rohit',
  name: 'Rohit',
  country: 'India',
  timezone: 'Asia/Kolkata',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const userB: Profile = {
  id: 'user-paridhi',
  name: 'Paridhi',
  country: 'Netherlands',
  timezone: 'Europe/Amsterdam',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const targetDay = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
const targetDayStr = targetDay.toISOString().split('T')[0]

// Rohit free 7:00 PM – 11:00 PM IST tomorrow
const rohitStartUtc = localToUtcIso(targetDayStr, '19:00', userA.timezone)
const rohitEndUtc = localToUtcIso(targetDayStr, '23:00', userA.timezone)

// Paridhi free 4:00 PM – 8:00 PM CET tomorrow (approx 15:00 to 19:00 UTC)
const paridhiStartUtc = localToUtcIso(targetDayStr, '16:00', userB.timezone)
const paridhiEndUtc = localToUtcIso(targetDayStr, '19:30', userB.timezone)

const mockAvailability: AvailabilityBlock[] = [
  {
    id: 'block-1',
    calendar_id: 'cal-1',
    user_id: userA.id,
    type: 'FREE',
    start_time: rohitStartUtc,
    end_time: rohitEndUtc,
    recurrence_rule: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'block-2',
    calendar_id: 'cal-1',
    user_id: userB.id,
    type: 'FREE',
    start_time: paridhiStartUtc,
    end_time: paridhiEndUtc,
    recurrence_rule: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const mockEvents: CalendarEvent[] = []

const overlaps = calculateOverlaps(
  userA,
  userB,
  mockAvailability,
  mockEvents,
  new Date(),
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
)

console.log('Calculated Overlaps:', overlaps)
assert(overlaps.length === 1, 'Should find exactly 1 overlapping window')
assert(overlaps[0].durationMinutes > 0, 'Overlap duration should be positive')
console.log(`User 1 (${userA.name}) slot: ${overlaps[0].user1.formattedTime}`)
console.log(`User 2 (${userB.name}) slot: ${overlaps[0].user2.formattedTime}`)

console.log('\n==============================================')
console.log('🎉 ALL TOGETHERTIME ENGINE TESTS PASSED!')
console.log('==============================================')
