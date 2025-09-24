import { NextResponse } from "next/server";
import { z } from "zod";

import { getRouteHandlerSupabaseClient } from "@/lib/supabaseServer";

const waitlistSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parseResult = waitlistSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid email address"
      },
      { status: 400 }
    );
  }

  const supabase = await getRouteHandlerSupabaseClient();
  const { data, error } = await supabase
    .from("waitlist_emails")
    .upsert({ email: parseResult.data.email })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}

