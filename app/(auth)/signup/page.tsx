import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Create account | D20 DM Companion"
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <Card className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Start your next great campaign</h1>
          <p className="text-sm text-slate-400">
            Create an account to organize worlds, characters, and encounters with ease.
          </p>
        </div>
        <SignupForm />
        <p className="text-center text-xs text-slate-500">
          Already have an account? <Link href="/login" className="text-brand-light">Sign in</Link>.
        </p>
      </Card>
    </main>
  );
}
