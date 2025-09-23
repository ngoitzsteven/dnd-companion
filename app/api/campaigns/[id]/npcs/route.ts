import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignAccess, assertCampaignManager } from "@/lib/campaigns";

const npcSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().or(z.literal("")),
  quirks: z.string().max(500).optional().or(z.literal("")),
  location_id: z.string().uuid().optional().nullable()
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { supabase, user } = auth;
  const allowed = await assertCampaignAccess(supabase, params.id, user.id);

  if (!allowed) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("npcs")
    .select("*")
    .eq("campaign_id", params.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await request.json().catch(() => null);
  const parsed = npcSchema.safeParse(body);

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

  const { data, error } = await supabase
    .from("npcs")
    .insert({
      campaign_id: params.id,
      name: parsed.data.name,
      description: parsed.data.description?.trim() ? parsed.data.description : null,
      quirks: parsed.data.quirks?.trim() ? parsed.data.quirks : null,
      location_id: parsed.data.location_id ?? null
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create NPC" }, { status: 500 });
  }

  return NextResponse.json(data);
}
