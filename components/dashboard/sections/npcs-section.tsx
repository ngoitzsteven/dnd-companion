"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/api";
import type { Location, Npc } from "@/types/database";

import { EmptyStateMessage } from "../empty-state-message";

import { selectClassName } from "./shared";

interface NpcsSectionProps {
  campaignId: string;
  canManage: boolean;
  npcs: Npc[];
  locations: Location[];
  locationLookup: Map<string, string>;
  onMutated: () => void;
}

export function NpcsSection({ campaignId, canManage, npcs, locations, locationLookup, onMutated }: NpcsSectionProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quirks, setQuirks] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setQuirks("");
    setLocationId("");
    setError(null);
  };

  const handleModalClose = () => {
    if (isSubmitting) {
      return;
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Enter an NPC name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/npcs`, {
        name: name.trim(),
        description: description.trim(),
        quirks: quirks.trim(),
        location_id: locationId ? locationId : null
      });

      onMutated();
      setIsModalOpen(false);
      resetForm();
    } catch (npcError) {
      setError(npcError instanceof Error ? npcError.message : "Unable to add NPC");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate = () => {
    const npc = generateRandomNpc();
    setName(npc.name);
    setDescription(npc.description);
    setQuirks(npc.quirks);
    setError(null);
  };

  return (
    <>
      <Card className="bg-slate-900/60">
        <CardHeader className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>NPCs</CardTitle>
            <CardDescription>Keep personalities and plot hooks handy.</CardDescription>
          </div>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setError(null);
                setIsModalOpen(true);
              }}
            >
              Add NPC
            </Button>
          ) : null}
        </CardHeader>
        <div className="space-y-4">
          {canManage ? null : (
            <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
              Only campaign owners and co-DMs can add NPCs.
            </p>
          )}
          <div className="space-y-3 text-sm text-slate-300">
            {npcs.length === 0 ? (
              <EmptyStateMessage message="No NPCs saved yet." />
            ) : (
              npcs.map((npc) => (
                <div key={npc.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-100">{npc.name}</p>
                    {npc.location_id ? (
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        {locationLookup.get(npc.location_id) ?? "Unknown locale"}
                      </span>
                    ) : null}
                  </div>
                  {npc.description ? <p className="text-xs text-slate-500">{npc.description}</p> : null}
                  {npc.quirks ? <p className="text-xs text-slate-500">Quirks: {npc.quirks}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
      <Modal open={isModalOpen} onClose={handleModalClose} title="Add NPC">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Need inspiration? Generate a prompt.</p>
            <Button type="button" variant="secondary" size="sm" onClick={handleGenerate} disabled={isSubmitting}>
              Surprise me
            </Button>
          </div>
          <div className="space-y-1 text-sm">
            <label htmlFor="npc-name" className="text-xs uppercase tracking-wide text-slate-400">
              Name
            </label>
            <Input
              id="npc-name"
              placeholder="E.g. Magistrate Velen"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label htmlFor="npc-description" className="text-xs uppercase tracking-wide text-slate-400">
              Description
            </label>
            <Textarea
              id="npc-description"
              placeholder="Role, appearance, or motivations."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label htmlFor="npc-quirks" className="text-xs uppercase tracking-wide text-slate-400">
              Quirks (optional)
            </label>
            <Input
              id="npc-quirks"
              placeholder="E.g. speaks in rhyme, collects odd trinkets"
              value={quirks}
              onChange={(event) => setQuirks(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label htmlFor="npc-location" className="text-xs uppercase tracking-wide text-slate-400">
              Linked location
            </label>
            <select
              id="npc-location"
              className={selectClassName}
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              disabled={isSubmitting}
            >
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleModalClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save NPC"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

const npcFirstNames = [
  "Arin",
  "Bryn",
  "Cael",
  "Dorian",
  "Elowen",
  "Fira",
  "Galen",
  "Hesta",
  "Iris",
  "Jorah"
] as const;

const npcLastNames = [
  "Ashgrove",
  "Brightwater",
  "Duskvale",
  "Emberfall",
  "Frostwind",
  "Mooncrest",
  "Nightbloom",
  "Stormfen",
  "Thorne",
  "Willowmere"
] as const;

const npcDescriptions = [
  "A veteran scout who knows every hidden path around the region.",
  "A charming innkeeper with a ledger of favors owed and collected.",
  "A reclusive sage obsessed with celestial omens.",
  "A merchant prince whose smile never reaches their eyes.",
  "A bright-eyed acolyte carrying messages for a secretive order."
] as const;

const npcQuirkIdeas = [
  "Collects buttons from every traveler they meet",
  "Finishes every sentence with an optimistic proverb",
  "Keeps an invisible 'pet' dragonling they insist is real",
  "Refuses to speak above a whisper unless reciting poetry",
  "Always hums the same three-note tune when thinking"
] as const;

function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function generateRandomNpc() {
  const name = `${pickRandom(npcFirstNames)} ${pickRandom(npcLastNames)}`;
  return {
    name,
    description: pickRandom(npcDescriptions),
    quirks: pickRandom(npcQuirkIdeas)
  };
}
