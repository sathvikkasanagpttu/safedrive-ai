"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { Driver, DriverStatus } from "@/types";
import { Users, Plus, Search, ShieldCheck, Phone, Mail, Award, ArrowUpRight } from "lucide-react";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // New driver form state
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newLicense, setNewLicense] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const loadDrivers = () => {
    setLoading(true);
    api.getDrivers({
      status: statusFilter || undefined,
      search: search || undefined,
    })
      .then((res) => setDrivers(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDrivers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDrivers();
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createDriver({
        driver_code: newCode,
        full_name: newName,
        license_number: newLicense,
        phone: newPhone,
        email: newEmail,
        status: "active",
      });
      setIsModalOpen(false);
      setNewCode("");
      setNewName("");
      setNewLicense("");
      setNewPhone("");
      setNewEmail("");
      loadDrivers();
    } catch (err: any) {
      alert(err.message || "Failed to create driver.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Driver Directory & Biometric Profiles"
        description="Registered fleet operators, safety ratings, and face embedding credentials."
        action={
          <Button size="md" variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Register Driver
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, license..."
            className="w-full bg-surface-card border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-card border border-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Drivers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-60 w-full" />
          ))}
        </div>
      ) : drivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((d) => (
            <Card key={d.id} className="hover:border-slate-600 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                    {d.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">{d.full_name}</h4>
                    <span className="text-xs font-mono text-slate-400">{d.driver_code}</span>
                  </div>
                </div>
                <Badge variant={d.status === "active" ? "low" : "gray"}>{d.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-surface border border-border/60">
                    <span className="text-[10px] text-slate-400 block">Safety Score</span>
                    <span className="font-mono font-bold text-slate-100 text-sm">
                      {d.safety_score.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-border/60">
                    <span className="text-[10px] text-slate-400 block">Biometric Embeddings</span>
                    <span className="font-mono font-bold text-slate-100 text-sm flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      {d.embeddings_count || 0} samples
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-1 pt-1 font-mono">
                  <div>License: <strong className="text-slate-300">{d.license_number}</strong></div>
                  <div>Trips: <strong className="text-slate-300">{d.total_trips}</strong> | Hours: <strong className="text-slate-300">{d.total_hours.toFixed(1)}h</strong></div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end">
                  <Link href={`/drivers/${d.id}`} className="w-full">
                    <Button size="sm" variant="outline" className="w-full">
                      View Profile & Face Samples <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-border rounded-xl">
          No drivers match the current search query.
        </div>
      )}

      {/* Add Driver Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Fleet Driver"
        description="Creates driver identity profile for biometric enrollment."
      >
        <form onSubmit={handleCreateDriver} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Driver Code</label>
            <input
              type="text"
              required
              placeholder="DRV-005"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              placeholder="Jonathan Hayes"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Driver License Number</label>
            <input
              type="text"
              required
              placeholder="DL-552910-E"
              value={newLicense}
              onChange={(e) => setNewLicense(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                placeholder="driver@logistics.corp"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={creating}>
              Create Driver Record
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
