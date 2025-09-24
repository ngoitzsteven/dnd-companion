import { redirect } from "next/navigation";



import { DashboardShell } from "@/components/dashboard/dashboard-shell";

import { getServerSupabaseClient } from "@/lib/supabaseServer";

import type { PostgrestError } from "@supabase/supabase-js";

import type {

  Campaign,

  CampaignMember,

  Encounter,

  EncounterMonster,

  Location,

  Note,

  Npc,

  Pc,

  Profile,

  Quest

} from "@/types/database";



type DashboardSearchParams = Record<string, string | string[] | undefined>;

interface DashboardPageProps {

  searchParams?: DashboardSearchParams | Promise<DashboardSearchParams>;

}



type CampaignWithRole = Campaign & { membership_role: CampaignMember["role"] };

type CampaignMemberWithProfile = CampaignMember & {

  profile: Pick<Profile, "id" | "display_name" | "email"> | null;

};

type EncounterWithMonsters = Encounter & { encounter_monsters: EncounterMonster[] };



export default async function DashboardPage({ searchParams }: DashboardPageProps) {

  const resolvedSearchParams = await Promise.resolve(searchParams);

  const supabase = await getServerSupabaseClient();

  const {

    data: { user }

  } = await supabase.auth.getUser();



  if (!user) {

    redirect("/login");

  }



  const { data: membershipRows, error: membershipError } = await supabase

    .from("campaign_members")

    .select("campaign_id, role")

    .eq("profile_id", user.id)

    .eq("status", "active");



  if (membershipError) {

    console.error("Failed to load campaign memberships", membershipError);

    return (

      <DashboardShell

        campaigns={[]}

        selectedCampaignId={null}

        selectedCampaignRole={null}

        members={[]}

        locations={[]}

        npcs={[]}

        quests={[]}

        notes={[]}

        pcs={[]}

        encounters={[]}

        errorMessage={formatMembershipErrorMessage(membershipError)}

      />

    );

  }



  const campaignIds = membershipRows?.map((membership) => membership.campaign_id) ?? [];



  let campaigns: CampaignWithRole[] = [];



  if (campaignIds.length > 0) {

    const { data: campaignRows, error: campaignError } = await supabase

      .from("campaigns")

      .select("*")

      .in("id", campaignIds)

      .order("created_at", { ascending: true });



    if (campaignError) {

      throw new Error(campaignError.message);

    }



    const campaignMap = new Map(campaignRows?.map((campaign) => [campaign.id, campaign] as const));

    campaigns = (membershipRows ?? [])

      .map<CampaignWithRole | null>((membership) => {

        const campaign = campaignMap.get(membership.campaign_id);

        if (!campaign) return null;

        return { ...campaign, membership_role: membership.role };

      })

      .filter((value): value is CampaignWithRole => value !== null)

      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  }



  const requestedCampaign = Array.isArray(resolvedSearchParams?.campaign)

    ? resolvedSearchParams?.campaign[0]

    : resolvedSearchParams?.campaign;



  const selectedCampaignId = campaigns.find((campaign) => campaign.id === requestedCampaign)?.id ?? campaigns[0]?.id ?? null;



  let npcs: Npc[] = [];

  let quests: Quest[] = [];

  let notes: Note[] = [];

  let locations: Location[] = [];

  let pcs: Pc[] = [];

  let encounters: EncounterWithMonsters[] = [];

  let members: CampaignMemberWithProfile[] = [];



  if (selectedCampaignId) {

    const [npcResult, questResult, noteResult, locationResult, pcResult, encounterResult, memberResult] = await Promise.all([

      supabase

        .from("npcs")

        .select("*")

        .eq("campaign_id", selectedCampaignId)

        .order("created_at", { ascending: true }),

      supabase

        .from("quests")

        .select("*")

        .eq("campaign_id", selectedCampaignId)

        .order("created_at", { ascending: true }),

      supabase

        .from("notes")

        .select("*")

        .eq("campaign_id", selectedCampaignId)

        .order("created_at", { ascending: false }),

      supabase

        .from("locations")

        .select("*")

        .eq("campaign_id", selectedCampaignId)

        .order("created_at", { ascending: true }),

      supabase

        .from("pcs")

        .select("*")

        .eq("campaign_id", selectedCampaignId)

        .order("created_at", { ascending: true }),

      supabase

        .from("encounters")

        .select("*, encounter_monsters(*)")

        .eq("campaign_id", selectedCampaignId)

        .order("created_at", { ascending: true }),

      supabase

        .from("campaign_members")

        .select("*, profile:profiles!campaign_members_profile_id_fkey(id, display_name, email)")

        .eq("campaign_id", selectedCampaignId)

        .order("created_at", { ascending: true })

    ]);



    if (npcResult.error) throw new Error(npcResult.error.message);

    if (questResult.error) throw new Error(questResult.error.message);

    if (noteResult.error) throw new Error(noteResult.error.message);

    if (locationResult.error) throw new Error(locationResult.error.message);

    if (pcResult.error) throw new Error(pcResult.error.message);

    if (encounterResult.error) throw new Error(encounterResult.error.message);

    if (memberResult.error) throw new Error(memberResult.error.message);



    npcs = npcResult.data ?? [];

    quests = questResult.data ?? [];

    notes = noteResult.data ?? [];

    locations = locationResult.data ?? [];

    pcs = pcResult.data ?? [];

    encounters = (encounterResult.data as EncounterWithMonsters[]) ?? [];

    members = (memberResult.data as CampaignMemberWithProfile[]) ?? [];

  }



  const selectedCampaignRole = campaigns.find((campaign) => campaign.id === selectedCampaignId)?.membership_role ?? null;



  return (

    <DashboardShell

      campaigns={campaigns}

      selectedCampaignId={selectedCampaignId}

      selectedCampaignRole={selectedCampaignRole}

      members={members}

      locations={locations}

      npcs={npcs}

      quests={quests}

      notes={notes}

      pcs={pcs}

      encounters={encounters}

    />

  );

}

function formatMembershipErrorMessage(error: PostgrestError) {

  if (error.message.includes("schema cache")) {

    return "We couldn't find the campaign tables in your Supabase project. Run `supabase db push` to apply the latest schema, then refresh.";

  }



  if (error.message.includes("infinite recursion")) {

    return "Your database policies are referencing each other in a loop. Deploy the updated policies in `supabase/schema.sql`, then try again.";

  }



  return error.message ?? "We couldn't load your campaign memberships. Please try again.";

}


