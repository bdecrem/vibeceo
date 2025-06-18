'use client'

import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
// If you have generated Supabase types, import them like this:
// import { Database } from '@/types/supabase'
// Then use: createBrowserClient<Database>()

export const supabase = createPagesBrowserClient()