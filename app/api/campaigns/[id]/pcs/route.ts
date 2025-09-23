import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignAccess, assertCampaignManager } from "@/lib/campaigns";

const statsSchema = z.record(z.string(), z.any()).optional();

const pcSchema = z.object({
  name: z.string().min(1).max(120),
  class: z.string().max(60).optional().or(z.literal("")),
  race: z.string().max(60).optional().or(z.literal("")),
  level: z.number().int().min(1).max(20).optional(),
  stats: statsSchema
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
    .from("pcs")
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

  const payload = await request.json().catch(() => null);
  const parsed = pcSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid PC payload" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("pcs")
    .insert({
      campaign_id: params.id,
      name: parsed.data.name,
      class: parsed.data.class?.trim() ? parsed.data.class : null,
      race: parsed.data.race?.trim() ? parsed.data.race : null,
      level: parsed.data.level ?? 1,
      stats: parsed.data.stats ?? {},
      created_by: user.id
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create character" }, { status: 500 });
  }

  return NextResponse.json(data);
}
