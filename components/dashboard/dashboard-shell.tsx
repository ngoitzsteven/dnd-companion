import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface CampaignWithRole extends Campaign {
  membership_role: CampaignMember["role"];
}

interface CampaignMemberWithProfile extends CampaignMember {
  profile: Pick<Profile, "id" | "display_name" | "email"> | null;
}

interface EncounterWithMonsters extends Encounter {
  encounter_monsters: EncounterMonster[];
}

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
  if (errorMessage) {
    return (
      <div className="space-y-6 py-12">
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
  }

  const hasCampaigns = campaigns.length > 0;
  const selectedCampaign = selectedCampaignId
    ? campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null
    : campaigns[0] ?? null;

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
  const visiblePcs = pcs.slice(0, 6);

  if (!hasCampaigns) {
    return (
      <div className="space-y-8 py-12">
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
      </div>
    );
  }

  return (
    <div className="space-y-10 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.15em] text-brand-light">Campaign overview</p>
        <h1 className="text-3xl font-semibold text-white">
          {selectedCampaign ? selectedCampaign.name : "Select a campaign"}
        </h1>
        {selectedCampaignRole ? (
          <p className="text-sm text-slate-400">
            You are set as <span className="font-medium text-slate-200">{formatRole(selectedCampaignRole)}</span> for this campaign.
          </p>
        ) : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Campaigns" value={campaigns.length} description="Total you&apos;re collaborating on" />
        <StatCard label="Party members" value={members.length} description="Across the selected campaign" />
        <StatCard label="Active quests" value={activeQuestCount} description="Planned or in-progress objectives" />
        <StatCard label="Encounters" value={activeEncounterCount} description="Draft or running battle plans" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Quest log</CardTitle>
              <CardDescription>Keep tabs on what the party is chasing.</CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {visibleQuests.length === 0 ? (
              <EmptyStateMessage message="No quests yet. Add your first objective to guide the party." />
            ) : (
              visibleQuests.map((quest) => (
                <article
                  key={quest.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-medium text-slate-100">{quest.title}</h3>
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {quest.status}
                    </span>
                  </div>
                  {quest.summary ? (
                    <p className="mt-2 text-sm text-slate-400">{quest.summary}</p>
                  ) : null}
                </article>
              ))
            )}
            {quests.length > visibleQuests.length ? (
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Showing the most recent {visibleQuests.length} of {quests.length} quests.
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Party roster</CardTitle>
              <CardDescription>Who&apos;s currently in the campaign.</CardDescription>
            </div>
          </CardHeader>
          <ul className="space-y-3 text-sm text-slate-300">
            {visibleMembers.length === 0 ? (
              <EmptyStateMessage message="Invite your players to see them here." />
            ) : (
              visibleMembers.map((member) => (
                <li key={member.id} className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-100">
                      {member.profile?.display_name ?? member.profile?.email ?? "Unknown adventurer"}
                    </p>
                    <p className="text-xs text-slate-500">{member.profile?.email}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-2 py-1 text-xs uppercase tracking-wide text-slate-400">
                    {formatRole(member.role)}
                  </span>
                </li>
              ))
            )}
            {members.length > visibleMembers.length ? (
              <li className="text-xs uppercase tracking-wide text-slate-500">
                Plus {members.length - visibleMembers.length} more party members.
              </li>
            ) : null}
          </ul>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent notes</CardTitle>
              <CardDescription>Quick recall from your latest sessions.</CardDescription>
            </div>
          </CardHeader>
          <ul className="space-y-3 text-sm text-slate-300">
            {recentNotes.length === 0 ? (
              <EmptyStateMessage message="Session notes keep your prep in sync." />
            ) : (
              recentNotes.map((note) => (
                <li key={note.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                    <span>{formatDateLabel(note.session_date ?? note.created_at)}</span>
                    {note.location_id ? <span>Location linked</span> : null}
                  </div>
                  <p className="text-sm text-slate-200">{truncate(note.content, 160)}</p>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>NPC directory</CardTitle>
              <CardDescription>Keep track of allies, rivals, and wildcards.</CardDescription>
            </div>
          </CardHeader>
          <ul className="space-y-3 text-sm text-slate-300">
            {npcs.length === 0 ? (
              <EmptyStateMessage message="Start cataloguing the characters your players meet." />
            ) : (
              npcs.slice(0, 6).map((npc) => (
                <li key={npc.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-sm font-medium text-slate-100">{npc.name}</p>
                  {npc.description ? <p className="mt-1 text-xs text-slate-500">{truncate(npc.description, 100)}</p> : null}
                  {npc.quirks ? <p className="mt-1 text-xs text-slate-500">Quirk: {truncate(npc.quirks, 80)}</p> : null}
                </li>
              ))
            )}
            {npcs.length > 6 ? (
              <li className="text-xs uppercase tracking-wide text-slate-500">
                Showing 6 of {npcs.length} NPCs.
              </li>
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
                    {encounter.encounter_monsters.length} creature{encounter.encounter_monsters.length === 1 ? "" : "s"} ·
                    Round {encounter.round ?? "–"}
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
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  description: string;
}

function StatCard({ label, value, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-400">{label}</CardTitle>
        <p className="text-3xl font-semibold text-white">{value}</p>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

interface QuickFactCardProps {
  label: string;
  value: number;
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

interface EmptyStateMessageProps {
  message: string;
}

function EmptyStateMessage({ message }: EmptyStateMessageProps) {
  return <p className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-4 text-center text-sm text-slate-500">{message}</p>;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trimEnd()}…`;
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Date pending";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
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
