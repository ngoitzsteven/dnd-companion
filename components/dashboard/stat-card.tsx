"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: number;
  description: string;
}

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-400">{label}</CardTitle>
        <p className="text-3xl font-semibold text-white">{value}</p>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

interface QuickFactCardProps {
  label: string;
  value: number;
}

export function QuickFactCard({ label, value }: QuickFactCardProps) {
  return (
    <Card className="bg-slate-900/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-400">{label}</CardTitle>
        <p className="text-2xl font-semibold text-white">{value}</p>
      </CardHeader>
    </Card>
  );
}
