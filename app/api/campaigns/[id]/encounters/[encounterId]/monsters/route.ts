import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignManager } from "@/lib/campaigns";

const monsterSchema = z.object({
  name: z.string().min(1).max(160),
  max_hp: z.number().int().min(0),
  current_hp: z.number().int().min(0).optional(),
  armor_class: z.number().int().min(0),
  initiative: z.number().int().optional()
});

interface RouteParams {
  params: {
    id: string;
    encounterId: string;
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const payload = await request.json().catch(() => null);
  const parsed = monsterSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid monster payload" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: encounter, error: encounterError } = await supabase
    .from("encounters")
    .select("id")
    .eq("id", params.encounterId)
    .eq("campaign_id", params.id)
    .maybeSingle();

  if (encounterError) {
    return NextResponse.json({ error: encounterError.message }, { status: 500 });
  }

  if (!encounter) {
    return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("encounter_monsters")
    .insert({
      encounter_id: params.encounterId,
      name: parsed.data.name,
      max_hp: parsed.data.max_hp,
      current_hp: parsed.data.current_hp ?? parsed.data.max_hp,
      armor_class: parsed.data.armor_class,
      initiative: parsed.data.initiative ?? null
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to add monster" }, { status: 500 });
  }

  return NextResponse.json(data);
}
