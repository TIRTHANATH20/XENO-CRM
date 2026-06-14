"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import type { Segment } from "@/lib/api";

export function SegmentCard({
  segment,
  onSave,
  onDelete,
  onView,
}: {
  segment: Segment;
  onSave?: (payload: { name: string; description: string }) => void;
  onDelete?: () => void;
  onView?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(segment.name);
  const [description, setDescription] = useState(segment.description);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
      setIsEditing(false);
    } catch (error) {
      console.warn("Segment save failed", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card min-h-0 border border-coffee-border p-4 transition-all duration-200 hover:border-coffee-border">
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-coffee-border bg-coffee-highlight-strong text-coffee-cream">
            <Users className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            {isEditing ? (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-coffee-border bg-panel-surface px-3 py-2 text-sm text-coffee-text"
              />
            ) : (
              <h3 className="text-base font-semibold text-coffee-text break-words">{segment.name}</h3>
            )}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-coffee-border bg-panel-surface px-3 py-2 text-sm text-coffee-text"
          />
        ) : (
          <p className="text-sm text-coffee-muted leading-6 line-clamp-3 break-words">{segment.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-coffee-border bg-panel-surface px-3 py-1 text-xs font-semibold text-coffee-text">
            <Users className="w-3 h-3" />
            {segment.customer_count} customers
          </div>
          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-full border border-coffee-border bg-panel-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-coffee-text transition hover:border-coffee-border"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(segment.name);
                    setDescription(segment.description);
                  }}
                  className="rounded-full border border-coffee-border bg-panel-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-coffee-text transition hover:border-coffee-border"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-full border border-coffee-border bg-panel-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-coffee-text transition hover:border-coffee-border"
                >
                  Edit
                </button>
                {onView && (
                  <button
                    type="button"
                    onClick={onView}
                    className="rounded-full border border-coffee-border bg-panel-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-coffee-text transition hover:border-coffee-border"
                  >
                    View
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this segment?")) {
                        onDelete();
                      }
                    }}
                    className="rounded-full border border-coffee-border bg-panel-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300 transition hover:border-coffee-border"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
