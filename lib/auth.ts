import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getRouteHandlerSupabaseClient } from "@/lib/supabaseServer";
import type { Database } from "@/types/database";

interface AuthSuccess {
  supabase: SupabaseClient<Database>;
  user: User;
  errorResponse?: undefined;
}

interface AuthFailure {
  supabase: SupabaseClient<Database>;
  user: null;
  errorResponse: NextResponse;
}

export type AuthResult = AuthSuccess | AuthFailure;

export async function requireUser(): Promise<AuthResult> {
  const supabase = getRouteHandlerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  const profileUpsert = {
    id: user.id,
    display_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    email: user.email ?? null
  };

  await supabase.from("profiles").upsert(profileUpsert, { onConflict: "id" });

  return { supabase, user };
}
