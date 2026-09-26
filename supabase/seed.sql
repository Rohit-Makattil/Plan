-- Development / Testing Seed Data for TogetherTime
-- Run this in Supabase SQL editor or Supabase CLI if you want pre-populated sample test users & events

-- Note: In production Supabase, users are created in auth.users first.
-- This script provides sample inserts for development environments.

DO $$
DECLARE
    v_user_rohit_id UUID := '00000000-0000-0000-0000-000000000001';
    v_user_paridhi_id UUID := '00000000-0000-0000-0000-000000000002';
    v_calendar_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- 1. Insert Profiles (if users exist in auth.users or for testing)
    INSERT INTO public.profiles (id, name, country, timezone)
    VALUES
        (v_user_rohit_id, 'Rohit', 'India', 'Asia/Kolkata'),
        (v_user_paridhi_id, 'Paridhi', 'Netherlands', 'Europe/Amsterdam')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        country = EXCLUDED.country,
        timezone = EXCLUDED.timezone;

    -- 2. Insert Shared Calendar
    INSERT INTO public.shared_calendars (id, name, created_by, invite_code)
    VALUES
        (v_calendar_id, 'Rohit & Paridhi', v_user_rohit_id, 'TG-8F42K')
    ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Members
    INSERT INTO public.calendar_members (calendar_id, user_id, role)
    VALUES
        (v_calendar_id, v_user_rohit_id, 'owner'),
        (v_calendar_id, v_user_paridhi_id, 'member')
    ON CONFLICT (calendar_id, user_id) DO NOTHING;

    -- 4. Sample Availability Blocks (UTC timestamps)
    INSERT INTO public.availability_blocks (calendar_id, user_id, type, start_time, end_time, recurrence_rule)
    VALUES
        -- Rohit free 7:00 PM – 11:00 PM IST (13:30 – 17:30 UTC)
        (v_calendar_id, v_user_rohit_id, 'FREE', now() + interval '1 day 13 hours 30 minutes', now() + interval '1 day 17 hours 30 minutes', 'WEEKLY'),
        -- Paridhi free 4:00 PM – 8:00 PM CET (15:00 – 19:00 UTC)
        (v_calendar_id, v_user_paridhi_id, 'FREE', now() + interval '1 day 15 hours', now() + interval '1 day 19 hours', 'WEEKLY')
    ON CONFLICT DO NOTHING;

    -- 5. Sample Event / Plan
    INSERT INTO public.events (calendar_id, created_by, title, description, type, start_time, end_time, location, audience)
    VALUES
        (v_calendar_id, v_user_rohit_id, 'Call', 'Catch up and talk about our weekend plans', 'PLAN', now() + interval '1 day 15 hours', now() + interval '1 day 16 hours 30 minutes', 'Google Meet', 'TOGETHER')
    ON CONFLICT DO NOTHING;

END $$;
