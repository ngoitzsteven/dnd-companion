-- Ensure the public schema exists for legacy tables and policies
create schema if not exists public;
-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";
-- Profiles table mirrors auth.users for additional metadata
create table if not exists public.profiles (
    id uuid primary key references auth.users on delete cascade,
    display_name text,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    email citext
);
create unique index if not exists profiles_email_unique
    on public.profiles (email);
-- Campaigns owned by a specific user
create table if not exists public.campaigns (
    id uuid primary key default gen_random_uuid(),
    owner uuid not null references public.profiles (id) on delete cascade,
    name text not null,
    created_at timestamptz default timezone('utc'::text, now()) not null
);
-- Campaign collaboration roles and membership
do $$
begin
    if not exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where t.typname = 'campaign_role'
          and n.nspname = 'public'
    ) then
        create type public.campaign_role as enum ('owner', 'co_dm', 'player');
    end if;
end
$$;
do $$
begin
    if not exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where t.typname = 'campaign_member_status'
          and n.nspname = 'public'
    ) then
        create type public.campaign_member_status as enum ('invited', 'active');
    end if;
end
$$;
create table if not exists public.campaign_members (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.campaigns (id) on delete cascade,
    profile_id uuid not null references public.profiles (id) on delete cascade,
    role public.campaign_role not null default 'player',
    status public.campaign_member_status not null default 'active',
    created_at timestamptz default timezone('utc'::text, now()) not null,
    invited_by uuid references public.profiles (id) on delete set null
);
create unique index if not exists campaign_members_unique_member
    on public.campaign_members (campaign_id, profile_id);
create unique index if not exists campaign_members_single_owner
    on public.campaign_members (campaign_id)
    where role = 'owner';
-- Helper functions for membership checks to avoid recursive RLS lookups
create or replace function public.is_campaign_member(target_campaign_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.campaign_members
    where campaign_id = target_campaign_id
      and profile_id = auth.uid()
      and status = 'active'
  )
  or exists (
    select 1
    from public.campaigns c
    where c.id = target_campaign_id
      and c.owner = auth.uid()
  );
$$;
create or replace function public.is_campaign_manager(target_campaign_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.campaign_members
    where campaign_id = target_campaign_id
      and profile_id = auth.uid()
      and role in ('owner', 'co_dm')
      and status = 'active'
  )
  or exists (
    select 1
    from public.campaigns c
    where c.id = target_campaign_id
      and c.owner = auth.uid()
  );
$$;
create or replace function public.is_campaign_owner(target_campaign_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.campaign_members
    where campaign_id = target_campaign_id
      and profile_id = auth.uid()
      and role = 'owner'
      and status = 'active'
  )
  or exists (
    select 1
    from public.campaigns c
    where c.id = target_campaign_id
      and c.owner = auth.uid()
  );
$$;
-- Locations within a campaign
create table if not exists public.locations (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.campaigns (id) on delete cascade,
    name text not null,
    description text,
    type text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);
-- NPC records scoped to a campaign
create table if not exists public.npcs (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.campaigns (id) on delete cascade,
    location_id uuid references public.locations (id) on delete set null,
    name text not null,
    description text,
    quirks text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);
alter table public.npcs
    add column if not exists location_id uuid references public.locations (id) on delete set null;
-- Quest board entries scoped to a campaign
do $$
begin
    if not exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where t.typname = 'quest_status'
          and n.nspname = 'public'
    ) then
        create type public.quest_status as enum ('planned', 'active', 'completed');
    end if;
end
$$;
create table if not exists public.quests (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.campaigns (id) on delete cascade,
    location_id uuid references public.locations (id) on delete set null,
    title text not null,
    summary text,
    status public.quest_status default 'planned'::public.quest_status not null,
    created_at timestamptz default timezone('utc'::text, now()) not null
);
alter table public.quests
    add column if not exists location_id uuid references public.locations (id) on delete set null;
-- Session notes captured per campaign
create table if not exists public.notes (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.campaigns (id) on delete cascade,
    location_id uuid references public.locations (id) on delete set null,
    content text not null,
    session_date date,
    created_at timestamptz default timezone('utc'::text, now()) not null
);
alter table public.notes
    add column if not exists location_id uuid references public.locations (id) on delete set null;
-- Player characters
create table if not exists public.pcs (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.campaigns (id) on delete cascade,
    created_by uuid not null references public.profiles (id) on delete set null,
    name text not null,
    class text,
    race text,
    level integer default 1,
    stats jsonb not null default '{}'::jsonb,
    created_at timestamptz default timezone('utc'::text, now()) not null
);
do $$
begin
    if not exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where t.typname = 'encounter_status'
          and n.nspname = 'public'
    ) then
        create type public.encounter_status as enum ('draft', 'active', 'completed');
    end if;
