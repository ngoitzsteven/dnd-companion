
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  Campaign,
  CampaignMember,
  Encounter,
  EncounterMonster,
  Location,
  Note,
  Npc,
  Pc,
  Quest
} from "@/types/database";

type CampaignWithRole = Campaign & { membership_role: CampaignMember["role"] };
type EncounterWithMonsters = Encounter & { encounter_monsters: EncounterMonster[] };

type MemberWithProfile = CampaignMember & {
  profile: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
};

type MonsterDraft = {
  name: string;
  max_hp: string;
  armor_class: string;
  initiative: string;
};

type CampaignRole = CampaignMember["role"];

interface DashboardShellProps {
  campaigns: CampaignWithRole[];
  selectedCampaignId: string | null;
  selectedCampaignRole: CampaignRole | null;
  members: MemberWithProfile[];
  locations: Location[];
  npcs: Npc[];
  quests: Quest[];
  notes: Note[];
  pcs: Pc[];
  encounters: EncounterWithMonsters[];
}

const defaultMonsterDraft: MonsterDraft = {
  name: "",
  max_hp: "0",
  armor_class: "0",
  initiative: "0"
};
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
  encounters
}: DashboardShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignEditName, setCampaignEditName] = useState<string | null>(null);

  const [npcDraft, setNpcDraft] = useState({
    name: "",
    description: "",
    quirks: "",
    location_id: ""
  });
  const [questDraft, setQuestDraft] = useState({
    title: "",
    summary: "",
    status: "planned" as Quest["status"],
    location_id: ""
  });
  const [noteDraft, setNoteDraft] = useState({
    content: "",
    session_date: "",
    location_id: ""
  });
  const [locationDraft, setLocationDraft] = useState({ name: "", description: "", type: "" });
  const [memberInvite, setMemberInvite] = useState({ email: "", role: "player" as CampaignRole });
  const [pcDraft, setPcDraft] = useState({
    name: "",
    class: "",
    race: "",
    level: 1,
    statsText: "{}"
  });
  const [encounterDraft, setEncounterDraft] = useState({ name: "", summary: "" });
  const [monsterDrafts, setMonsterDrafts] = useState<Record<string, MonsterDraft>>({});

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId]
  );

  const isManager = selectedCampaignRole === "owner" || selectedCampaignRole === "co_dm";
  const isOwner = selectedCampaignRole === "owner";

  const locationCounts = useMemo(() => {
    const counts = new Map<string, { npcs: number; quests: number; notes: number }>();
    locations.forEach((location) => counts.set(location.id, { npcs: 0, quests: 0, notes: 0 }));
    npcs.forEach((npc) => {
      if (npc.location_id) {
        const entry = counts.get(npc.location_id);
        if (entry) entry.npcs += 1;
      }
    });
    quests.forEach((quest) => {
      if (quest.location_id) {
        const entry = counts.get(quest.location_id);
        if (entry) entry.quests += 1;
      }
    });
    notes.forEach((note) => {
      if (note.location_id) {
        const entry = counts.get(note.location_id);
        if (entry) entry.notes += 1;
      }
    });
    return counts;
  }, [locations, npcs, quests, notes]);

  const sortedMembers = useMemo(() => {
    const roleWeight: Record<CampaignRole, number> = { owner: 0, co_dm: 1, player: 2 };
    return [...members].sort((a, b) => {
      const diff = roleWeight[a.role] - roleWeight[b.role];
      if (diff !== 0) return diff;
      const nameA = a.profile?.display_name ?? a.profile?.email ?? "";
      const nameB = b.profile?.display_name ?? b.profile?.email ?? "";
      return nameA.localeCompare(nameB);
    });
  }, [members]);

  const encounterMonsterDraft = (encounterId: string) => monsterDrafts[encounterId] ?? defaultMonsterDraft;

  const apiRequest = async (input: RequestInfo, init?: RequestInit) => {
    const response = await fetch(input, {
      headers: {
        "Content-Type": "application/json"
      },
      ...init
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Unexpected error");
    }

    return response.json().catch(() => ({}));
  };
  const handleSelectCampaign = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const campaignId = event.target.value;
    const url = new URL(window.location.href);
    if (campaignId) {
      url.searchParams.set("campaign", campaignId);
    } else {
      url.searchParams.delete("campaign");
    }
    startTransition(() => {
      router.push(url.pathname + url.search);
      router.refresh();
    });
  };

  const handleCreateCampaign = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!campaignName.trim()) return;

    startTransition(async () => {
      try {
        const data = await apiRequest("/api/campaigns", {
          method: "POST",
          body: JSON.stringify({ name: campaignName.trim() })
        });
        setCampaignName("");
        setCampaignFormOpen(false);
        const url = new URL(window.location.href);
        url.searchParams.set("campaign", data.id as string);
        router.push(url.pathname + url.search);
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleRenameCampaign = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!campaignEditName || !campaignEditName.trim() || !selectedCampaignId) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: campaignEditName.trim() })
        });
        setCampaignEditName(null);
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleDeleteCampaign = () => {
    if (!selectedCampaignId || !isOwner) return;
    const confirmation = window.confirm("Delete this campaign? This cannot be undone.");
    if (!confirmation) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}`, {
          method: "DELETE"
        });
        const url = new URL(window.location.href);
        url.searchParams.delete("campaign");
        router.push(url.pathname + url.search);
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleCreateNpc = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCampaignId || !npcDraft.name.trim()) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/npcs`, {
          method: "POST",
          body: JSON.stringify({
            name: npcDraft.name,
            description: npcDraft.description,
            quirks: npcDraft.quirks,
            location_id: npcDraft.location_id || null
          })
        });
        setNpcDraft({ name: "", description: "", quirks: "", location_id: "" });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleUpdateNpc = (npcId: string, payload: Partial<Npc>) => {
    if (!selectedCampaignId) return;
    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/npcs/${npcId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleDeleteNpc = (npcId: string) => {
    if (!selectedCampaignId) return;
    const confirmation = window.confirm("Delete this NPC?");
    if (!confirmation) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/npcs/${npcId}`, {
          method: "DELETE"
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleCreateQuest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCampaignId || !questDraft.title.trim()) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/quests`, {
          method: "POST",
          body: JSON.stringify({
            title: questDraft.title,
            summary: questDraft.summary,
            status: questDraft.status,
            location_id: questDraft.location_id || null
          })
        });
        setQuestDraft({ title: "", summary: "", status: "planned", location_id: "" });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleUpdateQuest = (questId: string, payload: Partial<Quest>) => {
    if (!selectedCampaignId) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/quests/${questId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleDeleteQuest = (questId: string) => {
    if (!selectedCampaignId) return;
    const confirmation = window.confirm("Delete this quest?");
    if (!confirmation) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/quests/${questId}`, {
          method: "DELETE"
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleCreateNote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCampaignId || !noteDraft.content.trim()) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/notes`, {
          method: "POST",
          body: JSON.stringify({
            content: noteDraft.content,
            session_date: noteDraft.session_date || null,
            location_id: noteDraft.location_id || null
          })
        });
        setNoteDraft({ content: "", session_date: "", location_id: "" });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleUpdateNote = (noteId: string, payload: Partial<Note>) => {
    if (!selectedCampaignId) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/notes/${noteId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleDeleteNote = (noteId: string) => {
    if (!selectedCampaignId) return;
    const confirmation = window.confirm("Delete this note?");
    if (!confirmation) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/notes/${noteId}`, {
          method: "DELETE"
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };
  const handleInviteMember = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCampaignId || !memberInvite.email.trim()) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/members`, {
          method: "POST",
          body: JSON.stringify({
            email: memberInvite.email,
            role: memberInvite.role
          })
        });
        setMemberInvite({ email: "", role: "player" });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleUpdateMemberRole = (memberId: string, role: CampaignRole) => {
    if (!selectedCampaignId) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/members/${memberId}`, {
          method: "PATCH",
          body: JSON.stringify({ role })
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (!selectedCampaignId) return;
    const confirmation = window.confirm("Remove this member from the campaign?");
    if (!confirmation) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/members/${memberId}`, {
          method: "DELETE"
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleCreateLocation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCampaignId || !locationDraft.name.trim()) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/locations`, {
          method: "POST",
          body: JSON.stringify({
            name: locationDraft.name,
            description: locationDraft.description,
            type: locationDraft.type
          })
        });
        setLocationDraft({ name: "", description: "", type: "" });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleEditLocation = (location: Location) => {
    if (!selectedCampaignId) return;
    const name = window.prompt("Update location name", location.name);
    if (!name || !name.trim()) return;
    const type = window.prompt("Update location type", location.type ?? "") ?? "";
    const description = window.prompt("Update location description", location.description ?? "") ?? "";

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/locations/${location.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name,
            type,
            description
          })
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleDeleteLocation = (locationId: string) => {
    if (!selectedCampaignId) return;
    const confirmation = window.confirm("Delete this location? Links on NPCs, quests, and notes will be cleared.");
    if (!confirmation) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/locations/${locationId}`, {
          method: "DELETE"
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleCreatePc = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCampaignId || !pcDraft.name.trim()) return;

    let stats: unknown = {};
    try {
      stats = pcDraft.statsText.trim() ? JSON.parse(pcDraft.statsText) : {};
    } catch (error) {
      window.alert("Stats must be valid JSON");
      return;
    }

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/pcs`, {
          method: "POST",
          body: JSON.stringify({
            name: pcDraft.name,
            class: pcDraft.class,
            race: pcDraft.race,
            level: pcDraft.level,
            stats
          })
        });
        setPcDraft({ name: "", class: "", race: "", level: 1, statsText: "{}" });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleEditPc = (pc: Pc) => {
    if (!selectedCampaignId || !isManager) return;

    const name = window.prompt("Character name", pc.name) ?? pc.name;
    if (!name.trim()) {
      window.alert("Name cannot be empty");
      return;
    }

    const cls = window.prompt("Class", pc.class ?? "") ?? pc.class ?? "";
    const race = window.prompt("Race", pc.race ?? "") ?? pc.race ?? "";
    const levelInput = window.prompt("Level", String(pc.level ?? 1)) ?? String(pc.level ?? 1);
    const level = Number.parseInt(levelInput, 10);
    if (Number.isNaN(level) || level < 1 || level > 20) {
      window.alert("Level must be between 1 and 20");
      return;
    }
    const statsInput = window.prompt("Stats JSON", JSON.stringify(pc.stats ?? {})) ?? JSON.stringify(pc.stats ?? {});
    let stats: unknown = pc.stats ?? {};
    try {
      stats = statsInput.trim() ? JSON.parse(statsInput) : {};
    } catch (error) {
      window.alert("Stats must be valid JSON");
      return;
    }

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/pcs/${pc.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name,
            class: cls,
            race,
            level,
            stats
          })
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleDeletePc = (pcId: string) => {
    if (!selectedCampaignId || !isManager) return;
    const confirmation = window.confirm("Delete this character?");
    if (!confirmation) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/pcs/${pcId}`, {
          method: "DELETE"
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleCreateEncounter = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCampaignId || !encounterDraft.name.trim()) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/encounters`, {
          method: "POST",
          body: JSON.stringify({
            name: encounterDraft.name,
            summary: encounterDraft.summary
          })
        });
        setEncounterDraft({ name: "", summary: "" });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleUpdateEncounter = (encounterId: string, payload: Partial<Encounter>) => {
    if (!selectedCampaignId) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/encounters/${encounterId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleDeleteEncounter = (encounterId: string) => {
    if (!selectedCampaignId) return;
    const confirmation = window.confirm("Delete this encounter and all monsters?");
    if (!confirmation) return;

    startTransition(async () => {
      try {
        await apiRequest(`/api/campaigns/${selectedCampaignId}/encounters/${encounterId}`, {
          method: "DELETE"
        });
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleMonsterDraftChange = (encounterId: string, key: keyof MonsterDraft, value: string) => {
    setMonsterDrafts((drafts) => ({
      ...drafts,
      [encounterId]: {
        ...encounterMonsterDraft(encounterId),
        [key]: value
      }
    }));
  };

  const handleAddMonster = (encounterId: string) => {
    if (!selectedCampaignId) return;
    const draft = encounterMonsterDraft(encounterId);
    if (!draft.name.trim()) return;

    const maxHp = Number.parseInt(draft.max_hp, 10);
    const armorClass = Number.parseInt(draft.armor_class, 10);
    const initiative = draft.initiative ? Number.parseInt(draft.initiative, 10) : null;

    if (Number.isNaN(maxHp) || Number.isNaN(armorClass) || maxHp < 0 || armorClass < 0) {
      window.alert("HP and AC must be valid numbers");
      return;
    }

    startTransition(async () => {
      try {
        await apiRequest(
          `/api/campaigns/${selectedCampaignId}/encounters/${encounterId}/monsters`,
          {
            method: "POST",
            body: JSON.stringify({
              name: draft.name,
              max_hp: maxHp,
              armor_class: armorClass,
              initiative: initiative ?? undefined
            })
          }
        );
        setMonsterDrafts((prev) => ({ ...prev, [encounterId]: defaultMonsterDraft }));
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleUpdateMonster = (
    encounterId: string,
    monsterId: string,
    payload: Partial<EncounterMonster>
  ) => {
    if (!selectedCampaignId) return;
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/campaigns/${selectedCampaignId}/encounters/${encounterId}/monsters/${monsterId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload)
          }
        );
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleDeleteMonster = (encounterId: string, monsterId: string) => {
    if (!selectedCampaignId) return;
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/campaigns/${selectedCampaignId}/encounters/${encounterId}/monsters/${monsterId}`,
          {
            method: "DELETE"
          }
        );
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleAdjustMonsterHp = (encounterId: string, monster: EncounterMonster, delta: number) => {
    const nextHp = Math.min(monster.max_hp, Math.max(0, monster.current_hp + delta));
    handleUpdateMonster(encounterId, monster.id, { current_hp: nextHp });
  };
  return (
    <div className="space-y-6 pb-12">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Control</CardTitle>
          <CardDescription>Switch between campaigns, invite collaborators, and manage ownership.</CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_auto] md:items-end">
            <label className="text-sm font-medium text-slate-200">
              Active campaign
              <select
                value={selectedCampaignId ?? ""}
                onChange={handleSelectCampaign}
                className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <option value="">Select campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.membership_role})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setCampaignFormOpen((open) => !open)}>
                {campaignFormOpen ? "Cancel" : "Create campaign"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCampaignEditName(selectedCampaign?.name ?? null)}
                disabled={!selectedCampaignId || !isManager}
              >
                Rename campaign
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!selectedCampaignId || !isOwner}
                onClick={handleDeleteCampaign}
              >
                Delete campaign
              </Button>
            </div>
          </div>

          {campaignFormOpen && (
            <form onSubmit={handleCreateCampaign} className="grid gap-3 md:grid-cols-[minmax(0,280px)_auto] md:items-center">
              <Input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="New campaign name"
                required
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create"}
              </Button>
            </form>
          )}

          {campaignEditName !== null && selectedCampaignId && (
            <form onSubmit={handleRenameCampaign} className="grid gap-3 md:grid-cols-[minmax(0,280px)_auto] md:items-center">
              <Input
                value={campaignEditName}
                onChange={(event) => setCampaignEditName(event.target.value)}
                placeholder="Rename campaign"
                required
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Members</CardTitle>
            <CardDescription>Invite co-DMs and players to collaborate on this campaign.</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <form onSubmit={handleInviteMember} className="grid gap-3 md:grid-cols-[minmax(0,220px)_180px_auto] md:items-end">
              <Input
                type="email"
                placeholder="user@example.com"
                value={memberInvite.email}
                onChange={(event) => setMemberInvite((draft) => ({ ...draft, email: event.target.value }))}
                required
                disabled={!isManager || !selectedCampaignId}
              />
              <select
                value={memberInvite.role}
                onChange={(event) => setMemberInvite((draft) => ({ ...draft, role: event.target.value as CampaignRole }))}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                disabled={!isManager || !selectedCampaignId}
              >
                <option value="player">Player</option>
                <option value="co_dm">Co-DM</option>
                <option value="owner">Owner</option>
              </select>
              <Button type="submit" disabled={!isManager || !selectedCampaignId || isPending}>
                {isPending ? "Inviting..." : "Send invite"}
              </Button>
            </form>
            <ul className="space-y-3">
              {sortedMembers.map((member) => (
                <li key={member.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {member.profile?.display_name ?? member.profile?.email ?? "Unknown user"}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {member.role}
                      </p>
                      {member.profile?.email && (
                        <p className="text-xs text-slate-500">{member.profile.email}</p>
                      )}
                    </div>
                    {isManager && (
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={member.role}
                          onChange={(event) => handleUpdateMemberRole(member.id, event.target.value as CampaignRole)}
                          className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          disabled={isPending || (!isOwner && member.role === "owner")}
                        >
                          <option value="owner">Owner</option>
                          <option value="co_dm">Co-DM</option>
                          <option value="player">Player</option>
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isPending || member.profile_id === selectedCampaign?.owner}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {sortedMembers.length === 0 && (
                <p className="text-sm text-slate-500">Invite teammates to collaborate on this campaign.</p>
              )}
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Track key places and see which records reference them.</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <form onSubmit={handleCreateLocation} className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-end">
              <Input
                value={locationDraft.name}
                onChange={(event) => setLocationDraft((draft) => ({ ...draft, name: event.target.value }))}
                placeholder="Location name"
                required
                disabled={!isManager || !selectedCampaignId}
              />
              <Input
                value={locationDraft.type}
                onChange={(event) => setLocationDraft((draft) => ({ ...draft, type: event.target.value }))}
                placeholder="Type (city, dungeon...)"
                disabled={!isManager || !selectedCampaignId}
              />
              <Input
                value={locationDraft.description}
                onChange={(event) => setLocationDraft((draft) => ({ ...draft, description: event.target.value }))}
                placeholder="Short description"
                disabled={!isManager || !selectedCampaignId}
              />
              <Button type="submit" disabled={!isManager || !selectedCampaignId || isPending}>
                {isPending ? "Saving..." : "Add location"}
              </Button>
            </form>
            <ul className="space-y-3">
              {locations.map((location) => {
                const count = locationCounts.get(location.id) ?? { npcs: 0, quests: 0, notes: 0 };
                return (
                  <li key={location.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{location.name}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {location.type ?? "Uncategorized"}
                        </p>
                        {location.description && (
                          <p className="text-sm text-slate-300">{location.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                          <span>{count.npcs} NPCs</span>
                          <span>{count.quests} quests</span>
                          <span>{count.notes} notes</span>
                        </div>
                      </div>
                      {isManager && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLocation(location)}
                            disabled={isPending}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLocation(location.id)}
                            disabled={isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
              {locations.length === 0 && (
                <p className="text-sm text-slate-500">Start mapping your world by adding the first location.</p>
              )}
            </ul>
          </div>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>NPCs</CardTitle>
            <CardDescription>Keep track of the personalities who drive your story.</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <form onSubmit={handleCreateNpc} className="space-y-3">
              <Input
                value={npcDraft.name}
                onChange={(event) => setNpcDraft((draft) => ({ ...draft, name: event.target.value }))}
                placeholder="NPC name"
                required
                disabled={!isManager || !selectedCampaignId}
              />
              <Textarea
                value={npcDraft.description}
                onChange={(event) => setNpcDraft((draft) => ({ ...draft, description: event.target.value }))}
                placeholder="Appearance, motivation, secrets..."
                disabled={!isManager || !selectedCampaignId}
              />
              <Textarea
                value={npcDraft.quirks}
                onChange={(event) => setNpcDraft((draft) => ({ ...draft, quirks: event.target.value }))}
                placeholder="Speech patterns, ticks, memorable traits"
                disabled={!isManager || !selectedCampaignId}
              />
              <select
                value={npcDraft.location_id}
                onChange={(event) => setNpcDraft((draft) => ({ ...draft, location_id: event.target.value }))}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                disabled={!selectedCampaignId}
              >
                <option value="">No location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={!isManager || !selectedCampaignId || isPending}>
                {isPending ? "Saving..." : "Add NPC"}
              </Button>
            </form>
            <ul className="space-y-3">
              {npcs.map((npc) => (
                <li key={npc.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div>
                        <h3 className="text-base font-semibold text-slate-100">{npc.name}</h3>
                        {npc.location_id && (
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            {locations.find((location) => location.id === npc.location_id)?.name ?? "Unknown location"}
                          </p>
                        )}
                      </div>
                      {npc.description && <p className="text-sm text-slate-300">{npc.description}</p>}
                      {npc.quirks && (
                        <p className="text-xs text-slate-400">Quirks: {npc.quirks}</p>
                      )}
                    </div>
                    {isManager && (
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => {
                            const description = window.prompt("Update description", npc.description ?? "") ?? npc.description ?? "";
                            const quirks = window.prompt("Update quirks", npc.quirks ?? "") ?? npc.quirks ?? "";
                            const locationId = window.prompt(
                              "Location ID (leave blank for none)",
                              npc.location_id ?? ""
                            ) ?? npc.location_id ?? "";
                            handleUpdateNpc(npc.id, {
                              description,
                              quirks,
                              location_id: locationId || null
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" type="button" onClick={() => handleDeleteNpc(npc.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {npcs.length === 0 && (
                <p className="text-sm text-slate-500">No NPCs yet. Drop in your key allies and villains.</p>
              )}
            </ul>
          </div>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Quest Log</CardTitle>
            <CardDescription>Organize plot threads and track their status.</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <form onSubmit={handleCreateQuest} className="space-y-3">
              <Input
                value={questDraft.title}
                onChange={(event) => setQuestDraft((draft) => ({ ...draft, title: event.target.value }))}
                placeholder="Quest title"
                required
                disabled={!isManager || !selectedCampaignId}
              />
              <Textarea
                value={questDraft.summary}
                onChange={(event) => setQuestDraft((draft) => ({ ...draft, summary: event.target.value }))}
                placeholder="Quest summary"
                disabled={!isManager || !selectedCampaignId}
              />
              <select
                value={questDraft.status}
                onChange={(event) => setQuestDraft((draft) => ({ ...draft, status: event.target.value as Quest["status"] }))}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                disabled={!isManager || !selectedCampaignId}
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={questDraft.location_id}
                onChange={(event) => setQuestDraft((draft) => ({ ...draft, location_id: event.target.value }))}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                disabled={!selectedCampaignId}
              >
                <option value="">No location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={!isManager || !selectedCampaignId || isPending}>
                {isPending ? "Saving..." : "Add quest"}
              </Button>
            </form>
            <ul className="space-y-3">
              {quests.map((quest) => (
                <li key={quest.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{quest.title}</h3>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{quest.status}</p>
                      {quest.location_id && (
                        <p className="text-xs text-slate-500">
                          {locations.find((location) => location.id === quest.location_id)?.name ?? "Unknown location"}
                        </p>
                      )}
                      {quest.summary && <p className="text-sm text-slate-300">{quest.summary}</p>}
                    </div>
                    {isManager && (
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => {
                            const status = window.prompt(
                              "Update quest status (planned, active, completed)",
                              quest.status
                            );
                            if (status && ["planned", "active", "completed"].includes(status)) {
                              handleUpdateQuest(quest.id, { status: status as Quest["status"] });
                            }
                          }}
                        >
                          Update status
                        </Button>
                        <Button variant="ghost" type="button" onClick={() => handleDeleteQuest(quest.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {quests.length === 0 && (
                <p className="text-sm text-slate-500">No quests logged. Document story arcs to stay on track.</p>
              )}
            </ul>
          </div>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Player Characters</CardTitle>
            <CardDescription>Maintain a quick reference for the party.</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <form onSubmit={handleCreatePc} className="grid gap-3 md:grid-cols-2">
              <Input
                value={pcDraft.name}
                onChange={(event) => setPcDraft((draft) => ({ ...draft, name: event.target.value }))}
                placeholder="Character name"
                required
                disabled={!isManager || !selectedCampaignId}
                className="md:col-span-2"
              />
              <Input
                value={pcDraft.class}
                onChange={(event) => setPcDraft((draft) => ({ ...draft, class: event.target.value }))}
                placeholder="Class"
                disabled={!isManager || !selectedCampaignId}
              />
              <Input
                value={pcDraft.race}
                onChange={(event) => setPcDraft((draft) => ({ ...draft, race: event.target.value }))}
                placeholder="Race"
                disabled={!isManager || !selectedCampaignId}
              />
              <Input
                type="number"
                value={pcDraft.level}
                onChange={(event) => setPcDraft((draft) => ({ ...draft, level: Number(event.target.value) }))}
                min={1}
                max={20}
                placeholder="Level"
                disabled={!isManager || !selectedCampaignId}
              />
              <Textarea
                value={pcDraft.statsText}
                onChange={(event) => setPcDraft((draft) => ({ ...draft, statsText: event.target.value }))}
                placeholder='Stats JSON (e.g. {"STR": 16})'
                className="md:col-span-2"
                disabled={!isManager || !selectedCampaignId}
              />
              <Button type="submit" disabled={!isManager || !selectedCampaignId || isPending} className="md:col-span-2">
                {isPending ? "Saving..." : "Add character"}
              </Button>
            </form>
            <ul className="space-y-3">
              {pcs.map((pc) => (
                <li key={pc.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-slate-100">{pc.name}</h3>
                      <p className="text-sm text-slate-300">
                        {pc.race ?? "Unknown"} {pc.class ?? "Adventurer"} · Level {pc.level ?? 1}
                      </p>
                      <pre className="whitespace-pre-wrap break-words text-xs text-slate-400">
                        {JSON.stringify(pc.stats ?? {}, null, 2)}
                      </pre>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => handleEditPc(pc)}
                        disabled={!isManager || isPending}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" type="button" disabled={!isManager || isPending} onClick={() => handleDeletePc(pc.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
              {pcs.length === 0 && (
                <p className="text-sm text-slate-500">No characters yet. Add PCs to keep quick stats on hand.</p>
              )}
            </ul>
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Encounters</CardTitle>
          <CardDescription>Pre-build battles, track initiative, and monitor monster health.</CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          <form onSubmit={handleCreateEncounter} className="grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] md:items-end">
            <Input
              value={encounterDraft.name}
              onChange={(event) => setEncounterDraft((draft) => ({ ...draft, name: event.target.value }))}
              placeholder="Encounter name"
              required
              disabled={!isManager || !selectedCampaignId}
            />
            <Input
              value={encounterDraft.summary}
              onChange={(event) => setEncounterDraft((draft) => ({ ...draft, summary: event.target.value }))}
              placeholder="Synopsis or objectives"
              disabled={!isManager || !selectedCampaignId}
            />
            <Button type="submit" disabled={!isManager || !selectedCampaignId || isPending}>
              {isPending ? "Saving..." : "Add encounter"}
            </Button>
          </form>
          <ul className="space-y-4">
            {encounters.map((encounter) => (
              <li key={encounter.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">{encounter.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {encounter.status} · Round {encounter.round ?? 1}
                      </p>
                    </div>
                    {encounter.summary && <p className="text-sm text-slate-300">{encounter.summary}</p>}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {encounter.started_at && <span>Started {new Date(encounter.started_at).toLocaleString()}</span>}
                      {encounter.ended_at && <span>Ended {new Date(encounter.ended_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  {isManager && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => handleUpdateEncounter(encounter.id, { status: "active", started_at: new Date().toISOString() })}
                      >
                        Start
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => handleUpdateEncounter(encounter.id, { status: "completed", ended_at: new Date().toISOString() })}
                      >
                        Complete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() =>
                          handleUpdateEncounter(encounter.id, {
                            round: Math.max(1, (encounter.round ?? 1) + 1)
                          })
                        }
                      >
                        Next round
                      </Button>
                      <Button variant="ghost" size="sm" type="button" onClick={() => handleDeleteEncounter(encounter.id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    {encounter.encounter_monsters.map((monster) => (
                      <div
                        key={monster.id}
                        className="flex flex-col gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{monster.name}</p>
                          <p className="text-xs text-slate-400">
                            HP {monster.current_hp} / {monster.max_hp} · AC {monster.armor_class}
                          </p>
                          {monster.initiative !== null && (
                            <p className="text-xs text-slate-500">Initiative {monster.initiative}</p>
                          )}
                        </div>
                        {isManager && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              type="button"
                              onClick={() => handleAdjustMonsterHp(encounter.id, monster, -1)}
                            >
                              -1 HP
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              type="button"
                              onClick={() => handleAdjustMonsterHp(encounter.id, monster, 1)}
                            >
                              +1 HP
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() =>
                                handleUpdateMonster(encounter.id, monster.id, {
                                  current_hp: monster.max_hp
                                })
                              }
                            >
                              Reset HP
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => {
                                const name = window.prompt("Monster name", monster.name) ?? monster.name;
                                const maxHpInput = window.prompt("Max HP", String(monster.max_hp)) ?? String(monster.max_hp);
                                const armorClassInput = window.prompt("Armor class", String(monster.armor_class)) ?? String(monster.armor_class);
                                const initiativeInput = window.prompt("Initiative", monster.initiative?.toString() ?? "") ?? monster.initiative?.toString() ?? "";
                                const payload: Partial<EncounterMonster> = {};
                                payload.name = name;
                                const maxHp = Number.parseInt(maxHpInput, 10);
                                const armorClass = Number.parseInt(armorClassInput, 10);
                                if (!Number.isNaN(maxHp)) payload.max_hp = maxHp;
                                if (!Number.isNaN(armorClass)) payload.armor_class = armorClass;
                                if (initiativeInput.trim() !== "") {
                                  const initiative = Number.parseInt(initiativeInput, 10);
                                  if (!Number.isNaN(initiative)) payload.initiative = initiative;
                                } else {
                                  payload.initiative = null;
                                }
                                handleUpdateMonster(encounter.id, monster.id, payload);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => handleDeleteMonster(encounter.id, monster.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {encounter.encounter_monsters.length === 0 && (
                      <p className="text-sm text-slate-500">No monsters yet. Add combatants below.</p>
                    )}
                  </div>

                  {isManager && (
                    <div className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Add monster
                      </p>
                      <div className="grid gap-2 md:grid-cols-[2fr_repeat(3,minmax(0,1fr))_auto] md:items-end">
                        <Input
                          value={encounterMonsterDraft(encounter.id).name}
                          onChange={(event) =>
                            handleMonsterDraftChange(encounter.id, "name", event.target.value)
                          }
                          placeholder="Name"
                          required
                        />
                        <Input
                          type="number"
                          min={0}
                          value={encounterMonsterDraft(encounter.id).max_hp}
                          onChange={(event) =>
                            handleMonsterDraftChange(encounter.id, "max_hp", event.target.value)
                          }
                          placeholder="HP"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={encounterMonsterDraft(encounter.id).armor_class}
                          onChange={(event) =>
                            handleMonsterDraftChange(encounter.id, "armor_class", event.target.value)
                          }
                          placeholder="AC"
                        />
                        <Input
                          type="number"
                          value={encounterMonsterDraft(encounter.id).initiative}
                          onChange={(event) =>
                            handleMonsterDraftChange(encounter.id, "initiative", event.target.value)
                          }
                          placeholder="Initiative"
                        />
                        <Button type="button" onClick={() => handleAddMonster(encounter.id)} disabled={isPending}>
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
            {encounters.length === 0 && (
              <p className="text-sm text-slate-500">No encounters prepared. Build combat ahead of the session.</p>
            )}
          </ul>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Notes</CardTitle>
          <CardDescription>Capture session summaries, loot drops, and follow-ups.</CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          <form onSubmit={handleCreateNote} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px] md:items-start">
            <Textarea
              value={noteDraft.content}
              onChange={(event) => setNoteDraft((draft) => ({ ...draft, content: event.target.value }))}
              placeholder="Session recap, NPC beats, loot drops..."
              className="md:col-span-1"
              required
              disabled={!isManager || !selectedCampaignId}
            />
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-slate-300">
                Session date
                <Input
                  type="date"
                  value={noteDraft.session_date}
                  onChange={(event) => setNoteDraft((draft) => ({ ...draft, session_date: event.target.value }))}
                  disabled={!isManager || !selectedCampaignId}
                />
              </label>
              <select
                value={noteDraft.location_id}
                onChange={(event) => setNoteDraft((draft) => ({ ...draft, location_id: event.target.value }))}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                disabled={!selectedCampaignId}
              >
                <option value="">No location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={!isManager || !selectedCampaignId || isPending}>
              {isPending ? "Saving..." : "Add note"}
            </Button>
          </form>
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      {note.session_date && (
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Session {new Date(note.session_date).toLocaleDateString()}
                        </p>
                      )}
                      {note.location_id && (
                        <p className="text-xs text-slate-500">
                          {locations.find((location) => location.id === note.location_id)?.name ?? "Unknown location"}
                        </p>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-200">{note.content}</p>
                  </div>
                  {isManager && (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          const content = window.prompt("Edit note", note.content) ?? note.content;
                          if (content && content !== note.content) {
                            handleUpdateNote(note.id, { content });
                          }
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" type="button" onClick={() => handleDeleteNote(note.id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
            {notes.length === 0 && (
              <p className="text-sm text-slate-500">No notes yet. Capture your first session recap.</p>
            )}
          </ul>
        </div>
      </Card>
    </div>
  );
}
