import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignManager } from "@/lib/campaigns";

const statsSchema = z.record(z.string(), z.any()).optional();

const pcUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  class: z.string().max(60).optional().or(z.literal("")),
  race: z.string().max(60).optional().or(z.literal("")),
  level: z.number().int().min(1).max(20).optional(),
  stats: statsSchema
});

interface RouteParams {
  params: {
    id: string;
    pcId: string;
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const payload = await request.json().catch(() => null);
  const parsed = pcUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid PC payload" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const { data: pc, error: pcError } = await supabase
    .from("pcs")
    .select("*")
    .eq("id", params.pcId)
    .eq("campaign_id", params.id)
    .maybeSingle();

  if (pcError) {
    return NextResponse.json({ error: pcError.message }, { status: 500 });
  }

  if (!pc) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const manager = await assertCampaignManager(supabase, params.id, user.id);
  if (!manager && pc.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates = parsed.data;
  const payloadUpdate: Record<string, unknown> = {};
  if (updates.name) {
    payloadUpdate.name = updates.name;
  }
  if (updates.class !== undefined) {
    payloadUpdate.class = updates.class.trim() ? updates.class : null;
  }
  if (updates.race !== undefined) {
    payloadUpdate.race = updates.race.trim() ? updates.race : null;
  }
  if (updates.level !== undefined) {
    payloadUpdate.level = updates.level;
  }
  if (updates.stats !== undefined) {
    payloadUpdate.stats = updates.stats ?? {};
  }

  const { error } = await supabase
    .from("pcs")
    .update(payloadUpdate)
    .eq("id", params.pcId)
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
  const { data: pc, error: pcError } = await supabase
    .from("pcs")
    .select("created_by")
    .eq("id", params.pcId)
    .eq("campaign_id", params.id)
    .maybeSingle();

  if (pcError) {
    return NextResponse.json({ error: pcError.message }, { status: 500 });
  }

  if (!pc) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const manager = await assertCampaignManager(supabase, params.id, user.id);
  if (!manager && pc.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("pcs")
    .delete()
    .eq("id", params.pcId)
    .eq("campaign_id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
