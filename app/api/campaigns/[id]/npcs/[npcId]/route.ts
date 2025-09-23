import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignManager } from "@/lib/campaigns";

const npcUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional().or(z.literal("")),
  quirks: z.string().max(500).optional().or(z.literal("")),
  location_id: z.string().uuid().optional().nullable()
});

interface RouteParams {
  params: {
    id: string;
    npcId: string;
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await request.json().catch(() => null);
  const parsed = npcUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid NPC payload" }, { status: 400 });
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
  if (updates.name) {
    payload.name = updates.name;
  }
  if (updates.description !== undefined) {
    payload.description = updates.description.trim() ? updates.description : null;
  }
  if (updates.quirks !== undefined) {
    payload.quirks = updates.quirks.trim() ? updates.quirks : null;
  }
  if (updates.location_id !== undefined) {
    payload.location_id = updates.location_id ?? null;
  }

  const { error } = await supabase
    .from("npcs")
    .update(payload)
    .eq("id", params.npcId)
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
    .from("npcs")
    .delete()
    .eq("id", params.npcId)
    .eq("campaign_id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
