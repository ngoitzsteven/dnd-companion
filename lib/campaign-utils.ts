import type { CampaignMember, Note, Pc } from "@/types/database";

export function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

export function formatDateLabel(value: string | null) {
  if (!value) {
    return "Date pending";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatRole(role: CampaignMember["role"]) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getNoteSortValue(note: Note) {
  if (note.session_date) {
    const time = getTime(note.session_date);
    if (time) {
      return time;
    }
  }
  return getTime(note.created_at);
}

export function getPcHealth(stats: Pc["stats"]) {
  if (!stats || typeof stats !== "object") {
    return { currentHp: null, maxHp: null };
  }

  const record = stats as Record<string, unknown>;
  const current = record.current_hp;
  const maximum = record.max_hp;

  return {
    currentHp: typeof current === "number" ? current : null,
    maxHp: typeof maximum === "number" ? maximum : null
  };
}

export function getTime(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
