import type { FormEvent } from "react";

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

export type CampaignWithRole = Campaign & {
  membership_role: CampaignMember["role"];
};

export type CampaignMemberWithProfile = CampaignMember & {
  profile: Pick<Profile, "id" | "display_name" | "email"> | null;
};

export type EncounterWithMonsters = Encounter & {
  encounter_monsters: EncounterMonster[];
};

export interface DashboardShellProps {
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

export interface CampaignResourceGridProps {
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

export interface NotesSectionProps {
  campaignId: string;
  canManage: boolean;
  notes: Note[];
  locations: Location[];
  locationLookup: Map<string, string>;
  onMutated: () => void;
}

export interface PlayerCharactersSectionProps {
  campaignId: string;
  canManage: boolean;
  pcs: Pc[];
  onMutated: () => void;
}

export interface NpcsSectionProps {
  campaignId: string;
  canManage: boolean;
  npcs: Npc[];
  locations: Location[];
  locationLookup: Map<string, string>;
  onMutated: () => void;
}

export interface LocationsSectionProps {
  campaignId: string;
  canManage: boolean;
  locations: Location[];
  onMutated: () => void;
}

export interface QuestsSectionProps {
  campaignId: string;
  canManage: boolean;
  quests: Quest[];
  locations: Location[];
  locationLookup: Map<string, string>;
  onMutated: () => void;
}

export interface EncountersSectionProps {
  campaignId: string;
  canManage: boolean;
  encounters: EncounterWithMonsters[];
  onMutated: () => void;
}

export interface CampaignCreateCardProps {
  isOpen: boolean;
  hasCampaigns: boolean;
  name: string;
  onNameChange: (value: string) => void;
  onToggle: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  error: string | null;
}

export interface StatCardProps {
  label: string;
  value: number;
  description: string;
}

export interface QuickFactCardProps {
  label: string;
  value: number;
}

export interface EmptyStateMessageProps {
  message: string;
}
