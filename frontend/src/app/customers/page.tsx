"use client";

import { useState, useEffect, useCallback } from "react";
import { LoadingRing } from "@/components/LoadingRing";
import CustomerTwin from "@/components/CustomerTwin";
import { api, type Customer } from "@/lib/api";
import { Search } from "lucide-react";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getCustomers();
      setCustomers(result);
      setFilteredCustomers(result);
    } catch (error) {
      console.warn("Failed to load customers", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const filtered = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10 h-full">
        <LoadingRing label="Loading customers..." />
      </div>
    );
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.2fr] min-h-0 h-full">
      {/* Customers List */}
      <div className="glass-card h-full flex flex-col overflow-hidden">
        <div className="p-5 border-b border-coffee-border">
          <h2 className="text-2xl font-semibold text-coffee-text">Customers</h2>
          <p className="mt-1 text-sm text-coffee-muted">Select a customer to view their profile.</p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-coffee-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-muted" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-[12px] border border-coffee-border bg-panel-surface text-coffee-text text-sm placeholder-coffee-muted focus:outline-none focus:ring-2 focus:ring-coffee-highlight"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 panel-scroll overflow-y-auto p-3">
          {filteredCustomers.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-coffee-muted text-sm">No customers found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`w-full text-left rounded-[20px] border p-4 transition ${
                    selectedCustomerId === customer.id
                      ? "border-coffee-highlight bg-panel-surface shadow-sm"
                      : "border-coffee-border bg-panel-surface/80 hover:border-coffee-highlight hover:bg-panel-surface"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-coffee-text text-sm">{customer.name}</p>
                    <p className="text-xs text-coffee-muted">{customer.email}</p>
                    <p className="text-xs text-coffee-muted">
                      {customer.order_count || 0} orders • ₹{(customer.total_spent || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer Profile */}
      <div className="glass-card customer-profile h-full flex flex-col overflow-hidden">
        {selectedCustomer ? (
          <>
            <div className="p-5 border-b border-coffee-border">
              <h3 className="text-xl font-semibold text-coffee-text">{selectedCustomer.name}</h3>
              <p className="text-sm text-coffee-muted mt-1">{selectedCustomer.email}</p>
            </div>
            <div className="flex-1 panel-scroll overflow-y-auto p-5">
              <CustomerTwin customerId={selectedCustomer.id} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-coffee-muted">Select a customer to view their profile</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
