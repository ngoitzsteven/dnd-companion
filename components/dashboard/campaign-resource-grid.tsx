"use client";

import type { Location, Note, Npc, Pc, Quest } from "@/types/database";

import type { EncounterWithMonsters } from "@/lib/dashboard/types";
import { EncountersSection } from "./sections/encounters-section";
import { LocationsSection } from "./sections/locations-section";
import { NpcsSection } from "./sections/npcs-section";
import { PlayerCharactersSection } from "./sections/player-characters-section";
import { QuestsSection } from "./sections/quests-section";
import { SessionTracker } from "./sections/session-tracker";

interface CampaignResourceGridProps {
  campaignId: string;
  canManage: boolean;
  notes: Note[];
  pcs: Pc[];
  npcs: Npc[];
  quests: Quest[];
  locations: Location[];
  encounters: EncounterWithMonsters[];
  onMutated: () => void;
}

export function CampaignResourceGrid({
  campaignId,
  canManage,
  notes,
  pcs,
  npcs,
  quests,
  locations,
  encounters,
  onMutated
}: CampaignResourceGridProps) {
  const locationLookup = new Map(locations.map((location) => [location.id, location.name] as const));

  return (
    <div className="space-y-8">
      <SessionTracker
        campaignId={campaignId}
        canManage={canManage}
        notes={notes}
        locations={locations}
        locationLookup={locationLookup}
        onMutated={onMutated}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <PlayerCharactersSection campaignId={campaignId} canManage={canManage} pcs={pcs} onMutated={onMutated} />
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
        <LocationsSection campaignId={campaignId} canManage={canManage} locations={locations} onMutated={onMutated} />
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
