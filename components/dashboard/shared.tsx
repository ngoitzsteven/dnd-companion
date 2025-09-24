import type { EmptyStateMessageProps } from "./types";

export const selectClassName = "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";

export function EmptyStateMessage({ message }: EmptyStateMessageProps) {
  return (
    <p className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
      {message}
    </p>
  );
}

export async function postJson<T = unknown>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let message = "Unexpected error";

    try {
      const data = await response.json();
      if (data && typeof data.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore body parsing errors
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
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
