import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { getCampaignMembership } from "@/lib/campaigns";
import type { Campaign, CampaignMember } from "@/types/database";

type CampaignRole = CampaignMember["role"];

const createCampaignSchema = z.object({
  name: z.string().min(1).max(100)
});

interface CampaignWithRole extends Campaign {
  membership_role: CampaignRole;
}

export async function GET() {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { supabase, user } = auth;
  const { data: membershipRows, error: membershipError } = await supabase
    .from("campaign_members")
    .select("campaign_id, role")
    .eq("profile_id", user.id)
    .eq("status", "active");

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  if (!membershipRows || membershipRows.length === 0) {
    return NextResponse.json([] satisfies CampaignWithRole[]);
  }

  const campaignIds = membershipRows.map((row) => row.campaign_id);
  const { data: campaigns, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .in("id", campaignIds)
    .order("created_at", { ascending: true });

  if (campaignError) {
    return NextResponse.json({ error: campaignError.message }, { status: 500 });
  }

  const campaignMap = new Map(campaigns?.map((campaign) => [campaign.id, campaign] as const));
  const payload = membershipRows
    .map<CampaignWithRole | null>((membership) => {
      const campaign = campaignMap.get(membership.campaign_id);
      if (!campaign) return null;
      return { ...campaign, membership_role: membership.role as CampaignRole };
    })
    .filter((value): value is CampaignWithRole => value !== null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await request.json().catch(() => null);
  const parsed = createCampaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid campaign name" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({ name: parsed.data.name.trim(), owner: user.id })
    .select("*")
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: error?.message ?? "Unable to create campaign" }, { status: 500 });
  }

  const { error: membershipError } = await supabase.from("campaign_members").insert({
    campaign_id: campaign.id,
    profile_id: user.id,
    role: "owner",
    status: "active",
    invited_by: user.id
  });

  if (membershipError) {
    await supabase.from("campaigns").delete().eq("id", campaign.id);
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  const membership = await getCampaignMembership(supabase, campaign.id, user.id);
  return NextResponse.json({ ...campaign, membership_role: membership?.role ?? "owner" } satisfies CampaignWithRole);
}
