import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignAccess, assertCampaignManager } from "@/lib/campaigns";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "co_dm", "player"])
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
    .from("campaign_members")
    .select(
      "id, role, status, created_at, invited_by, profile:profiles(id, display_name, email)"
    )
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
  const parsed = inviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite payload" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: existingMember, error: existingError } = await supabase
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", params.id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existingMember) {
    return NextResponse.json({ error: "User already a member" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("campaign_members")
    .insert({
      campaign_id: params.id,
      profile_id: profile.id,
      role: parsed.data.role,
      status: "active",
      invited_by: user.id
    })
    .select(
      "id, role, status, created_at, invited_by, profile:profiles(id, display_name, email)"
    )
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Unable to add member" }, { status: 500 });
  }

  return NextResponse.json(data);
}
