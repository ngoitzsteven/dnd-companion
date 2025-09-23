import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Sign in | D20 DM Companion"
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <Card className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Welcome back, storyteller</h1>
          <p className="text-sm text-slate-400">
            Sign in to manage your campaigns, NPCs, quests, and session notes.
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-slate-500">
          Need an account? <Link href="/" className="text-brand-light">Request early access</Link>.
        </p>
      </Card>
    </main>
  );
}
