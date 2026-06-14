"use client";

import { useState, useEffect } from "react";
import { api, type Customer, type Segment } from "@/lib/api";

export default function CustomerAdd({ segment, onAdded }: { segment: Segment | null; onAdded?: () => void }) {
  const [show, setShow] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!show) return;
    let mounted = true;
    setLoading(true);
    api
      .getCustomers()
      .then((res) => {
        if (mounted) setCustomers(res || []);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [show]);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      String(c.id).includes(s) ||
      (c.name || "").toLowerCase().includes(s) ||
      (c.email || "").toLowerCase().includes(s) ||
      (c.city || "").toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShow((v) => !v)}
          className="px-3 py-2 rounded-[10px] bg-coffee-highlight text-coffee-cream"
        >
          {show ? "Close" : "Add Customer"}
        </button>
        {segment && <div className="text-sm text-coffee-muted">Adding to: {segment.name}</div>}
      </div>

      {show && (
        <div className="mt-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people by name, email, city or id..."
            className="w-full px-3 py-2 rounded-md border border-coffee-border bg-panel-surface text-sm"
          />

          <div className="mt-2 max-h-44 overflow-y-auto border rounded-md bg-panel-surface">
            {loading ? (
              <div className="p-3 text-sm text-coffee-muted">Loading customers...</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-sm text-coffee-muted">No customers found.</div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  className={`p-2 cursor-pointer hover:bg-surface-soft flex items-center justify-between ${selectedId === c.id ? "bg-surface-soft" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-coffee-muted">{c.email} • {c.city}</div>
                  </div>
                  <div className="text-xs text-coffee-muted">ID {c.id}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 flex gap-2">
            <button
              disabled={!selectedId || !segment}
              onClick={async () => {
                if (!selectedId || !segment) return;
                setLoading(true);
                try {
                  await api.addCustomerToSegment(segment.id, selectedId);
                  setShow(false);
                  setSearch("");
                  setSelectedId(null);
                  onAdded && (await onAdded());
                } catch (e) {
                  window.alert("Failed to add customer to segment.");
                } finally {
                  setLoading(false);
                }
              }}
              className="px-3 py-2 rounded-[10px] bg-coffee-highlight text-coffee-cream disabled:opacity-50"
            >
              Add selected
            </button>
            <button
              onClick={() => {
                setShow(false);
                setSearch("");
                setSelectedId(null);
              }}
              className="px-3 py-2 rounded-[10px] border"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
