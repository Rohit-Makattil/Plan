-- =============================================================
-- TIMETOGETHER RLS FIX
-- Copy ALL of this SQL and paste it into:
-- Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================

-- ── Step 1: Recreate helper functions with safe search_path ──

DROP FUNCTION IF EXISTS public.is_calendar_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_calendar_ids(UUID);
DROP FUNCTION IF EXISTS public.is_calendar_owner(UUID, UUID);

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

-- ── Step 2: Drop every existing policy ──

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "Users can read profiles of mutual calendar members or self" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "shared_calendars_select" ON public.shared_calendars;
DROP POLICY IF EXISTS "shared_calendars_insert" ON public.shared_calendars;
DROP POLICY IF EXISTS "shared_calendars_update" ON public.shared_calendars;
DROP POLICY IF EXISTS "shared_calendars_delete" ON public.shared_calendars;
DROP POLICY IF EXISTS "Users can read calendars they belong to" ON public.shared_calendars;
DROP POLICY IF EXISTS "Users can create calendars" ON public.shared_calendars;
DROP POLICY IF EXISTS "Calendar owners can update their calendars" ON public.shared_calendars;
DROP POLICY IF EXISTS "Calendar owners can delete their calendars" ON public.shared_calendars;

DROP POLICY IF EXISTS "calendar_members_select" ON public.calendar_members;
DROP POLICY IF EXISTS "calendar_members_insert" ON public.calendar_members;
DROP POLICY IF EXISTS "calendar_members_delete" ON public.calendar_members;
DROP POLICY IF EXISTS "Users can view members of their calendars" ON public.calendar_members;
DROP POLICY IF EXISTS "Users can insert calendar memberships for themselves" ON public.calendar_members;
DROP POLICY IF EXISTS "Users can delete their own membership or owners can remove members" ON public.calendar_members;

DROP POLICY IF EXISTS "availability_blocks_select" ON public.availability_blocks;
DROP POLICY IF EXISTS "availability_blocks_insert" ON public.availability_blocks;
DROP POLICY IF EXISTS "availability_blocks_update" ON public.availability_blocks;
DROP POLICY IF EXISTS "availability_blocks_delete" ON public.availability_blocks;
DROP POLICY IF EXISTS "Calendar members can view availability" ON public.availability_blocks;
DROP POLICY IF EXISTS "Users can create their own availability in joined calendars" ON public.availability_blocks;
DROP POLICY IF EXISTS "Users can update their own availability" ON public.availability_blocks;
DROP POLICY IF EXISTS "Users can delete their own availability" ON public.availability_blocks;

DROP POLICY IF EXISTS "events_select" ON public.events;
DROP POLICY IF EXISTS "events_insert" ON public.events;
DROP POLICY IF EXISTS "events_update" ON public.events;
DROP POLICY IF EXISTS "events_delete" ON public.events;
DROP POLICY IF EXISTS "Calendar members can view events" ON public.events;
DROP POLICY IF EXISTS "Calendar members can create events" ON public.events;
DROP POLICY IF EXISTS "Calendar members can update events" ON public.events;
DROP POLICY IF EXISTS "Calendar members can delete events" ON public.events;

-- ── Step 3: RLS ON ──

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_calendars    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;

-- ── Step 4: PROFILES ──

CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT
USING (
    id = auth.uid()
    OR id IN (
        SELECT cm2.user_id
        FROM public.calendar_members cm1
        JOIN public.calendar_members cm2 ON cm1.calendar_id = cm2.calendar_id
        WHERE cm1.user_id = auth.uid()
          AND cm2.user_id <> auth.uid()
    )
);

CREATE POLICY "profiles_insert"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update"
ON public.profiles FOR UPDATE
USING  (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ── Step 5: SHARED_CALENDARS ──

CREATE POLICY "shared_calendars_select"
ON public.shared_calendars FOR SELECT
USING (
    created_by = auth.uid()
    OR public.is_calendar_member(id, auth.uid())
);

CREATE POLICY "shared_calendars_insert"
ON public.shared_calendars FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "shared_calendars_update"
ON public.shared_calendars FOR UPDATE
USING  (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "shared_calendars_delete"
ON public.shared_calendars FOR DELETE
USING (created_by = auth.uid());

-- ── Step 6: CALENDAR_MEMBERS (THE CORE FIX) ──
-- The original SELECT policy used:
--   calendar_id IN (SELECT calendar_id FROM calendar_members WHERE user_id = auth.uid())
-- That subquery hits calendar_members while its OWN RLS policy is still being
-- evaluated → PostgreSQL detects the cycle → "infinite recursion" error.
--
-- FIX: The first condition (user_id = auth.uid()) is a direct row comparison —
-- no subquery. The second uses is_calendar_member() which is SECURITY DEFINER
-- and bypasses RLS entirely.

CREATE POLICY "calendar_members_select"
ON public.calendar_members FOR SELECT
USING (
    user_id = auth.uid()
    OR public.is_calendar_member(calendar_id, auth.uid())
);

CREATE POLICY "calendar_members_insert"
ON public.calendar_members FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "calendar_members_delete"
ON public.calendar_members FOR DELETE
USING (
    user_id = auth.uid()
    OR public.is_calendar_owner(calendar_id, auth.uid())
);

-- ── Step 7: AVAILABILITY_BLOCKS ──

CREATE POLICY "availability_blocks_select"
ON public.availability_blocks FOR SELECT
USING (public.is_calendar_member(calendar_id, auth.uid()));

CREATE POLICY "availability_blocks_insert"
ON public.availability_blocks FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND public.is_calendar_member(calendar_id, auth.uid())
);

CREATE POLICY "availability_blocks_update"
ON public.availability_blocks FOR UPDATE
USING  (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "availability_blocks_delete"
ON public.availability_blocks FOR DELETE
USING (user_id = auth.uid());

-- ── Step 8: EVENTS ──

CREATE POLICY "events_select"
ON public.events FOR SELECT
USING (public.is_calendar_member(calendar_id, auth.uid()));

CREATE POLICY "events_insert"
ON public.events FOR INSERT
WITH CHECK (
    created_by = auth.uid()
    AND public.is_calendar_member(calendar_id, auth.uid())
);

CREATE POLICY "events_update"
ON public.events FOR UPDATE
USING  (public.is_calendar_member(calendar_id, auth.uid()))
WITH CHECK (public.is_calendar_member(calendar_id, auth.uid()));

CREATE POLICY "events_delete"
ON public.events FOR DELETE
USING (public.is_calendar_member(calendar_id, auth.uid()));

-- ── Step 9: Verify (results shown in the SQL editor output tab) ──

SELECT
    tablename,
    policyname,
    cmd,
    CASE
        WHEN qual LIKE '%calendar_members WHERE user_id%' THEN '❌ STILL RECURSIVE'
        ELSE '✅ OK'
    END AS status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
