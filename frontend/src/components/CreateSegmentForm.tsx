"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function CreateSegmentForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e?: any) => {
    e?.preventDefault?.();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await api.createSegment({ name: name.trim(), description: description.trim() });
      setName("");
      setDescription("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create segment.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="grid gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Segment name"
        className="w-full rounded-[12px] border border-coffee-border bg-transparent px-3 py-2 text-sm text-coffee-text"
        disabled={creating}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description or rules (optional)"
        rows={3}
        className="w-full rounded-[12px] border border-coffee-border bg-transparent px-3 py-2 text-sm text-coffee-text"
        disabled={creating}
      />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={creating} className="premium-button inline-flex items-center justify-center">
          {creating ? "Creating…" : "Create segment"}
        </button>
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </form>
  );
}
