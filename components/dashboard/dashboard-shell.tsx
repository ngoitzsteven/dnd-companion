"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { postJson } from "@/lib/api";
import { formatDateLabel, formatRole, getTime, truncate } from "@/lib/campaign-utils";
import { cn } from "@/lib/utils";
import { CampaignCreateCard } from "@/components/dashboard/campaign-create-card";
import { CampaignResourceGrid } from "@/components/dashboard/campaign-resource-grid";
import { EmptyStateMessage } from "@/components/dashboard/empty-state-message";
import { QuickFactCard, StatCard } from "@/components/dashboard/stat-card";
import type {
  Location,
  Note,
  Npc,
  Pc,
  Quest,
  CampaignMember,
  Database
} from "@/types/database";

import type {
  CampaignMemberWithProfile,
  CampaignWithRole,
  EncounterWithMonsters
} from "@/lib/dashboard/types";

interface DashboardShellProps {
  campaigns: CampaignWithRole[];
  selectedCampaignId: string | null;
  selectedCampaignRole: CampaignMember["role"] | null;
  members: CampaignMemberWithProfile[];
  locations: Location[];
  npcs: Npc[];
  quests: Quest[];
  notes: Note[];
  pcs: Pc[];
  encounters: EncounterWithMonsters[];
  errorMessage?: string | null;
}

