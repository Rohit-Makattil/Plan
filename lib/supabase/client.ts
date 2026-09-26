import { createBrowserClient } from '@supabase/ssr'

export function cleanSupabaseUrl(url?: string): string {
  if (!url) return ''
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
}

export function createClient() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://xexiawdukhxivavmgnpw.supabase.co'
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_y2bvnTy9SSz_2jOPTtc0KQ_Q6vrF6lO'

  const url = cleanSupabaseUrl(rawUrl)

  return createBrowserClient(url, key)
}
