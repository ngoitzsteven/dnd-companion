import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignAccess, assertCampaignManager } from "@/lib/campaigns";

const questSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().max(1000).optional().or(z.literal("")),
  status: z.enum(["planned", "active", "completed"]).optional(),
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
    .from("quests")
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
  const parsed = questSchema.safeParse(body);

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

  const { data, error } = await supabase
    .from("quests")
    .insert({
      campaign_id: params.id,
      title: parsed.data.title,
      summary: parsed.data.summary?.trim() ? parsed.data.summary : null,
      status: parsed.data.status ?? "planned",
      location_id: parsed.data.location_id ?? null
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create quest" }, { status: 500 });
  }

  return NextResponse.json(data);
}
