"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { Vehicle, Organization, Fleet } from "@/types";
import {
  Truck,
  Car,
  Activity,
  ShieldAlert,
  Gauge,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  ExternalLink,
  Layers,
  MapPin,
  Flame,
} from "lucide-react";
import Link from "next/link";

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFleetId, setSelectedFleetId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState<{
    fleet_id: number;
    vehicle_code: string;
    make: string;
    model: string;
    year: number;
    license_plate: string;
    status: "active" | "maintenance" | "inactive";
  }>({
    fleet_id: 1,
    vehicle_code: "",
    make: "",
    model: "",
    year: 2024,
    license_plate: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ovData, vList, orgList] = await Promise.all([
        api.getFleetOverview(),
        api.getFleetVehicles(selectedFleetId || undefined),
        api.getOrganizations(),
      ]);
      setOverview(ovData);
      setVehicles(vList);
      setOrganizations(orgList);
    } catch (err) {
      console.error("Failed to load fleet data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedFleetId]);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.createVehicle(newVehicle);
      setShowAddModal(false);
      setNewVehicle({
        fleet_id: 1,
        vehicle_code: "",
        make: "",
        model: "",
        year: 2024,
        license_plate: "",
        status: "active",
      });
      await fetchData();
    } catch (err: any) {
      alert(`Error creating vehicle: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Fleet & Telematics</h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              SafeDrive 2.0
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time CAN-bus telematics, active vehicle status, and multi-tier fleet risk oversight.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-medium flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Top Organization & Fleet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Vehicles</div>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {overview?.total_vehicles ?? vehicles.length}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Across {overview?.total_fleets ?? 2} fleets</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Active Operations</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {overview?.active_vehicles ?? vehicles.filter((v) => v.status === "active").length}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Live streaming CAN-bus</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Fleet Avg Risk</div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {overview?.fleet_average_risk ?? 28} <span className="text-xs font-normal text-slate-500">/ 100</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Multi-tier compounded</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Enterprise Plan</div>
            <div className="text-lg font-bold text-slate-200">Apex Logistics</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Tier: Enterprise Platinum</div>
          </div>
        </div>
      </div>

      {/* Vehicles Table & Live CAN-Bus HUD */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">Active Fleet Vehicles & Live CAN-bus Telemetry</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {vehicles.length} units listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Vehicle Code</th>
                <th className="py-3 px-4">Make / Model</th>
                <th className="py-3 px-4">License Plate</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Speed & Accel</th>
                <th className="py-3 px-4">CAN-Bus Brake</th>
                <th className="py-3 px-4">GPS / Heading</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {vehicles.map((v) => {
                const isHighRisk = v.current_risk_score >= 60;
                return (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {v.vehicle_code}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {v.make} {v.model} ({v.year})
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {v.license_plate}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                          v.status === "active"
                            ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            v.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                          }`}
                        />
                        {v.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="text-slate-200">{v.current_speed.toFixed(1)} km/h</div>
                      <div className="text-[10px] text-slate-500">
                        {v.acceleration >= 0 ? `+${v.acceleration.toFixed(2)}` : v.acceleration.toFixed(2)} m/s²
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {v.hard_braking ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800 text-[10px] font-mono font-bold animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> HARD BRAKE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">NORMAL</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{v.gps_lat?.toFixed(4)}, {v.gps_lng?.toFixed(4)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5 text-blue-400" />
                        <span>Heading: {v.heading?.toFixed(0)}°</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isHighRisk ? "bg-red-500" : v.current_risk_score > 35 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, v.current_risk_score)}%` }}
                          />
                        </div>
                        <span
                          className={`font-mono text-xs font-bold ${
                            isHighRisk ? "text-red-400" : "text-slate-300"
                          }`}
                        >
                          {v.current_risk_score}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/live-monitor?vehicle=${v.vehicle_code}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
                      >
                        <span>Monitor</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-1">Add Fleet Vehicle</h3>
            <p className="text-xs text-slate-400 mb-4">
              Register a new connected transport unit into the fleet management system.
            </p>

            <form onSubmit={handleCreateVehicle} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Vehicle Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VH-105"
                  value={newVehicle.vehicle_code}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Make</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Volvo"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VNL 860"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Year</label>
                  <input
                    type="number"
                    required
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) || 2024 })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">License Plate</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CA-SAFE-99"
                    value={newVehicle.license_plate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, license_plate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-lg shadow-blue-600/20"
                >
                  {saving ? "Registering..." : "Register Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
