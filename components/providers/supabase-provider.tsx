"use client";

import { useState } from "react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import type { Session } from "@supabase/supabase-js";

import { createSupabaseClient } from "@/lib/supabaseClient";

interface SupabaseProviderProps {
  children: React.ReactNode;
  initialSession?: Session | null;
}

export function SupabaseProvider({ children, initialSession }: SupabaseProviderProps) {
  const [supabaseClient] = useState(createSupabaseClient);

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  );
}
