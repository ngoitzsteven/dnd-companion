import { cookies } from "next/headers";
import {
  createRouteHandlerClient,
  createServerComponentClient
} from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/database";

export const getServerSupabaseClient = () => {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({
    cookies: () => cookieStore
  });
};

export const getRouteHandlerSupabaseClient = () => {
  const cookieStore = cookies();
  return createRouteHandlerClient<Database>({
    cookies: () => cookieStore
  });
};
