"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        const response = await fetch("/api/waitlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Unknown error" }));
          setStatus("error");
          setMessage(payload.error ?? "Failed to join the waitlist.");
          return;
        }

        setStatus("success");
        setMessage("You're on the list! We'll reach out soon.");
        setEmail("");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Joining..." : "Join the waitlist"}
      </Button>
      {status !== "idle" && message && (
        <p
          className={`text-sm ${status === "success" ? "text-emerald-400" : "text-rose-400"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
