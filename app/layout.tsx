import "./globals.css";



import type { Metadata } from "next";

import { Inter } from "next/font/google";



import { getServerSupabaseClient } from "@/lib/supabaseServer";

import { SupabaseProvider } from "@/components/providers/supabase-provider";



const inter = Inter({ subsets: ["latin"] });



export const metadata: Metadata = {

  title: "D20 DM Companion",

  description: "A modern Dungeon Master dashboard to keep campaigns organized",

  metadataBase: new URL("https://example.com")

};



export default async function RootLayout({ children }: { children: React.ReactNode }) {

  const supabase = await getServerSupabaseClient();

  const [

    {

      data: { session }

    },

    {

      data: { user }

    }

  ] = await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);

  const initialSession = session && user ? { ...session, user } : null;



  return (

    <html lang="en" className="bg-slate-950">

      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100`} suppressHydrationWarning>

        <SupabaseProvider initialSession={initialSession}>{children}</SupabaseProvider>

      </body>

    </html>

  );

}


