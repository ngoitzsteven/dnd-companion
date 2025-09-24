"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/api";
import type { Location } from "@/types/database";

import { EmptyStateMessage } from "../empty-state-message";

interface LocationsSectionProps {
  campaignId: string;
  canManage: boolean;
  locations: Location[];
  onMutated: () => void;
}

export function LocationsSection({ campaignId, canManage, locations, onMutated }: LocationsSectionProps) {
  const [name, setName] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Name your location before saving.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/locations`, {
        name: name.trim(),
        type: typeValue.trim(),
        description: description.trim()
      });

      setName("");
      setTypeValue("");
      setDescription("");
      onMutated();
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "Unable to save location");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-900/60">
      <CardHeader className="mb-4 flex-col items-start gap-1">
        <div>
          <CardTitle>Locations</CardTitle>
          <CardDescription>Map key places your party visits.</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-4">
        {canManage ? (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1 text-sm">
              <label htmlFor="location-name" className="text-xs uppercase tracking-wide text-slate-400">
                Name
              </label>
              <Input
                id="location-name"
                placeholder="E.g. The Gilded Griffin"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="location-type" className="text-xs uppercase tracking-wide text-slate-400">
                Type (optional)
              </label>
              <Input
                id="location-type"
                placeholder="City, Tavern, Ruins..."
                value={typeValue}
                onChange={(event) => setTypeValue(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="location-description" className="text-xs uppercase tracking-wide text-slate-400">
                Description
              </label>
              <Textarea
                id="location-description"
                placeholder="Lore, vibes, or notable NPCs."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add location"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
            Only campaign owners and co-DMs can add locations.
          </p>
        )}
        <div className="space-y-3 text-sm text-slate-300">
          {locations.length === 0 ? (
            <EmptyStateMessage message="No locations logged yet." />
          ) : (
            locations.map((location) => (
              <div key={location.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">{location.name}</p>
                  {location.type ? (
                    <span className="text-xs uppercase tracking-wide text-slate-500">{location.type}</span>
                  ) : null}
                </div>
                {location.description ? <p className="text-xs text-slate-500">{location.description}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