end
$$;
-- Encounters and combat tracking
create table if not exists public.encounters (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.campaigns (id) on delete cascade,
    name text not null,
    summary text,
    status public.encounter_status not null default 'draft',
    round integer default 1,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    started_at timestamptz,
    ended_at timestamptz
);
create table if not exists public.encounter_monsters (
    id uuid primary key default gen_random_uuid(),
    encounter_id uuid not null references public.encounters (id) on delete cascade,
    name text not null,
    max_hp integer not null,
    current_hp integer not null,
    armor_class integer not null,
    initiative integer,
    created_at timestamptz default timezone('utc'::text, now()) not null
);
-- Marketing waitlist emails
create table if not exists public.waitlist_emails (
    id uuid primary key default gen_random_uuid(),
    email citext not null unique,
    created_at timestamptz default timezone('utc'::text, now()) not null
);
-- Ensure RLS is active for all user data tables
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.locations enable row level security;
alter table public.npcs enable row level security;
alter table public.quests enable row level security;
alter table public.notes enable row level security;
alter table public.pcs enable row level security;
alter table public.encounters enable row level security;
alter table public.encounter_monsters enable row level security;
alter table public.waitlist_emails enable row level security;
-- Ensure updated_at columns for auditing
alter table public.profiles
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
alter table public.campaigns
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
alter table public.campaign_members
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
alter table public.locations
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
alter table public.npcs
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
alter table public.quests
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
alter table public.notes
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
alter table public.pcs
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
alter table public.encounters
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
alter table public.encounter_monsters
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
alter table public.waitlist_emails
    add column if not exists updated_at timestamptz default timezone('utc'::text, now()) not null;
-- Keep updated_at columns in sync on modification
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_public_profiles_updated_at') then
    create trigger set_public_profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_public_campaigns_updated_at') then
    create trigger set_public_campaigns_updated_at
    before update on public.campaigns
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_public_campaign_members_updated_at') then
    create trigger set_public_campaign_members_updated_at
    before update on public.campaign_members
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_public_locations_updated_at') then
    create trigger set_public_locations_updated_at
    before update on public.locations
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_public_npcs_updated_at') then
    create trigger set_public_npcs_updated_at
    before update on public.npcs
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_public_quests_updated_at') then
    create trigger set_public_quests_updated_at
    before update on public.quests
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_public_notes_updated_at') then
    create trigger set_public_notes_updated_at
    before update on public.notes
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_public_pcs_updated_at') then
    create trigger set_public_pcs_updated_at
    before update on public.pcs
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_public_encounters_updated_at') then
    create trigger set_public_encounters_updated_at
    before update on public.encounters
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_public_encounter_monsters_updated_at') then
    create trigger set_public_encounter_monsters_updated_at
    before update on public.encounter_monsters
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_public_waitlist_emails_updated_at') then
    create trigger set_public_waitlist_emails_updated_at
    before update on public.waitlist_emails
    for each row
    execute function public.touch_updated_at();
  end if;
end
$$;
-- Base grants so authenticated users can access RLS-protected tables
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage on sequences to authenticated;
grant insert on public.waitlist_emails to anon;

-- Performance indexes for common lookups
create index if not exists campaign_members_profile_status_idx
    on public.campaign_members (profile_id, status);
create index if not exists campaign_members_campaign_created_idx
    on public.campaign_members (campaign_id, created_at);
create index if not exists locations_campaign_created_idx
    on public.locations (campaign_id, created_at);
create index if not exists npcs_campaign_created_idx
    on public.npcs (campaign_id, created_at);
create index if not exists quests_campaign_status_created_idx
    on public.quests (campaign_id, status, created_at);
create index if not exists notes_campaign_created_idx
    on public.notes (campaign_id, created_at);
create index if not exists pcs_campaign_created_idx
    on public.pcs (campaign_id, created_at);
create index if not exists encounters_campaign_status_created_idx
    on public.encounters (campaign_id, status, created_at);
