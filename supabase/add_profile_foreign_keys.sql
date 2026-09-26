-- Optional: Add explicit foreign key relationships from public tables to public.profiles(id)
-- This enables PostgREST schema cache to recognize embedded relationships if needed.
-- Note: TogetherTime app code has also been made resilient to load profiles directly.

DO $$
BEGIN
  -- 1. availability_blocks -> profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_availability_blocks_profiles'
  ) THEN
    ALTER TABLE public.availability_blocks
      ADD CONSTRAINT fk_availability_blocks_profiles
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- 2. calendar_members -> profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_calendar_members_profiles'
  ) THEN
    ALTER TABLE public.calendar_members
      ADD CONSTRAINT fk_calendar_members_profiles
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- 3. events -> profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_events_profiles'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT fk_events_profiles
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
