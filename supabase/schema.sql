-- TogetherTime Database Schema and RLS Policies
-- Target: Supabase PostgreSQL
--
-- RLS FIX (2024-01-02):
--   Original policies on calendar_members caused infinite recursion because the
--   SELECT policy queried calendar_members from inside itself. Fixed by:
--   1. Creating SECURITY DEFINER helpers (is_calendar_member, is_calendar_owner)
--      that run without RLS and only expose boolean/ID membership data.
--   2. All policies that need to check "is this user a member of calendar X"
--      now call these helpers instead of subquerying calendar_members directly.

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.shared_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.calendar_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID REFERENCES public.shared_calendars(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(calendar_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.availability_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID REFERENCES public.shared_calendars(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('FREE', 'BUSY')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    recurrence_rule TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_end_after_start CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID REFERENCES public.shared_calendars(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'PLAN' CHECK (type = 'PLAN'),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT NULL,
    audience TEXT NOT NULL DEFAULT 'TOGETHER' CHECK (audience IN ('TOGETHER', 'FRIENDS')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_event_end_after_start CHECK (end_time > start_time)
);

-- 2. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_calendar_members_user ON public.calendar_members(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_members_calendar ON public.calendar_members(calendar_id);
CREATE INDEX IF NOT EXISTS idx_shared_calendars_code ON public.shared_calendars(invite_code);
CREATE INDEX IF NOT EXISTS idx_availability_calendar_time ON public.availability_blocks(calendar_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_availability_user ON public.availability_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_events_calendar_time ON public.events(calendar_id, start_time, end_time);

-- 3. Security Definer Helper Functions
-- Returns TRUE if p_user_id is a member of p_calendar_id.
-- SECURITY DEFINER + SET search_path: bypasses RLS on calendar_members safely.
CREATE OR REPLACE FUNCTION public.is_calendar_member(
    p_calendar_id UUID,
    p_user_id     UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.calendar_members
        WHERE calendar_id = p_calendar_id
          AND user_id     = p_user_id
    );
$$;

-- Returns calendar_ids the user belongs to (safe subquery for non-cm policies).
CREATE OR REPLACE FUNCTION public.get_user_calendar_ids(
    p_user_id UUID
)
RETURNS TABLE (calendar_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT cm.calendar_id
    FROM public.calendar_members cm
    WHERE cm.user_id = p_user_id;
$$;

-- Returns TRUE if p_user_id is an 'owner' of p_calendar_id.
CREATE OR REPLACE FUNCTION public.is_calendar_owner(
    p_calendar_id UUID,
    p_user_id     UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.calendar_members
        WHERE calendar_id = p_calendar_id
          AND user_id     = p_user_id
          AND role        = 'owner'
    );
$$;

-- Enforce maximum 2 members per calendar rule
CREATE OR REPLACE FUNCTION public.check_calendar_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    member_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO member_count
    FROM public.calendar_members
    WHERE calendar_id = NEW.calendar_id;

    IF member_count >= 2 THEN
        RAISE EXCEPTION 'This shared calendar already has the maximum of 2 members.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_calendar_member_limit ON public.calendar_members;
CREATE TRIGGER trg_check_calendar_member_limit
BEFORE INSERT ON public.calendar_members
FOR EACH ROW
EXECUTE FUNCTION public.check_calendar_member_limit();

-- Function to safely join a calendar by invite code
CREATE OR REPLACE FUNCTION public.join_calendar_by_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_calendar RECORD;
    v_member_count INT;
    v_user_id UUID;
    v_existing_member RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Find calendar by invite code (case-insensitive)
    SELECT * INTO v_calendar
    FROM public.shared_calendars
    WHERE UPPER(invite_code) = UPPER(TRIM(p_invite_code));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code. Please check and try again.');
    END IF;

    -- Check if already a member
    SELECT * INTO v_existing_member
    FROM public.calendar_members
    WHERE calendar_id = v_calendar.id AND user_id = v_user_id;

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'calendar_id', v_calendar.id, 'already_member', true);
    END IF;

    -- Check member count
    SELECT COUNT(*) INTO v_member_count
    FROM public.calendar_members
    WHERE calendar_id = v_calendar.id;

    IF v_member_count >= 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'This calendar already has 2 members.');
    END IF;

    -- Insert membership
    INSERT INTO public.calendar_members (calendar_id, user_id, role)
    VALUES (v_calendar.id, v_user_id, 'member');

    RETURN jsonb_build_object('success', true, 'calendar_id', v_calendar.id, 'calendar_name', v_calendar.name);
END;
$$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- PROFILES
DROP POLICY IF EXISTS "Users can read profiles of mutual calendar members or self" ON public.profiles;
CREATE POLICY "Users can read profiles of mutual calendar members or self"
ON public.profiles FOR SELECT
USING (
    id = auth.uid() OR
    id IN (
        SELECT cm2.user_id 
        FROM public.calendar_members cm1
        JOIN public.calendar_members cm2 ON cm1.calendar_id = cm2.calendar_id
        WHERE cm1.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- SHARED CALENDARS
-- FIX: was "id IN (SELECT calendar_id FROM calendar_members WHERE ...)"
--      which hits calendar_members RLS. Now uses is_calendar_member() SECURITY DEFINER.
DROP POLICY IF EXISTS "shared_calendars_select"                 ON public.shared_calendars;
DROP POLICY IF EXISTS "Users can read calendars they belong to" ON public.shared_calendars;
CREATE POLICY "shared_calendars_select"
ON public.shared_calendars FOR SELECT
USING (
    created_by = auth.uid()
    OR public.is_calendar_member(id, auth.uid())
);

DROP POLICY IF EXISTS "shared_calendars_insert"    ON public.shared_calendars;
DROP POLICY IF EXISTS "Users can create calendars" ON public.shared_calendars;
CREATE POLICY "shared_calendars_insert"
ON public.shared_calendars FOR INSERT
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "shared_calendars_update"                    ON public.shared_calendars;
DROP POLICY IF EXISTS "Calendar owners can update their calendars" ON public.shared_calendars;
CREATE POLICY "shared_calendars_update"
ON public.shared_calendars FOR UPDATE
USING  (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "shared_calendars_delete"                    ON public.shared_calendars;
DROP POLICY IF EXISTS "Calendar owners can delete their calendars" ON public.shared_calendars;
CREATE POLICY "shared_calendars_delete"
ON public.shared_calendars FOR DELETE
USING (created_by = auth.uid());

-- CALENDAR MEMBERS
-- KEY FIX: The original SELECT policy:
--   calendar_id IN (SELECT calendar_id FROM calendar_members WHERE user_id = auth.uid())
-- ...hits calendar_members while its OWN RLS is being evaluated → infinite recursion.
--
-- Fix: Use is_calendar_member() (SECURITY DEFINER) for the "see partner's row" case.
-- The "user_id = auth.uid()" check is a direct row comparison — no subquery needed.
DROP POLICY IF EXISTS "calendar_members_select"                                            ON public.calendar_members;
DROP POLICY IF EXISTS "Users can view members of their calendars"                          ON public.calendar_members;
CREATE POLICY "calendar_members_select"
ON public.calendar_members FOR SELECT
USING (
    -- A user can always see their own membership row (direct comparison, no subquery).
    user_id = auth.uid()
    -- A user can see other members of calendars they belong to.
    -- is_calendar_member() is SECURITY DEFINER → bypasses RLS, no recursion.
    OR public.is_calendar_member(calendar_id, auth.uid())
);

DROP POLICY IF EXISTS "calendar_members_insert"                                            ON public.calendar_members;
DROP POLICY IF EXISTS "Users can insert calendar memberships for themselves"               ON public.calendar_members;
CREATE POLICY "calendar_members_insert"
ON public.calendar_members FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "calendar_members_delete"                                              ON public.calendar_members;
DROP POLICY IF EXISTS "Users can delete their own membership or owners can remove members"  ON public.calendar_members;
CREATE POLICY "calendar_members_delete"
ON public.calendar_members FOR DELETE
USING (
    user_id = auth.uid()
    OR public.is_calendar_owner(calendar_id, auth.uid())
);

-- AVAILABILITY BLOCKS
-- FIX: replaced direct subqueries on calendar_members with is_calendar_member().
DROP POLICY IF EXISTS "availability_blocks_select"                                         ON public.availability_blocks;
DROP POLICY IF EXISTS "Calendar members can view availability"                             ON public.availability_blocks;
CREATE POLICY "availability_blocks_select"
ON public.availability_blocks FOR SELECT
USING (public.is_calendar_member(calendar_id, auth.uid()));

DROP POLICY IF EXISTS "availability_blocks_insert"                                         ON public.availability_blocks;
DROP POLICY IF EXISTS "Users can create their own availability in joined calendars"        ON public.availability_blocks;
CREATE POLICY "availability_blocks_insert"
ON public.availability_blocks FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND public.is_calendar_member(calendar_id, auth.uid())
);

DROP POLICY IF EXISTS "availability_blocks_update"                ON public.availability_blocks;
DROP POLICY IF EXISTS "Users can update their own availability"   ON public.availability_blocks;
CREATE POLICY "availability_blocks_update"
ON public.availability_blocks FOR UPDATE
USING  (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "availability_blocks_delete"                ON public.availability_blocks;
DROP POLICY IF EXISTS "Users can delete their own availability"   ON public.availability_blocks;
CREATE POLICY "availability_blocks_delete"
ON public.availability_blocks FOR DELETE
USING (user_id = auth.uid());

-- EVENTS
-- FIX: replaced direct subqueries on calendar_members with is_calendar_member().
DROP POLICY IF EXISTS "events_select"                      ON public.events;
DROP POLICY IF EXISTS "Calendar members can view events"   ON public.events;
CREATE POLICY "events_select"
ON public.events FOR SELECT
USING (public.is_calendar_member(calendar_id, auth.uid()));

DROP POLICY IF EXISTS "events_insert"                      ON public.events;
DROP POLICY IF EXISTS "Calendar members can create events" ON public.events;
CREATE POLICY "events_insert"
ON public.events FOR INSERT
WITH CHECK (
    created_by = auth.uid()
    AND public.is_calendar_member(calendar_id, auth.uid())
);

DROP POLICY IF EXISTS "events_update"                      ON public.events;
DROP POLICY IF EXISTS "Calendar members can update events" ON public.events;
CREATE POLICY "events_update"
ON public.events FOR UPDATE
USING  (public.is_calendar_member(calendar_id, auth.uid()))
WITH CHECK (public.is_calendar_member(calendar_id, auth.uid()));

DROP POLICY IF EXISTS "events_delete"                      ON public.events;
DROP POLICY IF EXISTS "Calendar members can delete events" ON public.events;
CREATE POLICY "events_delete"
ON public.events FOR DELETE
USING (public.is_calendar_member(calendar_id, auth.uid()));

-- 6. Enable Realtime Publications
-- Note: Supabase supports enabling realtime on tables for live updates
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_blocks, public.events, public.calendar_members, public.profiles;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
    WHEN undefined_object THEN
        NULL;
END $$;
