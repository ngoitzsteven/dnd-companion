import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignManager } from "@/lib/campaigns";

const monsterUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  max_hp: z.number().int().min(0).optional(),
  current_hp: z.number().int().min(0).optional(),
  armor_class: z.number().int().min(0).optional(),
  initiative: z.number().int().nullable().optional()
});

interface RouteParams {
  params: {
    id: string;
    encounterId: string;
    monsterId: string;
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const payload = await request.json().catch(() => null);
  const parsed = monsterUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid monster payload" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: monster, error: monsterError } = await supabase
    .from("encounter_monsters")
    .select("*, encounter:encounters(campaign_id)")
    .eq("id", params.monsterId)
    .eq("encounter_id", params.encounterId)
    .maybeSingle();

  if (monsterError) {
    return NextResponse.json({ error: monsterError.message }, { status: 500 });
  }

  if (!monster || monster.encounter?.campaign_id !== params.id) {
    return NextResponse.json({ error: "Monster not found" }, { status: 404 });
  }

  const updates = parsed.data;
  const payloadUpdate: Record<string, unknown> = {};
  if (updates.name) {
    payloadUpdate.name = updates.name;
  }
  if (updates.max_hp !== undefined) {
    payloadUpdate.max_hp = updates.max_hp;
    if (updates.current_hp === undefined && monster.current_hp > updates.max_hp) {
      payloadUpdate.current_hp = updates.max_hp;
    }
  }
  if (updates.current_hp !== undefined) {
    payloadUpdate.current_hp = updates.current_hp;
  }
  if (updates.armor_class !== undefined) {
    payloadUpdate.armor_class = updates.armor_class;
  }
  if (updates.initiative !== undefined) {
    payloadUpdate.initiative = updates.initiative;
  }

  const { error } = await supabase
    .from("encounter_monsters")
    .update(payloadUpdate)
    .eq("id", params.monsterId)
    .eq("encounter_id", params.encounterId);

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
    .from("encounter_monsters")
    .delete()
    .eq("id", params.monsterId)
    .eq("encounter_id", params.encounterId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
