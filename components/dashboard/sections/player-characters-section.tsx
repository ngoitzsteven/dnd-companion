"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { postJson } from "@/lib/api";
import { getPcHealth } from "@/lib/campaign-utils";
import type { Pc } from "@/types/database";

import { EmptyStateMessage } from "../empty-state-message";

interface PlayerCharactersSectionProps {
  campaignId: string;
  canManage: boolean;
  pcs: Pc[];
  onMutated: () => void;
}

export function PlayerCharactersSection({ campaignId, canManage, pcs, onMutated }: PlayerCharactersSectionProps) {
  const [name, setName] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [race, setRace] = useState("");
  const [level, setLevel] = useState("1");
  const [currentHp, setCurrentHp] = useState("");
  const [maxHp, setMaxHp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const resetForm = () => {
    setName("");
    setCharacterClass("");
    setRace("");
    setLevel("1");
    setCurrentHp("");
    setMaxHp("");
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
      setError("Enter a character name.");
      return;
    }

    const levelValue = level.trim() ? Number.parseInt(level, 10) : undefined;

    if (levelValue !== undefined && (Number.isNaN(levelValue) || levelValue < 1 || levelValue > 20)) {
      setError("Level must be between 1 and 20.");
      return;
    }

    const currentHpValue = currentHp.trim() ? Number.parseInt(currentHp, 10) : undefined;
    const maxHpValue = maxHp.trim() ? Number.parseInt(maxHp, 10) : undefined;

    if (currentHpValue !== undefined && (Number.isNaN(currentHpValue) || currentHpValue < 0)) {
      setError("Current HP must be zero or higher.");
      return;
    }

    if (maxHpValue !== undefined && (Number.isNaN(maxHpValue) || maxHpValue < 1)) {
      setError("Max HP must be at least 1.");
      return;
    }

    if (currentHpValue !== undefined && maxHpValue !== undefined && currentHpValue > maxHpValue) {
      setError("Current HP cannot exceed max HP.");
      return;
    }

    const stats: Record<string, number> = {};
    if (currentHpValue !== undefined) {
      stats.current_hp = currentHpValue;
    }
    if (maxHpValue !== undefined) {
      stats.max_hp = maxHpValue;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/pcs`, {
        name: name.trim(),
        class: characterClass.trim(),
        race: race.trim(),
        level: levelValue,
        stats: Object.keys(stats).length > 0 ? stats : undefined
      });

      onMutated();
      setIsModalOpen(false);
      resetForm();
    } catch (pcError) {
      setError(pcError instanceof Error ? pcError.message : "Unable to add character");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="bg-slate-900/60">
        <CardHeader className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Player characters</CardTitle>
            <CardDescription>Track the heroes at your table.</CardDescription>
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
              Add character
            </Button>
          ) : null}
        </CardHeader>
        <div className="space-y-4">
          {canManage ? null : (
            <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
              Only campaign owners and co-DMs can add player characters.
            </p>
          )}
          <div className="space-y-3 text-sm text-slate-300">
            {pcs.length === 0 ? (
              <EmptyStateMessage message="No characters logged yet." />
            ) : (
              pcs.map((pc) => {
                const details = [pc.class ?? undefined, pc.race ?? undefined].filter(Boolean).join(" • ");
                const health = getPcHealth(pc.stats);
                const hasHealth = health.currentHp !== null || health.maxHp !== null;

                return (
                  <div key={pc.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-100">{pc.name}</p>
                      <span className="text-xs uppercase tracking-wide text-slate-500">Level {pc.level ?? 1}</span>
                    </div>
                    <p className="text-xs text-slate-500">{details || "Class & ancestry pending"}</p>
                    {hasHealth ? (
                      <p className="text-xs text-slate-400">
                        HP: {health.currentHp ?? "?"}
                        {health.maxHp !== null ? ` / ${health.maxHp}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">HP not recorded</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>
      <Modal open={isModalOpen} onClose={handleModalClose} title="Add player character">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label htmlFor="pc-name" className="text-xs uppercase tracking-wide text-slate-400">
                Name
              </label>
              <Input
                id="pc-name"
                placeholder="E.g. Lyra Stonesong"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="pc-level" className="text-xs uppercase tracking-wide text-slate-400">
                Level
              </label>
              <Input
                id="pc-level"
                type="number"
                min={1}
                max={20}
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label htmlFor="pc-class" className="text-xs uppercase tracking-wide text-slate-400">
                Class
              </label>
              <Input
                id="pc-class"
                placeholder="Wizard, Fighter..."
                value={characterClass}
                onChange={(event) => setCharacterClass(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="pc-race" className="text-xs uppercase tracking-wide text-slate-400">
                Ancestry
              </label>
              <Input
                id="pc-race"
                placeholder="Elf, Tiefling..."
                value={race}
                onChange={(event) => setRace(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label htmlFor="pc-current-hp" className="text-xs uppercase tracking-wide text-slate-400">
                Current HP
              </label>
              <Input
                id="pc-current-hp"
                type="number"
                min={0}
                value={currentHp}
                onChange={(event) => setCurrentHp(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="pc-max-hp" className="text-xs uppercase tracking-wide text-slate-400">
                Max HP
              </label>
              <Input
                id="pc-max-hp"
                type="number"
                min={1}
                value={maxHp}
                onChange={(event) => setMaxHp(event.target.value)}
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
              {isSubmitting ? "Adding..." : "Save character"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
