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
import { DrivingSession, Driver } from "@/types";
import { Car, Plus, Play, Square, ArrowUpRight, ShieldAlert, Clock, Gauge } from "lucide-react";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<DrivingSession[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<number | undefined>(undefined);
  const [sessionNotes, setSessionNotes] = useState("");
  const [starting, setStarting] = useState(false);

  const loadSessions = () => {
    setLoading(true);
    Promise.all([api.getSessions(), api.getDrivers()])
      .then(([sessRes, drvRes]) => {
        setSessions(sessRes);
        setDrivers(drvRes);
        if (drvRes.length > 0) setSelectedDriverId(drvRes[0].id);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setStarting(true);
    try {
      await api.createSession({
        driver_id: selectedDriverId,
        notes: sessionNotes || "Real-time safety telemetry run",
      });
      setIsModalOpen(false);
      setSessionNotes("");
      loadSessions();
    } catch (err: any) {
      alert(err.message || "Failed to create session.");
    } finally {
      setStarting(false);
    }
  };

  const handleStopSession = async (sessionId: number) => {
    if (!confirm("Are you sure you want to stop this driving session?")) return;
    try {
      await api.stopSession(sessionId);
      loadSessions();
    } catch (err: any) {
      alert(err.message || "Failed to stop session.");
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Driving Sessions Log"
        description="Recorded monitoring trips, chronological timelines, peak hazard scores, and compliance ratings."
        action={
          <Button size="md" variant="primary" onClick={() => setIsModalOpen(true)}>
            <Play className="w-4 h-4 mr-1.5" /> Start New Session
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-400" />
              <span>All Logged Trips</span>
            </div>
            <span className="text-xs font-mono text-slate-400">{sessions.length} Sessions Total</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-border text-slate-400 font-mono">
                  <tr>
                    <th className="px-5 py-3">Session ID</th>
                    <th className="px-5 py-3">Driver</th>
                    <th className="px-5 py-3">Start Time</th>
                    <th className="px-5 py-3">Duration</th>
                    <th className="px-5 py-3">Total Events</th>
                    <th className="px-5 py-3">High-Risk</th>
                    <th className="px-5 py-3">Avg Risk</th>
                    <th className="px-5 py-3">Max Risk</th>
                    <th className="px-5 py-3">Rating</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3 font-mono font-medium text-slate-200">
                        <Link href={`/sessions/${s.id}`} className="hover:text-blue-400">
                          {s.session_id}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-300">
                        {s.driver ? (
                          <Link href={`/drivers/${s.driver.id}`} className="hover:text-blue-400">
                            {s.driver.full_name}
                          </Link>
                        ) : (
                          "Unassigned"
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-400">
                        {new Date(s.start_time).toLocaleDateString()} {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-300">
                        {Math.round(s.duration_seconds / 60)} min
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-400">{s.total_events}</td>
                      <td className="px-5 py-3 font-mono text-red-400 font-semibold">{s.high_risk_events}</td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-200">{s.avg_risk_score}</td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-200">{s.max_risk_score}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          s.safety_rating.startsWith("A")
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : s.safety_rating.startsWith("B")
                            ? "bg-blue-950 text-blue-400 border border-blue-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}>
                          {s.safety_rating}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={s.status === "active" ? "low" : "gray"}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {s.status === "active" && (
                            <Button size="sm" variant="danger" onClick={() => handleStopSession(s.id)}>
                              <Square className="w-3 h-3 mr-1" /> Conclude
                            </Button>
                          )}
                          <Link href={`/sessions/${s.id}`}>
                            <Button size="sm" variant="outline">
                              Timeline <ArrowUpRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">No driving sessions logged.</div>
          )}
        </CardContent>
      </Card>

      {/* Start Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Initialize New Driving Session"
        description="Creates an active telematics monitoring session."
      >
        <form onSubmit={handleStartSession} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Select Driver</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(parseInt(e.target.value, 10))}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} ({d.driver_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Session Notes / Route</label>
            <textarea
              rows={3}
              placeholder="E.g., North Highway Route Corridor 4"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={starting}>
              Launch Session
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
