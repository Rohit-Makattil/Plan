// apply-rls-fix.mjs
// Run with: node scripts/apply-rls-fix.mjs
// Applies the RLS fix directly to Supabase via the Management API

import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'xexiawdukhxivavmgnpw';
const SUPABASE_URL = 'https://xexiawdukhxivavmgnpw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleGlhd2R1a2h4aXZhdm1nbnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDM1MTkwMSwiZXhwIjoyMTA1OTI3OTAxfQ.000kQaOrZOndjniDV1vl8tHj0brplGMPU4o3OFUvZFg';

// SQL statements to apply one by one
// Breaking into discrete chunks so we can report progress
const SQL_STEPS = [
  {
    name: 'Drop old helper functions',
    sql: `
      DROP FUNCTION IF EXISTS public.is_calendar_member(UUID, UUID);
      DROP FUNCTION IF EXISTS public.get_user_calendar_ids(UUID);
      DROP FUNCTION IF EXISTS public.is_calendar_owner(UUID, UUID);
    `
  },
  {
    name: 'Create is_calendar_member() SECURITY DEFINER',
    sql: `
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
    `
  },
  {
    name: 'Create get_user_calendar_ids() SECURITY DEFINER',
    sql: `
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
    `
  },
  {
    name: 'Create is_calendar_owner() SECURITY DEFINER',
    sql: `
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
    `
  },
  {
    name: 'Drop all existing policies on profiles',
    sql: `
      DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
      DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
      DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
      DROP POLICY IF EXISTS "Users can read profiles of mutual calendar members or self" ON public.profiles;
      DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
      DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    `
  },
  {
    name: 'Drop all existing policies on shared_calendars',
    sql: `
      DROP POLICY IF EXISTS "shared_calendars_select" ON public.shared_calendars;
      DROP POLICY IF EXISTS "shared_calendars_insert" ON public.shared_calendars;
      DROP POLICY IF EXISTS "shared_calendars_update" ON public.shared_calendars;
      DROP POLICY IF EXISTS "shared_calendars_delete" ON public.shared_calendars;
      DROP POLICY IF EXISTS "Users can read calendars they belong to" ON public.shared_calendars;
      DROP POLICY IF EXISTS "Users can create calendars" ON public.shared_calendars;
      DROP POLICY IF EXISTS "Calendar owners can update their calendars" ON public.shared_calendars;
      DROP POLICY IF EXISTS "Calendar owners can delete their calendars" ON public.shared_calendars;
    `
  },
  {
    name: 'Drop all existing policies on calendar_members',
    sql: `
      DROP POLICY IF EXISTS "calendar_members_select" ON public.calendar_members;
      DROP POLICY IF EXISTS "calendar_members_insert" ON public.calendar_members;
      DROP POLICY IF EXISTS "calendar_members_delete" ON public.calendar_members;
      DROP POLICY IF EXISTS "Users can view members of their calendars" ON public.calendar_members;
      DROP POLICY IF EXISTS "Users can insert calendar memberships for themselves" ON public.calendar_members;
      DROP POLICY IF EXISTS "Users can delete their own membership or owners can remove members" ON public.calendar_members;
    `
  },
  {
    name: 'Drop all existing policies on availability_blocks',
    sql: `
      DROP POLICY IF EXISTS "availability_blocks_select" ON public.availability_blocks;
      DROP POLICY IF EXISTS "availability_blocks_insert" ON public.availability_blocks;
      DROP POLICY IF EXISTS "availability_blocks_update" ON public.availability_blocks;
      DROP POLICY IF EXISTS "availability_blocks_delete" ON public.availability_blocks;
      DROP POLICY IF EXISTS "Calendar members can view availability" ON public.availability_blocks;
      DROP POLICY IF EXISTS "Users can create their own availability in joined calendars" ON public.availability_blocks;
      DROP POLICY IF EXISTS "Users can update their own availability" ON public.availability_blocks;
      DROP POLICY IF EXISTS "Users can delete their own availability" ON public.availability_blocks;
    `
  },
  {
    name: 'Drop all existing policies on events',
    sql: `
      DROP POLICY IF EXISTS "events_select" ON public.events;
      DROP POLICY IF EXISTS "events_insert" ON public.events;
      DROP POLICY IF EXISTS "events_update" ON public.events;
      DROP POLICY IF EXISTS "events_delete" ON public.events;
      DROP POLICY IF EXISTS "Calendar members can view events" ON public.events;
      DROP POLICY IF EXISTS "Calendar members can create events" ON public.events;
      DROP POLICY IF EXISTS "Calendar members can update events" ON public.events;
      DROP POLICY IF EXISTS "Calendar members can delete events" ON public.events;
    `
  },
  {
    name: 'Enable RLS on all tables',
    sql: `
      ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.shared_calendars    ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.calendar_members    ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;
    `
  },
  {
    name: 'Create PROFILES policies',
    sql: `
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
    `
  },
  {
    name: 'Create SHARED_CALENDARS policies',
    sql: `
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
    `
  },
  {
    name: 'Create CALENDAR_MEMBERS policies (THE CORE FIX)',
    sql: `
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
    `
  },
  {
    name: 'Create AVAILABILITY_BLOCKS policies',
    sql: `
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
    `
  },
  {
    name: 'Create EVENTS policies',
    sql: `
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
    `
  },
];

