export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_owner_fkey";
            columns: ["owner"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      campaign_members: {
        Row: {
          campaign_id: string;
          created_at: string;
          id: string;
          invited_by: string | null;
          profile_id: string;
          role: Database["public"]["Enums"]["campaign_role"];
          status: Database["public"]["Enums"]["campaign_member_status"];
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          profile_id: string;
          role?: Database["public"]["Enums"]["campaign_role"];
          status?: Database["public"]["Enums"]["campaign_member_status"];
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          profile_id?: string;
          role?: Database["public"]["Enums"]["campaign_role"];
          status?: Database["public"]["Enums"]["campaign_member_status"];
        };
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey";
            columns: ["campaign_id"];
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_members_invited_by_fkey";
            columns: ["invited_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_members_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      locations: {
        Row: {
          campaign_id: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          type: string | null;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          type?: string | null;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_campaign_id_fkey";
            columns: ["campaign_id"];
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
      npcs: {
        Row: {
          campaign_id: string;
          created_at: string;
          description: string | null;
          id: string;
          location_id: string | null;
          name: string;
          quirks: string | null;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          location_id?: string | null;
          name: string;
          quirks?: string | null;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          location_id?: string | null;
          name?: string;
          quirks?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "npcs_campaign_id_fkey";
            columns: ["campaign_id"];
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "npcs_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      quests: {
        Row: {
          campaign_id: string;
          created_at: string;
          id: string;
          location_id: string | null;
          status: Database["public"]["Enums"]["quest_status"];
          summary: string | null;
          title: string;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          id?: string;
          location_id?: string | null;
          status?: Database["public"]["Enums"]["quest_status"];
          summary?: string | null;
          title: string;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          id?: string;
          location_id?: string | null;
          status?: Database["public"]["Enums"]["quest_status"];
          summary?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quests_campaign_id_fkey";
            columns: ["campaign_id"];
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quests_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      notes: {
        Row: {
          campaign_id: string;
          content: string;
          created_at: string;
          id: string;
          location_id: string | null;
          session_date: string | null;
        };
        Insert: {
          campaign_id: string;
          content: string;
          created_at?: string;
          id?: string;
          location_id?: string | null;
          session_date?: string | null;
        };
        Update: {
          campaign_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          location_id?: string | null;
          session_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notes_campaign_id_fkey";
            columns: ["campaign_id"];
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      pcs: {
        Row: {
          campaign_id: string;
          created_at: string;
          created_by: string;
          id: string;
          level: number | null;
          name: string;
          race: string | null;
          class: string | null;
          stats: Json;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          level?: number | null;
          name: string;
          race?: string | null;
          class?: string | null;
          stats?: Json;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          level?: number | null;
          name?: string;
          race?: string | null;
          class?: string | null;
          stats?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "pcs_campaign_id_fkey";
            columns: ["campaign_id"];
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pcs_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      encounters: {
        Row: {
          campaign_id: string;
          created_at: string;
          ended_at: string | null;
          id: string;
          name: string;
          round: number | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["encounter_status"];
          summary: string | null;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          name: string;
          round?: number | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["encounter_status"];
          summary?: string | null;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          name?: string;
          round?: number | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["encounter_status"];
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "encounters_campaign_id_fkey";
            columns: ["campaign_id"];
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
      encounter_monsters: {
        Row: {
          armor_class: number;
          created_at: string;
          current_hp: number;
          encounter_id: string;
          id: string;
          initiative: number | null;
          max_hp: number;
          name: string;
        };
        Insert: {
          armor_class: number;
          created_at?: string;
          current_hp: number;
          encounter_id: string;
          id?: string;
          initiative?: number | null;
          max_hp: number;
          name: string;
        };
        Update: {
          armor_class?: number;
          created_at?: string;
          current_hp?: number;
          encounter_id?: string;
          id?: string;
          initiative?: number | null;
          max_hp?: number;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "encounter_monsters_encounter_id_fkey";
            columns: ["encounter_id"];
            referencedRelation: "encounters";
            referencedColumns: ["id"];
          }
        ];
      };
      waitlist_emails: {
        Row: {
          created_at: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      campaign_member_status: "invited" | "active";
      campaign_role: "owner" | "co_dm" | "player";
      encounter_status: "draft" | "active" | "completed";
      quest_status: "planned" | "active" | "completed";
    };
    CompositeTypes: {};
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignMember = Database["public"]["Tables"]["campaign_members"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Npc = Database["public"]["Tables"]["npcs"]["Row"];
export type Quest = Database["public"]["Tables"]["quests"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type Pc = Database["public"]["Tables"]["pcs"]["Row"];
export type Encounter = Database["public"]["Tables"]["encounters"]["Row"];
export type EncounterMonster = Database["public"]["Tables"]["encounter_monsters"]["Row"];
