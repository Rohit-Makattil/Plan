-- =============================================================
-- TogetherTime: Fix RLS Infinite Recursion
-- Migration: 20240102000000_fix_rls_recursion.sql
--
-- ROOT CAUSE:
--   The calendar_members SELECT policy contained:
--     calendar_id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid())
--   This subquery hits the same RLS-protected table → PostgreSQL detects
--   infinite recursion and aborts with:
--   "infinite recursion detected in policy for relation calendar_members"
--
-- FIX STRATEGY:
--   1. Drop all existing policies on affected tables.
--   2. Create SECURITY DEFINER helper functions with SET search_path = public, pg_catalog
--      These functions run as their owner (postgres) and bypass RLS, safely.
--   3. Rewrite all policies to call these helpers instead of self-referential subqueries.
--
-- SAFE DESIGN:
--   - SECURITY DEFINER functions only expose membership data, not row content.
--   - All functions are immutable/stable and parameterized by auth.uid().
--   - No function allows cross-user data access beyond what is required.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Drop ALL existing policies (safe — only drops policies, not data)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can read profiles of mutual calendar members or self" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can read calendars they belong to" ON public.shared_calendars;
DROP POLICY IF EXISTS "Users can create calendars" ON public.shared_calendars;
DROP POLICY IF EXISTS "Calendar owners can update their calendars" ON public.shared_calendars;
DROP POLICY IF EXISTS "Calendar owners can delete their calendars" ON public.shared_calendars;

DROP POLICY IF EXISTS "Users can view members of their calendars" ON public.calendar_members;
DROP POLICY IF EXISTS "Users can insert calendar memberships for themselves" ON public.calendar_members;
DROP POLICY IF EXISTS "Users can delete their own membership or owners can remove members" ON public.calendar_members;

DROP POLICY IF EXISTS "Calendar members can view availability" ON public.availability_blocks;
DROP POLICY IF EXISTS "Users can create their own availability in joined calendars" ON public.availability_blocks;
DROP POLICY IF EXISTS "Users can update their own availability" ON public.availability_blocks;
DROP POLICY IF EXISTS "Users can delete their own availability" ON public.availability_blocks;

DROP POLICY IF EXISTS "Calendar members can view events" ON public.events;
DROP POLICY IF EXISTS "Calendar members can create events" ON public.events;
DROP POLICY IF EXISTS "Calendar members can update events" ON public.events;
DROP POLICY IF EXISTS "Calendar members can delete events" ON public.events;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Drop old helper functions (we'll recreate them safely)
-- ─────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.is_calendar_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_calendar_ids(UUID);

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Create SECURITY DEFINER helper functions
--
-- These bypass RLS on calendar_members by running as their owner.
-- They only return boolean/UUIDs — never raw row data.
-- SET search_path prevents search_path injection attacks.
-- ─────────────────────────────────────────────────────────────

-- Returns TRUE if the given user is a member of the given calendar.
-- Used by policies on OTHER tables to check membership without recursion.
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
    FROM public.calendar_members cm
    WHERE cm.calendar_id = p_calendar_id
      AND cm.user_id     = p_user_id
  );
$$;

-- Returns the set of calendar_ids the given user belongs to.
-- Used as a safe subquery in non-calendar_members policies.
CREATE OR REPLACE FUNCTION public.get_user_calendar_ids(
  p_user_id UUID
)
RETURNS TABLE(calendar_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT cm.calendar_id
  FROM public.calendar_members cm
  WHERE cm.user_id = p_user_id;
$$;

-- Returns TRUE if the current auth user is the owner of a calendar.
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
    FROM public.calendar_members cm
    WHERE cm.calendar_id = p_calendar_id
      AND cm.user_id     = p_user_id
      AND cm.role        = 'owner'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Ensure RLS is enabled on all tables
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_calendars    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- STEP 5: Recreate PROFILES policies
-- No recursion risk here — profiles doesn't reference calendar_members.
-- We use get_user_calendar_ids() to see partner profiles.
-- ─────────────────────────────────────────────────────────────

-- Users can read their own profile, plus profiles of users they share a calendar with.
CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR id IN (
    SELECT cm2.user_id
    FROM public.calendar_members cm1
    JOIN public.calendar_members cm2 USING (calendar_id)
    WHERE cm1.user_id = auth.uid()
      AND cm2.user_id <> auth.uid()
  )
);
-- NOTE: The JOIN here only touches calendar_members; the PROFILES policy itself
-- does not recurse into profiles, so this is safe.

CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update"
ON public.profiles
FOR UPDATE
USING  (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- STEP 6: Recreate SHARED_CALENDARS policies
-- Uses is_calendar_member() helper to avoid touching calendar_members directly.
-- ─────────────────────────────────────────────────────────────

-- A user can read a calendar if they are a member of it.
-- Uses the SECURITY DEFINER helper → no RLS recursion.
CREATE POLICY "shared_calendars_select"
ON public.shared_calendars
FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_calendar_member(id, auth.uid())
);

CREATE POLICY "shared_calendars_insert"
ON public.shared_calendars
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "shared_calendars_update"
ON public.shared_calendars
FOR UPDATE
USING  (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "shared_calendars_delete"
ON public.shared_calendars
FOR DELETE
USING (created_by = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- STEP 7: Recreate CALENDAR_MEMBERS policies
--
-- THIS IS THE KEY FIX.
-- The SELECT policy must NOT query calendar_members recursively.
-- We use a simple direct row-level check: the row is visible if
--   a) the user IS that member row (user_id = auth.uid()), or
--   b) the row belongs to the same calendar_id that the user belongs to,
--      verified via the SECURITY DEFINER helper.
-- ─────────────────────────────────────────────────────────────

-- A member can see all rows in calendars they belong to.
-- is_calendar_member() does the actual membership check without RLS recursion.
CREATE POLICY "calendar_members_select"
ON public.calendar_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_calendar_member(calendar_id, auth.uid())
);

-- A user can insert a membership row only for themselves.
-- The 2-member limit is enforced by the trigger (not RLS).
CREATE POLICY "calendar_members_insert"
ON public.calendar_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- A user can delete their own membership, or (calendar owner) delete any member.
CREATE POLICY "calendar_members_delete"
ON public.calendar_members
FOR DELETE
USING (
  user_id = auth.uid()
  OR public.is_calendar_owner(calendar_id, auth.uid())
);

-- ─────────────────────────────────────────────────────────────
-- STEP 8: Recreate AVAILABILITY_BLOCKS policies
-- Uses get_user_calendar_ids() helper → safe, no recursion.
-- ─────────────────────────────────────────────────────────────

-- Any calendar member can read all availability blocks in their shared calendar.
CREATE POLICY "availability_blocks_select"
ON public.availability_blocks
FOR SELECT
USING (
  public.is_calendar_member(calendar_id, auth.uid())
);

-- Users can only create their own blocks, and only in calendars they belong to.
CREATE POLICY "availability_blocks_insert"
ON public.availability_blocks
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND public.is_calendar_member(calendar_id, auth.uid())
);

-- Users can only update their own blocks.
CREATE POLICY "availability_blocks_update"
ON public.availability_blocks
FOR UPDATE
USING  (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can only delete their own blocks.
CREATE POLICY "availability_blocks_delete"
ON public.availability_blocks
FOR DELETE
USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- STEP 9: Recreate EVENTS policies
-- Uses is_calendar_member() helper → safe, no recursion.
-- ─────────────────────────────────────────────────────────────

-- Any calendar member can read events.
CREATE POLICY "events_select"
ON public.events
FOR SELECT
USING (
  public.is_calendar_member(calendar_id, auth.uid())
);

-- Any calendar member can create events; must set themselves as creator.
CREATE POLICY "events_insert"
ON public.events
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND public.is_calendar_member(calendar_id, auth.uid())
);

-- Any calendar member can update events (collaborative editing).
CREATE POLICY "events_update"
ON public.events
FOR UPDATE
USING  (public.is_calendar_member(calendar_id, auth.uid()))
WITH CHECK (public.is_calendar_member(calendar_id, auth.uid()));

-- Any calendar member can delete events.
CREATE POLICY "events_delete"
ON public.events
FOR DELETE
USING (
  public.is_calendar_member(calendar_id, auth.uid())
);

-- ─────────────────────────────────────────────────────────────
-- STEP 10: Ensure Realtime is enabled
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime
    ADD TABLE public.availability_blocks,
              public.events,
              public.calendar_members,
              public.profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 11: Verify policies exist (informational)
-- ─────────────────────────────────────────────────────────────
-- After running, you can verify with:
--   SELECT schemaname, tablename, policyname, cmd
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
