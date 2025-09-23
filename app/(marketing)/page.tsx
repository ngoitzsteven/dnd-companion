import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

const features = [
  {
    title: "Campaigns at a glance",
    description: "Centralize lore, encounters, and session prep without juggling docs."
  },
  {
    title: "NPC roster",
    description: "Track quirks, voices, and motivations to keep roleplay consistent."
  },
  {
    title: "Quest log & session notes",
    description: "Summarize each session and assign next steps with an easy status board."
  }
];

export default function MarketingPage() {
  return (
    <main className="container-fluid py-20">
      <section className="flex flex-col gap-10 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <span className="inline-flex items-center rounded-full border border-brand-light/40 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-light">
            For storytellers who improvise like pros
          </span>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Run unforgettable sessions with a DM command center built for modern tables.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            D20 DM Companion keeps your campaigns organized, your NPCs memorable, and your players engaged.
            Sign up for early access and we'll share the roadmap as it unfolds.
          </p>
          <div className="max-w-xl space-y-3">
            <WaitlistForm />
            <p className="text-xs text-slate-500">
              We only send important updates. You can opt out anytime.
            </p>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl">
            <div className="absolute -inset-1 rounded-3xl bg-brand/20 blur-3xl" aria-hidden />
            <div className="relative space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-light">
                Session zero - ready
              </p>
              <h2 className="text-2xl font-semibold text-white">Tonight's Prep</h2>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                  Reveal the hidden patron behind the Sapphire Syndicate.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-amber-400" aria-hidden />
                  Roleplay notes for Captain Mirella and the dockside crew.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-rose-400" aria-hidden />
                  Branching outcomes for the heist infiltration.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardTitle>{feature.title}</CardTitle>
            <CardDescription>{feature.description}</CardDescription>
          </Card>
        ))}
      </section>
      <section className="mt-16 flex flex-col items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <h2 className="text-2xl font-semibold">Ready to dive deeper?</h2>
        <p className="text-slate-300">
          Already have access? Log in to jump straight into your DM dashboard.
        </p>
        <Link href="/login" className="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-800">Sign in</Link>
      </section>
    </main>
  );
}




