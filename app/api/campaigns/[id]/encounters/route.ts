import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignAccess, assertCampaignManager } from "@/lib/campaigns";

const encounterSchema = z.object({
  name: z.string().min(1).max(160),
  summary: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["draft", "active", "completed"]).optional(),
  round: z.number().int().min(1).optional()
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
    .from("encounters")
    .select("*, encounter_monsters(*)")
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
  const parsed = encounterSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid encounter payload" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("encounters")
    .insert({
      campaign_id: params.id,
      name: parsed.data.name,
      summary: parsed.data.summary?.trim() ? parsed.data.summary : null,
      status: parsed.data.status ?? "draft",
      round: parsed.data.round ?? 1
    })
    .select("*, encounter_monsters(*)")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create encounter" }, { status: 500 });
  }

  return NextResponse.json(data);
}
