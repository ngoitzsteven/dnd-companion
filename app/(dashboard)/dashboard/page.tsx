import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  fetchCampaignsForUser,
  fetchDashboardResources,
  formatMembershipErrorMessage,
  resolveCampaignSelection
} from "@/lib/dashboard/data";
import { createEmptyDashboardResources } from "@/lib/dashboard/types";
import { getServerSupabaseClient } from "@/lib/supabaseServer";

interface DashboardPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = getServerSupabaseClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const requestedCampaignId = Array.isArray(searchParams?.campaign)
    ? searchParams?.campaign[0]
    : searchParams?.campaign;

  const { campaigns, error: membershipError } = await fetchCampaignsForUser(supabase, user.id);

  if (membershipError) {
    return (
      <DashboardShell
        campaigns={[]}
        selectedCampaignId={null}
        selectedCampaignRole={null}
        {...createEmptyDashboardResources()}
        errorMessage={formatMembershipErrorMessage(membershipError)}
      />
    );
  }

  const { selectedCampaignId, selectedCampaignRole } = resolveCampaignSelection(campaigns, requestedCampaignId);

  const resources = selectedCampaignId
    ? await fetchDashboardResources(supabase, selectedCampaignId)
    : createEmptyDashboardResources();

  return (
    <DashboardShell
      campaigns={campaigns}
      selectedCampaignId={selectedCampaignId}
      selectedCampaignRole={selectedCampaignRole}
      {...resources}
    />
  );
}