const VERIFY_SQL = `
  SELECT
      tablename,
      policyname,
      cmd,
      qual
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
`;

async function executeSql(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  return { status: response.status, body: await response.text() };
}

async function main() {
  console.log('=== TimeTogether RLS Fix ===\n');
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Steps: ${SQL_STEPS.length}\n`);

  let allSucceeded = true;

  for (let i = 0; i < SQL_STEPS.length; i++) {
    const step = SQL_STEPS[i];
    process.stdout.write(`[${i + 1}/${SQL_STEPS.length}] ${step.name}... `);
    
    try {
      const result = await executeSql(step.sql);
      if (result.status === 200 || result.status === 201) {
        console.log('✅ OK');
      } else {
        console.log(`❌ FAILED (HTTP ${result.status})`);
        console.log('Response:', result.body.substring(0, 500));
        allSucceeded = false;
        // Don't stop — try to apply remaining steps
      }
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      allSucceeded = false;
    }
  }

  console.log('\n=== Verification ===');
  try {
    const verifyResult = await executeSql(VERIFY_SQL);
    if (verifyResult.status === 200) {
      const policies = JSON.parse(verifyResult.body);
      if (Array.isArray(policies)) {
        console.log(`\nFound ${policies.length} policies:\n`);
        const tables = {};
        for (const p of policies) {
          if (!tables[p.tablename]) tables[p.tablename] = [];
          tables[p.tablename].push(`  ${p.cmd.padEnd(8)} ${p.policyname}`);
        }
        for (const [table, rows] of Object.entries(tables)) {
          console.log(`  ${table}:`);
          rows.forEach(r => console.log(r));
        }
        
        // Check for any remaining recursive patterns
        const recursive = policies.filter(p => 
          p.qual && p.qual.includes('calendar_members') && 
          p.tablename === 'calendar_members' &&
          p.qual.includes('user_id = auth.uid()')
        );
        
        if (recursive.length === 0) {
          console.log('\n✅ No recursive calendar_members policy detected!');
        } else {
          console.log('\n⚠️  Warning: Possible recursive policies found:');
          recursive.forEach(p => console.log(`  - ${p.tablename}: ${p.policyname}`));
        }
      } else {
        console.log('Verification response:', verifyResult.body.substring(0, 1000));
      }
    } else {
      console.log(`Verification HTTP ${verifyResult.status}:`, verifyResult.body.substring(0, 500));
    }
  } catch (err) {
    console.log('Verification error:', err.message);
  }

  console.log('\n=== Result ===');
  if (allSucceeded) {
    console.log('✅ All steps succeeded! RLS fix applied successfully.');
    console.log('\nThe "infinite recursion" error should now be resolved.');
    console.log('Refresh your app to verify.');
  } else {
    console.log('⚠️  Some steps failed. The Management API may require a Personal Access Token (PAT).');
    console.log('\nIf that is the case, please:');
    console.log('1. Go to: https://supabase.com/dashboard/project/xexiawdukhxivavmgnpw/sql/new');
    console.log('2. Paste the contents of: supabase/fix_rls_apply_now.sql');
    console.log('3. Click Run');
  }
}

main().catch(console.error);
