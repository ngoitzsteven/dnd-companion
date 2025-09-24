"use client";

interface EmptyStateMessageProps {
  message: string;
}

export function EmptyStateMessage({ message }: EmptyStateMessageProps) {
  return (
    <p className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
      {message}
    </p>
  );
}
