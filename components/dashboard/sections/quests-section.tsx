"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/api";
import type { Location, Quest } from "@/types/database";

import { EmptyStateMessage } from "../empty-state-message";

import { selectClassName } from "./shared";

interface QuestsSectionProps {
  campaignId: string;
  canManage: boolean;
  quests: Quest[];
  locations: Location[];
  locationLookup: Map<string, string>;
  onMutated: () => void;
}

export function QuestsSection({ campaignId, canManage, quests, locations, locationLookup, onMutated }: QuestsSectionProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<Quest["status"]>("planned");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const questStatuses: Array<Quest["status"]> = ["planned", "active", "completed"];

  const resetForm = () => {
    setTitle("");
    setSummary("");
    setStatus("planned");
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

    if (!title.trim()) {
      setError("Add a quest title to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/quests`, {
        title: title.trim(),
        summary: summary.trim(),
        status,
        location_id: locationId ? locationId : null
      });

      onMutated();
      setIsModalOpen(false);
      resetForm();
    } catch (questError) {
      setError(questError instanceof Error ? questError.message : "Unable to save quest");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate = () => {
    const quest = generateRandomQuest();
    setTitle(quest.title);
    setSummary(quest.summary);
    setStatus("planned");
    setError(null);
  };

  return (
    <>
      <Card className="bg-slate-900/60">
        <CardHeader className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Quest log</CardTitle>
            <CardDescription>Outline objectives and side stories.</CardDescription>
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
              Add quest
            </Button>
          ) : null}
        </CardHeader>
        <div className="space-y-4">
          {canManage ? null : (
            <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
              Only campaign owners and co-DMs can add quests.
            </p>
          )}
          <div className="space-y-3 text-sm text-slate-300">
            {quests.length === 0 ? (
              <EmptyStateMessage message="No quests logged yet." />
            ) : (
              quests.map((quest) => (
                <div key={quest.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-100">{quest.title}</p>
                    <span className="text-xs uppercase tracking-wide text-slate-500">{quest.status}</span>
                  </div>
                  {quest.summary ? <p className="text-xs text-slate-500">{quest.summary}</p> : null}
                  {quest.location_id ? (
                    <p className="text-xs text-slate-500">
                      Location: {locationLookup.get(quest.location_id) ?? "Unknown"}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
      <Modal open={isModalOpen} onClose={handleModalClose} title="Add quest">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Need a hook fast? Generate an idea.</p>
            <Button type="button" variant="secondary" size="sm" onClick={handleGenerate} disabled={isSubmitting}>
              Roll inspiration
            </Button>
          </div>
          <div className="space-y-1 text-sm">
            <label htmlFor="quest-title" className="text-xs uppercase tracking-wide text-slate-400">
              Title
            </label>
            <Input
              id="quest-title"
              placeholder="E.g. Rescue the River King"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label htmlFor="quest-summary" className="text-xs uppercase tracking-wide text-slate-400">
              Summary
            </label>
            <Textarea
              id="quest-summary"
              placeholder="Why does this quest matter?"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label htmlFor="quest-status" className="text-xs uppercase tracking-wide text-slate-400">
                Status
              </label>
              <select
                id="quest-status"
                className={selectClassName}
                value={status}
                onChange={(event) => setStatus(event.target.value as Quest["status"])}
                disabled={isSubmitting}
              >
                {questStatuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="quest-location" className="text-xs uppercase tracking-wide text-slate-400">
                Linked location
              </label>
              <select
                id="quest-location"
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
          </div>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleModalClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save quest"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

const questTitleVerbs = ["Rescue", "Recover", "Protect", "Investigate", "Disrupt"] as const;
const questTitleNouns = [
  "the Moonlit Relic",
  "the River King",
  "the Whispered Vault",
  "the Ember Crown",
  "the Shattered Sigil"
] as const;

const questSummaries = [
  "Rumors point to a forgotten shrine where the key to the next arc lies hidden.",
  "A rival faction threatens the region unless someone stands in their way.",
  "An ally has vanished after following cryptic visions of the future.",
  "A powerful artifact has awakened and draws dangerous attention.",
  "A village seeks aid before ancient wards collapse and unleash something terrible."
] as const;

function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function generateRandomQuest() {
  const title = `${pickRandom(questTitleVerbs)} ${pickRandom(questTitleNouns)}`;
  return {
    title,
    summary: pickRandom(questSummaries)
  };
}
