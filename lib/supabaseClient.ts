import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/database";

export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not set");
  }

  return createPagesBrowserClient<Database>({
    supabaseUrl,
    supabaseKey
  });
};
