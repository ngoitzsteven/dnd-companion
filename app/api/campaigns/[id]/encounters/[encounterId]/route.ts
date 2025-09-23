import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignManager } from "@/lib/campaigns";

const encounterUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  summary: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["draft", "active", "completed"]).optional(),
  round: z.number().int().min(1).optional(),
  started_at: z.string().datetime().optional().nullable(),
  ended_at: z.string().datetime().optional().nullable()
});

interface RouteParams {
  params: {
    id: string;
    encounterId: string;
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const payload = await request.json().catch(() => null);
  const parsed = encounterUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid encounter payload" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates = parsed.data;
  const payloadUpdate: Record<string, unknown> = {};
  if (updates.name) {
    payloadUpdate.name = updates.name;
  }
  if (updates.summary !== undefined) {
    payloadUpdate.summary = updates.summary.trim() ? updates.summary : null;
  }
  if (updates.status) {
    payloadUpdate.status = updates.status;
  }
  if (updates.round !== undefined) {
    payloadUpdate.round = updates.round;
  }
  if (updates.started_at !== undefined) {
    payloadUpdate.started_at = updates.started_at;
  }
  if (updates.ended_at !== undefined) {
    payloadUpdate.ended_at = updates.ended_at;
  }

  const { error } = await supabase
    .from("encounters")
    .update(payloadUpdate)
    .eq("id", params.encounterId)
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
    .from("encounters")
    .delete()
    .eq("id", params.encounterId)
    .eq("campaign_id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
