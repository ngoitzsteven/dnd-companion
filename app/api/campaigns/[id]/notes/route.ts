import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { assertCampaignAccess, assertCampaignManager } from "@/lib/campaigns";

const noteSchema = z.object({
  content: z.string().min(1),
  session_date: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: "Invalid date"
    }),
  location_id: z.string().uuid().optional().nullable()
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { supabase, user } = auth;
  const allowed = await assertCampaignAccess(supabase, params.id, user.id);

  if (!allowed) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("notes")
    .select("*", { count: 'exact' })
    .eq("campaign_id", params.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      limit,
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    }
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await request.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid note payload" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const manager = await assertCampaignManager(supabase, params.id, user.id);

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.location_id) {
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id")
      .eq("id", parsed.data.location_id)
      .eq("campaign_id", params.id)
      .maybeSingle();

    if (locationError || !location) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      campaign_id: params.id,
      content: parsed.data.content,
      session_date: parsed.data.session_date?.trim() ? parsed.data.session_date : null,
      location_id: parsed.data.location_id ?? null
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create note" }, { status: 500 });
  }

  return NextResponse.json(data);
}