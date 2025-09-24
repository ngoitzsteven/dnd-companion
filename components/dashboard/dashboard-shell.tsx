"use client";

import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NotesSection } from "./notes";
import { EmptyStateMessage, formatDateLabel, postJson, selectClassName } from "./shared";
import type { CampaignMember, Encounter, Database } from "@/types/database";
import type {
  CampaignCreateCardProps,
  CampaignMemberWithProfile,
  CampaignResourceGridProps,
  CampaignWithRole,
  DashboardShellProps,
  EncountersSectionProps,
  EncounterWithMonsters,
  LocationsSectionProps,
  NpcsSectionProps,
  PlayerCharactersSectionProps,
  QuestsSectionProps,
  QuickFactCardProps,
  StatCardProps
} from "./types";

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

  const handleResourceMutated = useCallback(() => {
    router.refresh();
  }, [router]);

  const locationLookup = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name] as const)),
    [locations]
  );

  const selectedCampaign = selectedCampaignId
    ? campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null
    : campaigns[0] ?? null;

  const activeQuestCount = quests.filter((quest) => quest.status !== "completed").length;
  const activeEncounterCount = encounters.filter((encounter) => encounter.status !== "completed").length;

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
            <CardDescription className="text-rose-200/80">
              {errorMessage}
            </CardDescription>
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
              Once you create a campaign, we&apos;ll surface your party roster, quest log, prep notes, and battle
              encounters right here.
            </CardDescription>
          </CardHeader>
        </Card>
        {createCampaignSection}
      </div>
    );
  } else {
    mainContent = (
      <div className="space-y-5">
        <header className="space-y-3">
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
        </header>

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
            {selectedCampaignId ? (
              <NotesSection
                campaignId={selectedCampaignId}
                canManage={canManageSelectedCampaign}
                notes={notes}
                locations={locations}
                locationLookup={locationLookup}
                onMutated={handleResourceMutated}
              />
            ) : (

              <Card className="bg-slate-900/60">

                <CardHeader>

                  <CardTitle>Session notes</CardTitle>

                  <CardDescription>Select a campaign to log and review notes.</CardDescription>

                </CardHeader>

              </Card>

            )}


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
                    {member.profile?.email ? (
                      <p className="text-xs text-slate-500">{member.profile.email}</p>
                    ) : null}
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
                      <span className="text-xs uppercase tracking-wide text-slate-400">{encounter.status}</span>
                    </div>
                    {encounter.summary ? (
                      <p className="text-xs text-slate-500">{truncate(encounter.summary, 120)}</p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      {encounter.encounter_monsters.length} creature{encounter.encounter_monsters.length === 1 ? "" : "s"} |
                      Round {encounter.round ?? "?"}
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
            pcs={pcs}
            npcs={npcs}
            quests={quests}
            locations={locations}
            locationLookup={locationLookup}
            encounters={encounters}
            onMutated={handleResourceMutated}
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
            <div className="space-y-3">
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
              {isSidebarOpen ? (
                <div className="pt-2">{createCampaignSection}</div>
              ) : (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsSidebarOpen(true);
                      setIsCampaignFormOpen(true);
                    }}
                    aria-label="Create campaign"
                  >
                    +
                  </Button>
                </div>
              )}
            </div>
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
          <div className="mx-auto w-full max-w-[96rem]">{mainContent}</div>
        </main>
      </div>
    </div>
  );
}

function CampaignResourceGrid({
  campaignId,
  canManage,
  pcs,
  npcs,
  quests,
  locations,
  locationLookup,
  encounters,
  onMutated
}: CampaignResourceGridProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <PlayerCharactersSection
          campaignId={campaignId}
          canManage={canManage}
          pcs={pcs}
          onMutated={onMutated}
        />
        <NpcsSection
          campaignId={campaignId}
          canManage={canManage}
          npcs={npcs}
          locations={locations}
          locationLookup={locationLookup}
          onMutated={onMutated}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <LocationsSection
          campaignId={campaignId}
          canManage={canManage}
          locations={locations}
          onMutated={onMutated}
        />
        <QuestsSection
          campaignId={campaignId}
          canManage={canManage}
          quests={quests}
          locations={locations}
          locationLookup={locationLookup}
          onMutated={onMutated}
        />
      </div>
      <EncountersSection
        campaignId={campaignId}
        canManage={canManage}
        encounters={encounters}
        onMutated={onMutated}
      />
    </div>
  );
}

