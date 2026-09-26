import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cleanSupabaseUrl } from './client'

export async function createServerSupabaseClient() {
  const cookieStore = cookies()

  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://xexiawdukhxivavmgnpw.supabase.co'
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_y2bvnTy9SSz_2jOPTtc0KQ_Q6vrF6lO'

  const url = cleanSupabaseUrl(rawUrl)

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}
