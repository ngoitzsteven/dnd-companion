import { cookies } from "next/headers";

import {

  createRouteHandlerClient,

  createServerComponentClient

} from "@supabase/auth-helpers-nextjs";



import type { Database } from "@/types/database";



export const getServerSupabaseClient = async () => {
  const cookieStore = await cookies();

  return createServerComponentClient<Database>({

    cookies: () => cookieStore

  });

};



export const getRouteHandlerSupabaseClient = async () => {
  const cookieStore = await cookies();

  return createRouteHandlerClient<Database>({

    cookies: () => cookieStore

  });

};


