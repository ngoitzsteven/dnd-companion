import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

import type { CampaignMember, Database } from "@/types/database";

import type {
  CampaignMemberWithProfile,
  CampaignWithRole,
  DashboardResources,
  EncounterWithMonsters
} from "./types";

interface CampaignQueryResult {
  campaigns: CampaignWithRole[];
  error?: PostgrestError;
}

type MembershipRow = Pick<CampaignMember, "campaign_id" | "role">;

type ListQuery<T> = Promise<{ data: T[] | null; error: PostgrestError | null }>;

export async function fetchCampaignsForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CampaignQueryResult> {
  const { data: membershipData, error: membershipError } = await supabase
    .from("campaign_members")
    .select("campaign_id, role")
    .eq("profile_id", userId)
    .eq("status", "active");

  if (membershipError) {
    console.error("Failed to load campaign memberships", membershipError);
    return { campaigns: [], error: membershipError };
  }

  const membershipRows = (membershipData ?? []) as MembershipRow[];
  const campaignIds = membershipRows.map((membership) => membership.campaign_id);

  if (campaignIds.length === 0) {
    return { campaigns: [] };
  }

  const { data: campaignRows, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .in("id", campaignIds)
    .order("created_at", { ascending: true });

  if (campaignError) {
    throw new Error(campaignError.message);
  }

  const campaignMap = new Map((campaignRows ?? []).map((campaign) => [campaign.id, campaign] as const));

  const campaigns = membershipRows
    .map<CampaignWithRole | null>((membership) => {
      const campaign = campaignMap.get(membership.campaign_id);
      if (!campaign) {
        return null;
      }

      return { ...campaign, membership_role: membership.role };
    })
    .filter((value): value is CampaignWithRole => value !== null)
    .sort((first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime());

  return { campaigns };
}

export function resolveCampaignSelection(
  campaigns: CampaignWithRole[],
  requestedCampaignId?: string | null
): { selectedCampaignId: string | null; selectedCampaignRole: CampaignMember["role"] | null } {
  const selectedCampaign = requestedCampaignId
    ? campaigns.find((campaign) => campaign.id === requestedCampaignId) ?? null
    : campaigns[0] ?? null;

  return {
    selectedCampaignId: selectedCampaign?.id ?? null,
    selectedCampaignRole: selectedCampaign?.membership_role ?? null
  };
}

export async function fetchDashboardResources(
  supabase: SupabaseClient<Database>,
  campaignId: string
): Promise<DashboardResources> {
  const [npcRows, questRows, noteRows, locationRows, pcRows, encounterRows, memberRows] = await Promise.all([
    getListOrThrow(supabase.from("npcs").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: true })),
    getListOrThrow(supabase.from("quests").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: true })),
    getListOrThrow(supabase.from("notes").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false })),
    getListOrThrow(supabase.from("locations").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: true })),
    getListOrThrow(supabase.from("pcs").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: true })),
    getListOrThrow(
      supabase
        .from("encounters")
        .select("*, encounter_monsters(*)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true })
    ),
    getListOrThrow(
      supabase
        .from("campaign_members")
        .select("*, profile:profiles!campaign_members_profile_id_fkey(id, display_name, email)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true })
    )
  ]);

  return {
    npcs: npcRows,
    quests: questRows,
    notes: noteRows,
    locations: locationRows,
    pcs: pcRows,
    encounters: encounterRows as EncounterWithMonsters[],
    members: memberRows as CampaignMemberWithProfile[]
  };
}

export function formatMembershipErrorMessage(error: PostgrestError) {
  if (error.message.includes("schema cache")) {
    return "We couldn't find the campaign tables in your Supabase project. Run `supabase db push` to apply the latest schema, then refresh.";
  }

  if (error.message.includes("infinite recursion")) {
    return "Your database policies are referencing each other in a loop. Deploy the updated policies in `supabase/schema.sql`, then try again.";
  }

  return error.message ?? "We couldn't load your campaign memberships. Please try again.";
}

async function getListOrThrow<T>(query: ListQuery<T>): Promise<T[]> {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
