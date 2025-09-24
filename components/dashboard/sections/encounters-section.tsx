"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/api";
import type { Encounter } from "@/types/database";

import { EmptyStateMessage } from "../empty-state-message";
import type { EncounterWithMonsters } from "@/components/dashboard/types";

import { selectClassName } from "./shared";

interface EncountersSectionProps {
  campaignId: string;
  canManage: boolean;
  encounters: EncounterWithMonsters[];
  onMutated: () => void;
}

export function EncountersSection({ campaignId, canManage, encounters, onMutated }: EncountersSectionProps) {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<Encounter["status"]>("draft");
  const [round, setRound] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const encounterStatuses: Array<Encounter["status"]> = ["draft", "active", "completed"];

  const resetForm = () => {
    setName("");
    setSummary("");
    setStatus("draft");
    setRound("1");
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
      setError("Name your encounter to continue.");
      return;
    }

    const roundValue = round.trim() ? Number.parseInt(round, 10) : undefined;

    if (roundValue !== undefined && (Number.isNaN(roundValue) || roundValue < 1)) {
      setError("Set a round number of 1 or higher.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/encounters`, {
        name: name.trim(),
        summary: summary.trim(),
        status,
        round: roundValue
      });

      onMutated();
      setIsModalOpen(false);
      resetForm();
    } catch (encounterError) {
      setError(encounterError instanceof Error ? encounterError.message : "Unable to save encounter");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="bg-slate-900/60">
        <CardHeader className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Encounters</CardTitle>
            <CardDescription>Prep combat and set-piece moments.</CardDescription>
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
              Add encounter
            </Button>
          ) : null}
        </CardHeader>
        <div className="space-y-4">
          {canManage ? null : (
            <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
              Only campaign owners and co-DMs can add encounters.
            </p>
          )}
          <div className="space-y-3 text-sm text-slate-300">
            {encounters.length === 0 ? (
              <EmptyStateMessage message="No encounters prepped yet." />
            ) : (
              encounters.map((encounter) => (
                <div key={encounter.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-100">{encounter.name}</p>
                    <span className="text-xs uppercase tracking-wide text-slate-500">{encounter.status}</span>
                  </div>
                  {encounter.summary ? <p className="text-xs text-slate-500">{encounter.summary}</p> : null}
                  <p className="text-xs text-slate-500">
                    {encounter.encounter_monsters.length} creature{encounter.encounter_monsters.length === 1 ? "" : "s"} • Round
                    {encounter.round ?? 1}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
      <Modal open={isModalOpen} onClose={handleModalClose} title="Add encounter">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1 text-sm">
            <label htmlFor="encounter-name" className="text-xs uppercase tracking-wide text-slate-400">
              Name
            </label>
            <Input
              id="encounter-name"
              placeholder="E.g. Ambush at Dawnspire"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label htmlFor="encounter-summary" className="text-xs uppercase tracking-wide text-slate-400">
              Summary
            </label>
            <Textarea
              id="encounter-summary"
              placeholder="Victory conditions, enemy tactics, terrain twists."
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label htmlFor="encounter-status" className="text-xs uppercase tracking-wide text-slate-400">
                Status
              </label>
              <select
                id="encounter-status"
                className={selectClassName}
                value={status}
                onChange={(event) => setStatus(event.target.value as Encounter["status"])}
                disabled={isSubmitting}
              >
                {encounterStatuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="encounter-round" className="text-xs uppercase tracking-wide text-slate-400">
                Current round
              </label>
              <Input
                id="encounter-round"
                type="number"
                min={1}
                value={round}
                onChange={(event) => setRound(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleModalClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save encounter"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
