-- Migration: 20240101000000_init.sql
-- TogetherTime initial database schema

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

CREATE INDEX IF NOT EXISTS idx_calendar_members_user ON public.calendar_members(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_members_calendar ON public.calendar_members(calendar_id);
CREATE INDEX IF NOT EXISTS idx_shared_calendars_code ON public.shared_calendars(invite_code);
CREATE INDEX IF NOT EXISTS idx_availability_calendar_time ON public.availability_blocks(calendar_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_availability_user ON public.availability_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_events_calendar_time ON public.events(calendar_id, start_time, end_time);

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

    SELECT * INTO v_calendar
    FROM public.shared_calendars
    WHERE UPPER(invite_code) = UPPER(TRIM(p_invite_code));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code. Please check and try again.');
    END IF;

    SELECT * INTO v_existing_member
    FROM public.calendar_members
    WHERE calendar_id = v_calendar.id AND user_id = v_user_id;

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'calendar_id', v_calendar.id, 'already_member', true);
    END IF;

    SELECT COUNT(*) INTO v_member_count
    FROM public.calendar_members
    WHERE calendar_id = v_calendar.id;

    IF v_member_count >= 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'This calendar already has 2 members.');
    END IF;

    INSERT INTO public.calendar_members (calendar_id, user_id, role)
    VALUES (v_calendar.id, v_user_id, 'member');

    RETURN jsonb_build_object('success', true, 'calendar_id', v_calendar.id, 'calendar_name', v_calendar.name);
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can read calendars they belong to" ON public.shared_calendars;
CREATE POLICY "Users can read calendars they belong to"
ON public.shared_calendars FOR SELECT
USING (
    created_by = auth.uid() OR
    id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create calendars" ON public.shared_calendars;
CREATE POLICY "Users can create calendars"
ON public.shared_calendars FOR INSERT
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Calendar owners can update their calendars" ON public.shared_calendars;
CREATE POLICY "Calendar owners can update their calendars"
ON public.shared_calendars FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Calendar owners can delete their calendars" ON public.shared_calendars;
CREATE POLICY "Calendar owners can delete their calendars"
ON public.shared_calendars FOR DELETE
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can view members of their calendars" ON public.calendar_members;
CREATE POLICY "Users can view members of their calendars"
ON public.calendar_members FOR SELECT
USING (
    calendar_id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid()) OR
    calendar_id IN (SELECT id FROM public.shared_calendars WHERE created_by = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert calendar memberships for themselves" ON public.calendar_members;
CREATE POLICY "Users can insert calendar memberships for themselves"
ON public.calendar_members FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own membership or owners can remove members" ON public.calendar_members;
CREATE POLICY "Users can delete their own membership or owners can remove members"
ON public.calendar_members FOR DELETE
USING (
    user_id = auth.uid() OR
    calendar_id IN (SELECT id FROM public.shared_calendars WHERE created_by = auth.uid())
);

DROP POLICY IF EXISTS "Calendar members can view availability" ON public.availability_blocks;
CREATE POLICY "Calendar members can view availability"
ON public.availability_blocks FOR SELECT
USING (
    calendar_id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create their own availability in joined calendars" ON public.availability_blocks;
CREATE POLICY "Users can create their own availability in joined calendars"
ON public.availability_blocks FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND
    calendar_id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own availability" ON public.availability_blocks;
CREATE POLICY "Users can update their own availability"
ON public.availability_blocks FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own availability" ON public.availability_blocks;
CREATE POLICY "Users can delete their own availability"
ON public.availability_blocks FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Calendar members can view events" ON public.events;
CREATE POLICY "Calendar members can view events"
ON public.events FOR SELECT
USING (
    calendar_id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Calendar members can create events" ON public.events;
CREATE POLICY "Calendar members can create events"
ON public.events FOR INSERT
WITH CHECK (
    created_by = auth.uid() AND
    calendar_id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Calendar members can update events" ON public.events;
CREATE POLICY "Calendar members can update events"
ON public.events FOR UPDATE
USING (
    calendar_id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid())
)
WITH CHECK (
    calendar_id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Calendar members can delete events" ON public.events;
CREATE POLICY "Calendar members can delete events"
ON public.events FOR DELETE
USING (
    calendar_id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid())
);
