import type { SupabaseClient } from "@supabase/supabase-js";

import type { CampaignMember, Database } from "@/types/database";

export type CampaignMembership = Pick<CampaignMember, "role" | "status"> | null;

export async function getCampaignMembership(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  userId: string
): Promise<CampaignMembership> {
  const { data, error } = await supabase
    .from("campaign_members")
    .select("role, status")
    .eq("campaign_id", campaignId)
    .eq("profile_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return null;
  }

  return data ?? null;
}

export async function assertCampaignAccess(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  userId: string
) {
  const membership = await getCampaignMembership(supabase, campaignId, userId);
  return membership !== null;
}

export async function assertCampaignManager(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  userId: string
) {
  const membership = await getCampaignMembership(supabase, campaignId, userId);
  return membership !== null && (membership.role === "owner" || membership.role === "co_dm");
}

export function isManager(membership: CampaignMembership) {
  return membership !== null && (membership.role === "owner" || membership.role === "co_dm");
}

export function isOwner(membership: CampaignMembership) {
  return membership !== null && membership.role === "owner";
}
