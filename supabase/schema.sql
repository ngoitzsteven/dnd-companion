-- Enable required extensions
create extension if not exists "pgcrypto" with schema public;
create extension if not exists "citext" with schema public;

-- Profiles table mirrors auth.users for additional metadata
create table if not exists public.profiles (
    id uuid primary key references auth.users on delete cascade,
    display_name text,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    email citext
);

alter table public.profiles
    add column if not exists email citext;

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
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = campaigns.id
              and cm.profile_id = auth.uid()
              and cm.status = 'active'
        )
    );

create policy "Authenticated can create campaign" on public.campaigns
    for insert with check (auth.uid() = owner);

create policy "Managers can update campaign" on public.campaigns
    for update using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = campaigns.id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    )
    with check (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = campaigns.id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    );

create policy "Owner can delete campaign" on public.campaigns
    for delete using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = campaigns.id
              and cm.profile_id = auth.uid()
              and cm.role = 'owner'
              and cm.status = 'active'
        )
    );

-- Campaign member policies
create policy "Members can read members" on public.campaign_members
    for select using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = campaign_members.campaign_id
              and cm.profile_id = auth.uid()
              and cm.status = 'active'
        )
    );

create policy "Managers can invite members" on public.campaign_members
    for insert with check (
        (
            exists (
                select 1
                from public.campaigns c
                where c.id = campaign_members.campaign_id
                  and c.owner = auth.uid()
            )
        )
        or (
            exists (
                select 1
                from public.campaign_members cm
                where cm.campaign_id = campaign_members.campaign_id
                  and cm.profile_id = auth.uid()
                  and cm.role in ('owner', 'co_dm')
                  and cm.status = 'active'
            )
        )
    );

create policy "Managers can update members" on public.campaign_members
    for update using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = campaign_members.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    )
    with check (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = campaign_members.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    );

create policy "Managers can remove members" on public.campaign_members
    for delete using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = campaign_members.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    );

-- Shared helper predicate as subquery for membership
create policy "Members can manage locations" on public.locations
    for all using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = locations.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    )
    with check (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = locations.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    );

create policy "Members can view locations" on public.locations
    for select using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = locations.campaign_id
              and cm.profile_id = auth.uid()
              and cm.status = 'active'
        )
    );

-- NPC policies: only through memberships
create policy "Members can view NPCs" on public.npcs
    for select using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = npcs.campaign_id
              and cm.profile_id = auth.uid()
              and cm.status = 'active'
        )
    );

create policy "Managers can manage NPCs" on public.npcs
    for all using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = npcs.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    )
    with check (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = npcs.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    );

-- Quest policies: only through memberships
create policy "Members can view quests" on public.quests
    for select using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = quests.campaign_id
              and cm.profile_id = auth.uid()
              and cm.status = 'active'
        )
    );

create policy "Managers can manage quests" on public.quests
    for all using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = quests.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    )
    with check (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = quests.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    );

-- Notes policies: only through memberships
create policy "Members can view notes" on public.notes
    for select using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = notes.campaign_id
              and cm.profile_id = auth.uid()
              and cm.status = 'active'
        )
    );

create policy "Managers can manage notes" on public.notes
    for all using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = notes.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    )
    with check (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = notes.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    );

-- PC policies: members can view, creators and managers can modify
create policy "Members can view PCs" on public.pcs
    for select using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = pcs.campaign_id
              and cm.profile_id = auth.uid()
              and cm.status = 'active'
        )
    );

create policy "Members can insert PCs" on public.pcs
    for insert with check (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = pcs.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
        and created_by = auth.uid()
    );

create policy "Owners or creators can update PCs" on public.pcs
    for update using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = pcs.campaign_id
              and cm.profile_id = auth.uid()
              and (
                cm.role in ('owner', 'co_dm')
                or pcs.created_by = auth.uid()
              )
              and cm.status = 'active'
        )
    )
    with check (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = pcs.campaign_id
              and cm.profile_id = auth.uid()
              and (
                cm.role in ('owner', 'co_dm')
                or pcs.created_by = auth.uid()
              )
              and cm.status = 'active'
        )
    );

create policy "Managers can delete PCs" on public.pcs
    for delete using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = pcs.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    );

-- Encounter policies
create policy "Members can view encounters" on public.encounters
    for select using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = encounters.campaign_id
              and cm.profile_id = auth.uid()
              and cm.status = 'active'
        )
    );

create policy "Managers can manage encounters" on public.encounters
    for all using (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = encounters.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    )
    with check (
        exists (
            select 1
            from public.campaign_members cm
            where cm.campaign_id = encounters.campaign_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    );

create policy "Members can view encounter monsters" on public.encounter_monsters
    for select using (
        exists (
            select 1
            from public.encounters e
            join public.campaign_members cm on cm.campaign_id = e.campaign_id
            where e.id = encounter_monsters.encounter_id
              and cm.profile_id = auth.uid()
              and cm.status = 'active'
        )
    );

create policy "Managers can manage encounter monsters" on public.encounter_monsters
    for all using (
        exists (
            select 1
            from public.encounters e
            join public.campaign_members cm on cm.campaign_id = e.campaign_id
            where e.id = encounter_monsters.encounter_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    )
    with check (
        exists (
            select 1
            from public.encounters e
            join public.campaign_members cm on cm.campaign_id = e.campaign_id
            where e.id = encounter_monsters.encounter_id
              and cm.profile_id = auth.uid()
              and cm.role in ('owner', 'co_dm')
              and cm.status = 'active'
        )
    );

-- Waitlist table can be inserted by anonymous website visitors
create policy "Everyone can insert waitlist" on public.waitlist_emails
    for insert
    with check (true);

create policy "Admins can read waitlist" on public.waitlist_emails
    for select using (auth.role() = 'authenticated');
