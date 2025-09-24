import type {
  Campaign,
  CampaignMember,
  Encounter,
  EncounterMonster,
  Profile
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