function PlayerCharactersSection({ campaignId, canManage, pcs, onMutated }: PlayerCharactersSectionProps) {
  const [name, setName] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [race, setRace] = useState("");
  const [level, setLevel] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Enter a character name.");
      return;
    }

    const levelValue = level.trim() ? Number.parseInt(level, 10) : undefined;

    if (levelValue !== undefined && (Number.isNaN(levelValue) || levelValue < 1 || levelValue > 20)) {
      setError("Level must be between 1 and 20.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/pcs`, {
        name: name.trim(),
        class: characterClass.trim(),
        race: race.trim(),
        level: levelValue
      });

      setName("");
      setCharacterClass("");
      setRace("");
      setLevel("1");
      onMutated();
    } catch (pcError) {
      setError(pcError instanceof Error ? pcError.message : "Unable to add character");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-900/60">
      <CardHeader className="mb-4 flex-col items-start gap-1">
        <div>
          <CardTitle>Player characters</CardTitle>
          <CardDescription>Track the heroes at your table.</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-4">
        {canManage ? (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label htmlFor="pc-name" className="text-xs uppercase tracking-wide text-slate-400">
                  Name
                </label>
                <Input
                  id="pc-name"
                  placeholder="E.g. Lyra Stonesong"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1 text-sm">
                <label htmlFor="pc-level" className="text-xs uppercase tracking-wide text-slate-400">
                  Level
                </label>
                <Input
                  id="pc-level"
                  type="number"
                  min={1}
                  max={20}
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label htmlFor="pc-class" className="text-xs uppercase tracking-wide text-slate-400">
                  Class
                </label>
                <Input
                  id="pc-class"
                  placeholder="Wizard, Fighter..."
                  value={characterClass}
                  onChange={(event) => setCharacterClass(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1 text-sm">
                <label htmlFor="pc-race" className="text-xs uppercase tracking-wide text-slate-400">
                  Ancestry
                </label>
                <Input
                  id="pc-race"
                  placeholder="Elf, Tiefling..."
                  value={race}
                  onChange={(event) => setRace(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add character"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
            Only campaign owners and co-DMs can add player characters.
          </p>
        )}
        <div className="space-y-3 text-sm text-slate-300">
          {pcs.length === 0 ? (
            <EmptyStateMessage message="No characters logged yet." />
          ) : (
            pcs.map((pc) => {
              const details = [pc.class ?? undefined, pc.race ?? undefined]
                .filter(Boolean)
                .join(" ? ");

              return (
                <div key={pc.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-100">{pc.name}</p>
                    <span className="text-xs uppercase tracking-wide text-slate-500">Level {pc.level ?? 1}</span>
                  </div>
                  <p className="text-xs text-slate-500">{details || "Class & ancestry pending"}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}

function NpcsSection({ campaignId, canManage, npcs, locations, locationLookup, onMutated }: NpcsSectionProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quirks, setQuirks] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Enter an NPC name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/npcs`, {
        name: name.trim(),
        description: description.trim(),
        quirks: quirks.trim(),
        location_id: locationId ? locationId : null
      });

      setName("");
      setDescription("");
      setQuirks("");
      setLocationId("");
      onMutated();
    } catch (npcError) {
      setError(npcError instanceof Error ? npcError.message : "Unable to add NPC");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-900/60">
      <CardHeader className="mb-4 flex-col items-start gap-1">
        <div>
          <CardTitle>NPCs</CardTitle>
          <CardDescription>Keep personalities and plot hooks handy.</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-4">
        {canManage ? (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1 text-sm">
              <label htmlFor="npc-name" className="text-xs uppercase tracking-wide text-slate-400">
                Name
              </label>
              <Input
                id="npc-name"
                placeholder="E.g. Magistrate Velen"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="npc-description" className="text-xs uppercase tracking-wide text-slate-400">
                Description
              </label>
              <Textarea
                id="npc-description"
                placeholder="Role, appearance, or motivations."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="npc-quirks" className="text-xs uppercase tracking-wide text-slate-400">
                Quirks (optional)
              </label>
              <Input
                id="npc-quirks"
                placeholder="E.g. speaks in rhyme, collects odd trinkets"
                value={quirks}
                onChange={(event) => setQuirks(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="npc-location" className="text-xs uppercase tracking-wide text-slate-400">
                Linked location
              </label>
              <select
                id="npc-location"
                className={selectClassName}
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                disabled={isSubmitting}
              >
                <option value="">No location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add NPC"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
            Only campaign owners and co-DMs can add NPCs.
          </p>
        )}
        <div className="space-y-3 text-sm text-slate-300">
          {npcs.length === 0 ? (
            <EmptyStateMessage message="No NPCs saved yet." />
          ) : (
            npcs.map((npc) => (
              <div key={npc.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">{npc.name}</p>
                  {npc.location_id ? (
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      {locationLookup.get(npc.location_id) ?? "Unknown locale"}
                    </span>
                  ) : null}
                </div>
                {npc.description ? <p className="text-xs text-slate-500">{npc.description}</p> : null}
                {npc.quirks ? <p className="text-xs text-slate-500">Quirks: {npc.quirks}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function LocationsSection({ campaignId, canManage, locations, onMutated }: LocationsSectionProps) {
  const [name, setName] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Name your location before saving.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/locations`, {
        name: name.trim(),
        type: typeValue.trim(),
        description: description.trim()
      });

      setName("");
      setTypeValue("");
      setDescription("");
      onMutated();
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "Unable to save location");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-900/60">
      <CardHeader className="mb-4 flex-col items-start gap-1">
        <div>
          <CardTitle>Locations</CardTitle>
          <CardDescription>Map key places your party visits.</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-4">
        {canManage ? (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1 text-sm">
              <label htmlFor="location-name" className="text-xs uppercase tracking-wide text-slate-400">
                Name
              </label>
              <Input
                id="location-name"
                placeholder="E.g. The Gilded Griffin"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="location-type" className="text-xs uppercase tracking-wide text-slate-400">
                Type (optional)
              </label>
              <Input
                id="location-type"
                placeholder="City, Tavern, Ruins..."
                value={typeValue}
                onChange={(event) => setTypeValue(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="location-description" className="text-xs uppercase tracking-wide text-slate-400">
                Description
              </label>
              <Textarea
                id="location-description"
                placeholder="Lore, vibes, or notable NPCs."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add location"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
            Only campaign owners and co-DMs can add locations.
          </p>
        )}
        <div className="space-y-3 text-sm text-slate-300">
          {locations.length === 0 ? (
            <EmptyStateMessage message="No locations logged yet." />
          ) : (
            locations.map((location) => (
              <div key={location.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">{location.name}</p>
                  {location.type ? (
                    <span className="text-xs uppercase tracking-wide text-slate-500">{location.type}</span>
                  ) : null}
                </div>
                {location.description ? (
                  <p className="text-xs text-slate-500">{location.description}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function QuestsSection({ campaignId, canManage, quests, locations, locationLookup, onMutated }: QuestsSectionProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<Quest["status"]>("planned");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questStatuses: Array<Quest["status"]> = ["planned", "active", "completed"];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Add a quest title to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/quests`, {
        title: title.trim(),
        summary: summary.trim(),
        status,
        location_id: locationId ? locationId : null
      });

      setTitle("");
      setSummary("");
      setStatus("planned");
      setLocationId("");
      onMutated();
    } catch (questError) {
      setError(questError instanceof Error ? questError.message : "Unable to save quest");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-900/60">
      <CardHeader className="mb-4 flex-col items-start gap-1">
        <div>
          <CardTitle>Quest log</CardTitle>
          <CardDescription>Outline objectives and side stories.</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-4">
        {canManage ? (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1 text-sm">
              <label htmlFor="quest-title" className="text-xs uppercase tracking-wide text-slate-400">
                Title
              </label>
              <Input
                id="quest-title"
                placeholder="E.g. Rescue the River King"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="quest-summary" className="text-xs uppercase tracking-wide text-slate-400">
                Summary
              </label>
              <Textarea
                id="quest-summary"
                placeholder="Why does this quest matter?"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label htmlFor="quest-status" className="text-xs uppercase tracking-wide text-slate-400">
                  Status
                </label>
                <select
                  id="quest-status"
                  className={selectClassName}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Quest["status"])}
                  disabled={isSubmitting}
                >
                  {questStatuses.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 text-sm">
                <label htmlFor="quest-location" className="text-xs uppercase tracking-wide text-slate-400">
                  Linked location
                </label>
                <select
                  id="quest-location"
                  className={selectClassName}
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">No location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add quest"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
            Only campaign owners and co-DMs can add quests.
          </p>
        )}
        <div className="space-y-3 text-sm text-slate-300">
          {quests.length === 0 ? (
            <EmptyStateMessage message="No quests logged yet." />
          ) : (
            quests.map((quest) => (
              <div key={quest.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{quest.title}</p>
                  <span className="text-xs uppercase tracking-wide text-slate-500">{quest.status}</span>
                </div>
                {quest.summary ? <p className="text-xs text-slate-500">{quest.summary}</p> : null}
                {quest.location_id ? (
                  <p className="text-xs text-slate-500">
                    Location: {locationLookup.get(quest.location_id) ?? "Unknown"}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function EncountersSection({ campaignId, canManage, encounters, onMutated }: EncountersSectionProps) {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<Encounter["status"]>("draft");
  const [round, setRound] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const encounterStatuses: Array<Encounter["status"]> = ["draft", "active", "completed"];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Name your encounter to continue.");
      return;
    }

    const roundValue = round.trim() ? Number.parseInt(round, 10) : undefined;

    if (roundValue !== undefined && (Number.isNaN(roundValue) || roundValue < 1)) {
      setError("Set a round number of 1 or higher.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/encounters`, {
        name: name.trim(),
        summary: summary.trim(),
        status,
        round: roundValue
      });

      setName("");
      setSummary("");
      setStatus("draft");
      setRound("1");
      onMutated();
    } catch (encounterError) {
      setError(encounterError instanceof Error ? encounterError.message : "Unable to save encounter");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-900/60">
      <CardHeader className="mb-4 flex-col items-start gap-1">
        <div>
          <CardTitle>Encounters</CardTitle>
          <CardDescription>Prep combat and set-piece moments.</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-4">
        {canManage ? (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1 text-sm">
              <label htmlFor="encounter-name" className="text-xs uppercase tracking-wide text-slate-400">
                Name
              </label>
              <Input
                id="encounter-name"
                placeholder="E.g. Ambush at Dawnspire"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="encounter-summary" className="text-xs uppercase tracking-wide text-slate-400">
                Summary
              </label>
              <Textarea
                id="encounter-summary"
                placeholder="Victory conditions, enemy tactics, terrain twists."
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label htmlFor="encounter-status" className="text-xs uppercase tracking-wide text-slate-400">
                  Status
                </label>
                <select
                  id="encounter-status"
                  className={selectClassName}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Encounter["status"])}
                  disabled={isSubmitting}
                >
                  {encounterStatuses.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 text-sm">
                <label htmlFor="encounter-round" className="text-xs uppercase tracking-wide text-slate-400">
                  Current round
                </label>
                <Input
                  id="encounter-round"
                  type="number"
                  min={1}
                  value={round}
                  onChange={(event) => setRound(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add encounter"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
            Only campaign owners and co-DMs can add encounters.
          </p>
        )}
        <div className="space-y-3 text-sm text-slate-300">
          {encounters.length === 0 ? (
            <EmptyStateMessage message="No encounters prepped yet." />
          ) : (
            encounters.map((encounter) => (
              <div key={encounter.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">{encounter.name}</p>
                  <span className="text-xs uppercase tracking-wide text-slate-500">{encounter.status}</span>
                </div>
                {encounter.summary ? <p className="text-xs text-slate-500">{encounter.summary}</p> : null}
                <p className="text-xs text-slate-500">
                  {encounter.encounter_monsters.length} creature{encounter.encounter_monsters.length === 1 ? "" : "s"} ? Round {encounter.round ?? 1}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function CampaignCreateCard({
  isOpen,
  hasCampaigns,
  name,
  onNameChange,
  onToggle,
  onSubmit,
  isSubmitting,
  error
}: CampaignCreateCardProps) {
  return (
    <Card className="border border-slate-800/80 bg-slate-900/60">
      <CardHeader className="mb-4 flex-col items-start gap-3">
        <div className="space-y-1">
          <CardTitle>Start a new campaign</CardTitle>
          <CardDescription>
            {hasCampaigns
              ? "Spin up another world to organise quests, notes, and NPCs."
              : "Give your table a shared home for quests, notes, and NPCs."}
          </CardDescription>
        </div>
        <Button
          type="button"
          onClick={onToggle}
          variant={isOpen ? "secondary" : "primary"}
          size="sm"
          disabled={isSubmitting}
        >
          {isOpen ? "Cancel" : "New campaign"}
        </Button>
      </CardHeader>
      {isOpen ? (
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1 text-sm">
            <label htmlFor="campaign-name" className="text-xs uppercase tracking-wide text-slate-400">
              Campaign name
            </label>
            <Input
              id="campaign-name"
              placeholder="E.g. The Starfall Expedition"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create campaign"}
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}

function StatCard({ label, value, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-1 gap-5">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-400">{label}</CardTitle>
        <p className="text-3xl font-semibold text-white">{value}</p>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function QuickFactCard({ label, value }: QuickFactCardProps) {
  return (
    <Card className="bg-slate-900/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-400">{label}</CardTitle>
        <p className="text-2xl font-semibold text-white">{value}</p>
      </CardHeader>
    </Card>
  );
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function formatRole(role: CampaignMember["role"]) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTime(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

