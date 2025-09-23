import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth";
import { assertCampaignManager } from "@/lib/campaigns";
import type { Database } from "@/types/database";

const roleSchema = z.object({
  role: z.enum(["owner", "co_dm", "player"])
});

interface RouteParams {
  params: {
    id: string;
    memberId: string;
  };
}

async function getMember(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  memberId: string
) {
  return supabase
    .from("campaign_members")
    .select("id, role, profile_id")
    .eq("id", memberId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const payload = await request.json().catch(() => null);
  const parsed = roleSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: member, error: memberError } = await getMember(supabase, params.id, params.memberId);

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.role === "owner" && parsed.data.role !== "owner") {
    const { count, error } = await supabase
      .from("campaign_members")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", params.id)
      .eq("role", "owner");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Campaign must retain at least one owner" }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("campaign_members")
    .update({ role: parsed.data.role })
    .eq("id", params.memberId)
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

  const { data: member, error: memberError } = await getMember(supabase, params.id, params.memberId);

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.role === "owner") {
    const { count, error } = await supabase
      .from("campaign_members")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", params.id)
      .eq("role", "owner");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Campaign must retain at least one owner" }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("campaign_members")
    .delete()
    .eq("id", params.memberId)
    .eq("campaign_id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
