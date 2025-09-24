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

export interface CampaignWithRole extends Campaign {
  membership_role: CampaignMember["role"];
}

export interface CampaignMemberWithProfile extends CampaignMember {
  profile: Pick<Profile, "id" | "display_name" | "email"> | null;
}

export interface EncounterWithMonsters extends Encounter {
  encounter_monsters: EncounterMonster[];
}

export interface DashboardResources {
  members: CampaignMemberWithProfile[];
  locations: Location[];
  npcs: Npc[];
  quests: Quest[];
  notes: Note[];
  pcs: Pc[];
  encounters: EncounterWithMonsters[];
}

export function createEmptyDashboardResources(): DashboardResources {
  return {
    members: [],
    locations: [],
    npcs: [],
    quests: [],
    notes: [],
    pcs: [],
    encounters: []
  };
}
