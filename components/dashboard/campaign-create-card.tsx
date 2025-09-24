"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface CampaignCreateCardProps {
  isOpen: boolean;
  hasCampaigns: boolean;
  name: string;
  onNameChange: (value: string) => void;
  onToggle: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  error: string | null;
}

export function CampaignCreateCard({
  isOpen,
  hasCampaigns,
  name,
  onNameChange,
  onToggle,
  onSubmit,
  isSubmitting,
  error
}: CampaignCreateCardProps) {
  return (
    <Card className="border border-slate-800/80 bg-slate-900/60">
      <CardHeader className="mb-4 flex-col items-start gap-3">
        <div className="space-y-1">
          <CardTitle>Start a new campaign</CardTitle>
          <CardDescription>
            {hasCampaigns
              ? "Spin up another world to organise quests, notes, and NPCs."
              : "Give your table a shared home for quests, notes, and NPCs."}
          </CardDescription>
        </div>
        <Button type="button" onClick={onToggle} variant={isOpen ? "secondary" : "primary"} size="sm" disabled={isSubmitting}>
          {isOpen ? "Cancel" : "New campaign"}
        </Button>
      </CardHeader>
      {isOpen ? (
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1 text-sm">
            <label htmlFor="campaign-name" className="text-xs uppercase tracking-wide text-slate-400">
              Campaign name
            </label>
            <Input
              id="campaign-name"
              placeholder="E.g. The Starfall Expedition"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create campaign"}
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