create index if not exists encounter_monsters_encounter_idx
    on public.encounter_monsters (encounter_id);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pcs_level_bounds') then
    alter table public.pcs
      add constraint pcs_level_bounds check (level between 1 and 20);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'encounters_round_positive') then
    alter table public.encounters
      add constraint encounters_round_positive check (round >= 1);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'encounter_monsters_hp_check') then
    alter table public.encounter_monsters
      add constraint encounter_monsters_hp_check check (max_hp > 0 and current_hp >= 0 and current_hp <= max_hp);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'encounter_monsters_ac_positive') then
    alter table public.encounter_monsters
      add constraint encounter_monsters_ac_positive check (armor_class > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'campaigns_name_not_blank') then
    alter table public.campaigns
      add constraint campaigns_name_not_blank check (length(btrim(name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'locations_name_not_blank') then
    alter table public.locations
      add constraint locations_name_not_blank check (length(btrim(name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'npcs_name_not_blank') then
    alter table public.npcs
      add constraint npcs_name_not_blank check (length(btrim(name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'quests_title_not_blank') then
    alter table public.quests
      add constraint quests_title_not_blank check (length(btrim(title)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'pcs_name_not_blank') then
    alter table public.pcs
      add constraint pcs_name_not_blank check (length(btrim(name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'encounters_name_not_blank') then
    alter table public.encounters
      add constraint encounters_name_not_blank check (length(btrim(name)) > 0);
  end if;
end
$$;

-- Profiles policies: user can see and manage their own profile
create policy "Users can view their profile" on public.profiles
    for select using (auth.uid() = id);
create policy "Users can update their profile" on public.profiles
    for update using (auth.uid() = id)
    with check (auth.uid() = id);
create policy "Insert profile for self" on public.profiles
    for insert with check (auth.uid() = id);
-- Campaign policies tied to membership
create policy "Members can view campaign" on public.campaigns
    for select using (
        public.is_campaign_member(campaigns.id)
        or campaigns.owner = auth.uid()
    );
create policy "Authenticated can create campaign" on public.campaigns
    for insert with check (auth.uid() = owner);
create policy "Managers can update campaign" on public.campaigns
    for update using (public.is_campaign_manager(campaigns.id))
    with check (public.is_campaign_manager(campaigns.id));
create policy "Owner can delete campaign" on public.campaigns
    for delete using (public.is_campaign_owner(campaigns.id));
-- Campaign member policies
create policy "Users can view their membership row" on public.campaign_members
    for select using (campaign_members.profile_id = auth.uid());
create policy "Members can read members" on public.campaign_members
    for select using (public.is_campaign_member(campaign_members.campaign_id));
create policy "Managers can invite members" on public.campaign_members
    for insert with check ((
        exists (
            select 1
            from public.campaigns c
            where c.id = campaign_members.campaign_id
              and c.owner = auth.uid()
        )
    ) or public.is_campaign_manager(campaign_members.campaign_id));
create policy "Managers can update members" on public.campaign_members
    for update using (public.is_campaign_manager(campaign_members.campaign_id))
    with check (public.is_campaign_manager(campaign_members.campaign_id));
create policy "Managers can remove members" on public.campaign_members
    for delete using (public.is_campaign_manager(campaign_members.campaign_id));
-- Shared helper predicate as subquery for membership
create policy "Members can manage locations" on public.locations
    for all using (public.is_campaign_manager(locations.campaign_id))
    with check (public.is_campaign_manager(locations.campaign_id));
create policy "Members can view locations" on public.locations
    for select using (public.is_campaign_member(locations.campaign_id));
-- NPC policies: only through memberships
create policy "Members can view NPCs" on public.npcs
    for select using (public.is_campaign_member(npcs.campaign_id));
create policy "Managers can manage NPCs" on public.npcs
    for all using (public.is_campaign_manager(npcs.campaign_id))
    with check (public.is_campaign_manager(npcs.campaign_id));
-- Quest policies: only through memberships
create policy "Members can view quests" on public.quests
    for select using (public.is_campaign_member(quests.campaign_id));
create policy "Managers can manage quests" on public.quests
    for all using (public.is_campaign_manager(quests.campaign_id))
    with check (public.is_campaign_manager(quests.campaign_id));
-- Notes policies: only through memberships
create policy "Members can view notes" on public.notes
    for select using (public.is_campaign_member(notes.campaign_id));
create policy "Managers can manage notes" on public.notes
    for all using (public.is_campaign_manager(notes.campaign_id))
    with check (public.is_campaign_manager(notes.campaign_id));
-- PC policies: members can view, creators and managers can modify
create policy "Members can view PCs" on public.pcs
    for select using (public.is_campaign_member(pcs.campaign_id));
create policy "Members can insert PCs" on public.pcs
    for insert with check (
        public.is_campaign_manager(pcs.campaign_id)
        and created_by = auth.uid()
    );
create policy "Owners or creators can update PCs" on public.pcs
    for update using (
        public.is_campaign_manager(pcs.campaign_id)
        or (
            pcs.created_by = auth.uid()
            and public.is_campaign_member(pcs.campaign_id)
        )
    )
    with check (
        public.is_campaign_manager(pcs.campaign_id)
        or (
            pcs.created_by = auth.uid()
            and public.is_campaign_member(pcs.campaign_id)
        )
    );
create policy "Managers can delete PCs" on public.pcs
    for delete using (public.is_campaign_manager(pcs.campaign_id));
-- Encounter policies
create policy "Members can view encounters" on public.encounters
    for select using (public.is_campaign_member(encounters.campaign_id));
create policy "Managers can manage encounters" on public.encounters
    for all using (public.is_campaign_manager(encounters.campaign_id))
    with check (public.is_campaign_manager(encounters.campaign_id));
create policy "Members can view encounter monsters" on public.encounter_monsters
    for select using (
        exists (
            select 1
            from public.encounters e
            where e.id = encounter_monsters.encounter_id
              and public.is_campaign_member(e.campaign_id)
        )
    );
create policy "Managers can manage encounter monsters" on public.encounter_monsters
    for all using (
        exists (
            select 1
            from public.encounters e
            where e.id = encounter_monsters.encounter_id
              and public.is_campaign_manager(e.campaign_id)
        )
    )
    with check (
        exists (
            select 1
            from public.encounters e
            where e.id = encounter_monsters.encounter_id
              and public.is_campaign_manager(e.campaign_id)
        )
    );
-- Waitlist table can be inserted by anonymous website visitors
create policy "Everyone can insert waitlist" on public.waitlist_emails
    for insert
    with check (true);
create policy "Admins can read waitlist" on public.waitlist_emails
    for select using (auth.role() = 'authenticated');
