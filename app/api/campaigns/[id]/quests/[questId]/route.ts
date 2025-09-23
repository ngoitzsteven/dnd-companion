import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignManager } from "@/lib/campaigns";

const questUpdateSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  summary: z.string().max(1000).optional().or(z.literal("")),
  status: z.enum(["planned", "active", "completed"]).optional(),
  location_id: z.string().uuid().optional().nullable()
});

interface RouteParams {
  params: {
    id: string;
    questId: string;
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await request.json().catch(() => null);
  const parsed = questUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quest payload" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.location_id) {
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id")
      .eq("id", parsed.data.location_id)
      .eq("campaign_id", params.id)
      .maybeSingle();

    if (locationError || !location) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
  }

  const updates = parsed.data;
  const payload: Record<string, unknown> = {};
  if (updates.title) {
    payload.title = updates.title;
  }
  if (updates.summary !== undefined) {
    payload.summary = updates.summary.trim() ? updates.summary : null;
  }
  if (updates.status) {
    payload.status = updates.status;
  }
  if (updates.location_id !== undefined) {
    payload.location_id = updates.location_id ?? null;
  }

  const { error } = await supabase
    .from("quests")
    .update(payload)
    .eq("id", params.questId)
    .eq("campaign_id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("quests")
    .delete()
    .eq("id", params.questId)
    .eq("campaign_id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
