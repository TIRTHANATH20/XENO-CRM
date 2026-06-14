"use client";

import { useState, useEffect, useCallback } from "react";
import { LoadingRing } from "@/components/LoadingRing";
import CreateSegmentForm from "@/components/CreateSegmentForm";
import CustomerAdd from "@/components/CustomerAdd";
import { api, type Segment, type Customer } from "@/lib/api";
import { Plus } from "lucide-react";

export default function Segments() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [segmentCustomers, setSegmentCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadSegments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getSegments();
      setSegments(result);
    } catch (error) {
      console.warn("Failed to load segments", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  // Listen for global segment updates (created elsewhere) and reload
  useEffect(() => {
    const handler = () => {
      loadSegments();
    };
    try {
      window.addEventListener("segments:updated", handler);
    } catch {}
    return () => {
      try {
        window.removeEventListener("segments:updated", handler);
      } catch {}
    };
  }, [loadSegments]);

  const handleViewSegment = useCallback(async (segment: Segment) => {
    setSelectedSegment(segment);
    setActionMessage(null);
    setLoadingCustomers(true);
    try {
      const customers = await api.getSegmentCustomers(segment.id);
      setSegmentCustomers(customers);
    } catch (error) {
      console.warn("Failed to load segment customers", error);
      setSegmentCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const handleDeleteSelectedSegment = useCallback(async () => {
    if (!selectedSegment) return;
    if (!window.confirm(`Delete segment "${selectedSegment.name}"? This cannot be undone.`)) {
      return;
    }

    setActionMessage(null);
    setLoading(true);
    try {
      await api.deleteSegment(selectedSegment.id);
      setActionMessage(`Segment "${selectedSegment.name}" deleted successfully.`);
      setSelectedSegment(null);
      setSegmentCustomers([]);
      await loadSegments();
    } catch (error) {
      console.warn("Failed to delete segment", error);
      setActionMessage("Unable to delete this segment.");
    } finally {
      setLoading(false);
    }
  }, [selectedSegment, loadSegments]);

  const handleSegmentCreated = useCallback(async () => {
    setShowCreateForm(false);
    setActionMessage("New segment added successfully.");
    await loadSegments();
  }, [loadSegments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10 h-full">
        <LoadingRing label="Loading segments..." />
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr] min-h-0 h-full">
      {/* Segments Grid */}
      <div className="glass-card h-full flex flex-col overflow-hidden">
        <div className="p-5 border-b border-coffee-border flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-coffee-text">Segments</h2>
            <p className="mt-1 text-sm text-coffee-muted">Manage audience groups and targets.</p>
          </div>
          <button
            onClick={() => setShowCreateForm((value) => !value)}
            className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-coffee-highlight hover:bg-coffee-highlight-strong text-coffee-cream transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? "Close form" : "Create"}
          </button>
        </div>

        {showCreateForm && (
          <div className="border-b border-coffee-border p-5">
            <CreateSegmentForm onCreated={handleSegmentCreated} />
          </div>
        )}

        {actionMessage && (
          <div className="border-b border-coffee-border p-5 text-sm text-coffee-success">
            {actionMessage}
          </div>
        )}

        <div className="flex-1 panel-scroll overflow-y-auto p-5">
          {segments.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-coffee-muted">No segments yet. Create your first segment.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 auto-rows-max">
              {segments.map((segment) => (
                <button
                  key={segment.id}
                  onClick={() => handleViewSegment(segment)}
                  className={`text-left transition-all rounded-[16px] border p-4 ${
                    selectedSegment?.id === segment.id
                      ? "border-coffee-highlight bg-panel-surface"
                      : "border-coffee-border hover:border-coffee-highlight"
                  }`}
                >
                  <p className="font-semibold text-coffee-text text-sm">{segment.name}</p>
                  <p className="text-xs text-coffee-muted mt-1">{segment.customer_count} customers</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Segment Details */}
      <div className="glass-card h-full flex flex-col overflow-hidden">
        {selectedSegment ? (
          <>
            <div className="p-5 border-b border-coffee-border">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-coffee-text">{selectedSegment.name}</h3>
                  <p className="text-sm text-coffee-muted mt-2">{selectedSegment.description}</p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteSelectedSegment}
                  className="self-start rounded-[12px] border border-rose-300 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15"
                  disabled={loading}
                >
                  Delete segment
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-[12px] bg-panel-surface p-3">
                  <p className="text-xs text-coffee-muted">Size</p>
                  <p className="text-lg font-semibold text-coffee-text">{selectedSegment.customer_count}</p>
                </div>
                <div className="rounded-[12px] bg-panel-surface p-3">
                  <p className="text-xs text-coffee-muted">Created</p>
                  <p className="text-xs font-semibold text-coffee-text">Recently</p>
                </div>
              </div>

              <div className="p-5 border-t border-coffee-border">
                <CustomerAdd
                  segment={selectedSegment}
                  onAdded={async () => {
                    setLoadingCustomers(true);
                    await loadSegments();
                    if (selectedSegment) await handleViewSegment(selectedSegment);
                    setLoadingCustomers(false);
                  }}
                />
              </div>
            </div>

            <div className="flex-1 panel-scroll overflow-y-auto p-5">
              {loadingCustomers ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingRing label="Loading customers..." />
                </div>
              ) : segmentCustomers.length === 0 ? (
                <p className="text-center text-coffee-muted text-sm">No customers in this segment.</p>
              ) : (
                <div className="divide-y divide-coffee-border">
                  {segmentCustomers.map((customer) => (
                    <div key={customer.id} className="py-3">
                      <p className="text-sm font-semibold text-coffee-text">{customer.name}</p>
                      <p className="text-xs text-coffee-muted">{customer.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-coffee-muted">Select a segment to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
