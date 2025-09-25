import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { assertCampaignManager } from "@/lib/campaigns";

const bulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    payload: z.object({
      content: z.string().min(1),
      session_date: z.string().optional().nullable(),
      location_id: z.string().uuid().optional().nullable()
    })
  }))
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid bulk update payload" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updates = parsed.data.updates.map(update => ({
      id: update.id,
      content: update.payload.content,
      session_date: update.payload.session_date?.trim() ? update.payload.session_date : null,
      location_id: update.payload.location_id ?? null,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from("notes")
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to bulk update notes" }, { status: 500 });
  }
}