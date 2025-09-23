import { NextResponse } from "next/server";

import { getRouteHandlerSupabaseClient } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = getRouteHandlerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