export function DashboardShell({
  campaigns,
  selectedCampaignId,
  selectedCampaignRole,
  members,
  locations,
  npcs,
  quests,
  notes,
  pcs,
  encounters,
  errorMessage
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient<Database>();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const hasCampaigns = campaigns.length > 0;
  const [isCampaignFormOpen, setIsCampaignFormOpen] = useState(!hasCampaigns);
  const [campaignName, setCampaignName] = useState("");
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const toggleSidebar = () => setIsSidebarOpen((previous) => !previous);

  const handleCampaignSelect = (campaignId: string) => {
    if (!campaignId || campaignId === selectedCampaignId) {
      return;
    }

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("campaign", campaignId);

    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const handleLogout = async () => {
    setLogoutError(null);
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    setIsLoggingOut(false);

    if (error) {
      setLogoutError(error.message);
      return;
    }

    router.push("/login");
    router.refresh();
  };

  const handleCampaignCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!campaignName.trim()) {
      setCampaignError("Enter a campaign name to continue.");
      return;
    }

    setCampaignError(null);
    setIsCreatingCampaign(true);

    try {
      const payload = await postJson<CampaignWithRole>("/api/campaigns", { name: campaignName.trim() });

      setCampaignName("");
      setIsCampaignFormOpen(false);

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("campaign", payload.id);

      const nextQuery = params.toString();
      router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
      router.refresh();
    } catch (creationError) {
      setCampaignError(creationError instanceof Error ? creationError.message : "Unable to create campaign");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const selectedCampaign = selectedCampaignId
    ? campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null
    : campaigns[0] ?? null;

  const canDeleteCampaign = selectedCampaignRole === "owner" && Boolean(selectedCampaign);

  const handleDeleteModalClose = () => {
    if (isDeletingCampaign) {
      return;
    }
    setIsDeleteModalOpen(false);
    setDeleteConfirmation("");
    setDeleteError(null);
  };

  const handleCampaignDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCampaign) {
      setDeleteError("No campaign selected.");
      return;
    }

    if (deleteConfirmation.trim().toLowerCase() !== "delete") {
      setDeleteError("Type delete to confirm.");
      return;
    }

    setIsDeletingCampaign(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/campaigns/${selectedCampaign.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        let message = "Unable to delete campaign.";

        try {
          const data = await response.json();
          if (data && typeof data.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore body parsing errors
        }

        throw new Error(message);
      }

      setIsDeleteModalOpen(false);
      setDeleteConfirmation("");
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.delete("campaign");
      const nextQuery = params.toString();
      router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
      router.refresh();
    } catch (deleteCampaignError) {
      setDeleteError(deleteCampaignError instanceof Error ? deleteCampaignError.message : "Unable to delete campaign.");
    } finally {
      setIsDeletingCampaign(false);
    }
  };

  const activeQuestCount = quests.filter((quest) => quest.status !== "completed").length;
  const activeEncounterCount = encounters.filter((encounter) => encounter.status !== "completed").length;

  const recentNotes = [...notes]
    .sort((a, b) => getTime(b.created_at) - getTime(a.created_at))
    .slice(0, 4);
  const recentEncounters = [...encounters]
    .sort((a, b) => getTime(b.created_at) - getTime(a.created_at))
    .slice(0, 4);
  const visibleMembers = members.slice(0, 6);
  const visibleQuests = [...quests]
    .sort((a, b) => getTime(b.created_at) - getTime(a.created_at))
    .slice(0, 6);
  const canManageSelectedCampaign = selectedCampaignRole === "owner" || selectedCampaignRole === "co_dm";

  const createCampaignSection = (
    <CampaignCreateCard
      isOpen={isCampaignFormOpen}
      hasCampaigns={hasCampaigns}
      name={campaignName}
      onNameChange={(value) => setCampaignName(value)}
      onToggle={() => setIsCampaignFormOpen((previous) => !previous)}
      onSubmit={handleCampaignCreate}
      isSubmitting={isCreatingCampaign}
      error={campaignError}
    />
  );

  let mainContent: ReactNode;

  if (errorMessage) {
    mainContent = (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Campaign dashboard</h1>
          <p className="text-sm text-slate-400">We ran into an issue loading your campaigns.</p>
        </header>
        <Card className="border border-rose-500/40 bg-rose-950/30 text-rose-100">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription className="text-rose-200/80">{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  } else if (!hasCampaigns) {
    mainContent = (
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Welcome to your dashboard</h1>
          <p className="text-sm text-slate-400">
            Create your first campaign to start tracking quests, NPCs, encounters, and session notes.
          </p>
        </header>
        <Card className="border-dashed border-slate-700 bg-slate-900/50 text-slate-300">
          <CardHeader className="flex flex-col items-start gap-2">
            <CardTitle>No campaigns yet</CardTitle>
            <CardDescription>
              Once you create a campaign, we&apos;ll surface your party roster, quest log, prep notes, and battle encounters
              right here.
            </CardDescription>
          </CardHeader>
        </Card>
        {createCampaignSection}
      </div>
    );
  } else {
    mainContent = (
      <div className="space-y-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.15em] text-brand-light">Campaign overview</p>
            <h1 className="text-3xl font-semibold text-white">
              {selectedCampaign ? selectedCampaign.name : "Select a campaign"}
            </h1>
            {selectedCampaignRole ? (
              <p className="text-sm text-slate-400">
                You are set as <span className="font-medium text-slate-200">{formatRole(selectedCampaignRole)}</span> for this
                campaign.
              </p>
            ) : null}
          </div>
          {canDeleteCampaign ? (
            <Button
              type="button"
              variant="ghost"
              className="self-start border border-rose-500/60 px-4 text-rose-200 hover:bg-rose-950/60 hover:text-rose-100 focus-visible:outline-rose-500"
              onClick={() => {
                setDeleteError(null);
                setDeleteConfirmation("");
                setIsDeleteModalOpen(true);
              }}
            >
              Delete campaign
            </Button>
          ) : null}
        </header>

        {createCampaignSection}

        <section className="grid gap-4 lg:grid-cols-3">
          <StatCard label="Active quests" value={activeQuestCount} description="Keep your party aligned on what comes next." />
          <StatCard label="Active encounters" value={activeEncounterCount} description="Prep combat scenarios ready to deploy." />
          <StatCard
            label="Session cadence"
            value={notes.length}
            description="Track each recap to keep your table in the loop."
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent session notes</CardTitle>
                <CardDescription>The last four logs help you pick up where you left off.</CardDescription>
              </div>
            </CardHeader>
            <ul className="space-y-3 text-sm text-slate-300">
              {recentNotes.length === 0 ? (
                <EmptyStateMessage message="Record your first recap to see it here." />
              ) : (
                recentNotes.map((note) => (
                  <li key={note.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-sm font-medium text-slate-100">{formatDateLabel(note.session_date)}</p>
                    <p className="text-sm text-slate-400">{truncate(note.content, 140)}</p>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Quest log</CardTitle>
                <CardDescription>Track goals and side quests in one place.</CardDescription>
              </div>
            </CardHeader>
            <ul className="space-y-3 text-sm text-slate-300">
              {visibleQuests.length === 0 ? (
                <EmptyStateMessage message="Add your first quest to populate this board." />
              ) : (
                visibleQuests.map((quest) => (
                  <li key={quest.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{quest.title}</p>
                      {quest.summary ? <p className="text-xs text-slate-500">{truncate(quest.summary, 160)}</p> : null}
                    </div>
                    <span className="text-xs uppercase tracking-wide text-slate-400">{quest.status}</span>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Party roster</CardTitle>
                <CardDescription>See who&apos;s at the table and their roles.</CardDescription>
              </div>
            </CardHeader>
            <ul className="space-y-3 text-sm text-slate-300">
              {visibleMembers.length === 0 ? (
                <EmptyStateMessage message="Invite your players to fill out this roster." />
              ) : (
                visibleMembers.map((member) => (
                  <li key={member.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-sm font-medium text-slate-100">{member.profile?.display_name ?? "Unnamed"}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{formatRole(member.role)}</p>
                    {member.profile?.email ? <p className="text-xs text-slate-500">{member.profile.email}</p> : null}
                  </li>
                ))
              )}
              {members.length > 6 ? (
                <li className="text-xs uppercase tracking-wide text-slate-500">Showing 6 of {members.length} members.</li>
              ) : null}
            </ul>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>NPC spotlight</CardTitle>
                <CardDescription>Keep personalities consistent session to session.</CardDescription>
              </div>
            </CardHeader>
            <ul className="space-y-3 text-sm text-slate-300">
              {npcs.length === 0 ? (
                <EmptyStateMessage message="Add an NPC to build out your world." />
              ) : (
                npcs.slice(0, 6).map((npc) => (
                  <li key={npc.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-sm font-medium text-slate-100">{npc.name}</p>
                    {npc.description ? <p className="text-xs text-slate-500">{truncate(npc.description, 140)}</p> : null}
                  </li>
                ))
              )}
              {npcs.length > 6 ? (
                <li className="text-xs uppercase tracking-wide text-slate-500">Showing 6 of {npcs.length} NPCs.</li>
              ) : null}
            </ul>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Encounter prep</CardTitle>
                <CardDescription>Upcoming combat ready to deploy.</CardDescription>
              </div>
            </CardHeader>
            <ul className="space-y-3 text-sm text-slate-300">
              {recentEncounters.length === 0 ? (
                <EmptyStateMessage message="Plan an encounter to see it here." />
              ) : (
                recentEncounters.map((encounter) => (
                  <li key={encounter.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-100">{encounter.name}</p>
                      <span className="text-xs uppercase tracking-wide text-slate-500">{encounter.status}</span>
                    </div>
                    {encounter.summary ? <p className="text-xs text-slate-500">{truncate(encounter.summary, 120)}</p> : null}
                    <p className="text-xs text-slate-500">
                      {encounter.encounter_monsters.length} creature{encounter.encounter_monsters.length === 1 ? "" : "s"} | Round
                      {encounter.round ?? "?"}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickFactCard label="Locations tracked" value={locations.length} />
          <QuickFactCard label="Player characters" value={pcs.length} />
          <QuickFactCard label="Session notes" value={notes.length} />
          <QuickFactCard label="Saved NPCs" value={npcs.length} />
        </section>

        {selectedCampaignId ? (
          <CampaignResourceGrid
            campaignId={selectedCampaignId}
            canManage={canManageSelectedCampaign}
            notes={notes}
            pcs={pcs}
            npcs={npcs}
            quests={quests}
            locations={locations}
            encounters={encounters}
            onMutated={() => router.refresh()}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside
        className={cn(
          "flex min-h-screen flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="px-3 py-4">
          {isSidebarOpen ? (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.15em] text-brand-light">Campaigns</p>
              <p className="text-sm text-slate-400">Switch between your worlds.</p>
            </div>
          ) : (
            <span className="text-xs text-slate-500" aria-hidden="true">
              C
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          {campaigns.length === 0 ? (
            <p className="rounded-md bg-slate-900/50 px-3 py-2 text-xs text-slate-500">
              You&apos;ll see your campaigns listed here once you create one.
            </p>
          ) : (
            <ul className="space-y-1">
              {campaigns.map((campaign) => {
                const isActive = campaign.id === selectedCampaignId;
                const campaignInitial = campaign.name ? campaign.name.charAt(0).toUpperCase() : "?";

                return (
                  <li key={campaign.id}>
                    <button
                      type="button"
                      onClick={() => handleCampaignSelect(campaign.id)}
                      aria-current={isActive ? "page" : undefined}
                      title={campaign.name}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500",
                        isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800",
                        isSidebarOpen ? "flex flex-col items-start gap-1" : "flex h-12 items-center justify-center px-0"
                      )}
                    >
                      {isSidebarOpen ? (
                        <>
                          <span className="block w-full truncate">{campaign.name}</span>
                          <span className="text-xs text-slate-500">{formatRole(campaign.membership_role)}</span>
                        </>
                      ) : (
                        <span className="text-base">{campaignInitial}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="h-9 w-9 p-0 text-lg text-slate-300"
            >
              {isSidebarOpen ? "<" : ">"}
            </Button>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.15em] text-brand-light">Dashboard</p>
              <p className="truncate text-sm font-semibold text-white">
                {selectedCampaign ? selectedCampaign.name : "No campaigns yet"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {logoutError ? (
              <span className="text-xs text-rose-400" aria-live="polite">
                {logoutError}
              </span>
            ) : null}
            <Button variant="secondary" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "Signing out..." : "Log out"}
            </Button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-10 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">{mainContent}</div>
        </main>
      </div>
      <Modal
        open={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        title="Delete campaign"
        description="This action cannot be undone."
      >
        <form className="space-y-4" onSubmit={handleCampaignDelete}>
          <p className="text-sm text-slate-400">
            Type <span className="font-semibold text-slate-200">delete</span> to remove
            {selectedCampaign ? (
              <>
                {" "}
                <span className="font-semibold text-slate-200">{selectedCampaign.name}</span>
              </>
            ) : (
              " this campaign"
            )}
            .
          </p>
          <Input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            onPaste={(event) => event.preventDefault()}
            placeholder="delete"
            autoFocus
            disabled={isDeletingCampaign}
          />
          {deleteError ? <p className="text-xs text-rose-400">{deleteError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleDeleteModalClose} disabled={isDeletingCampaign}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-rose-600 text-white hover:bg-rose-500 focus-visible:outline-rose-500"
              disabled={isDeletingCampaign}
            >
              {isDeletingCampaign ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
