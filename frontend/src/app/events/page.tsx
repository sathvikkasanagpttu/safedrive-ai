"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { ExtendedDetectionEvent } from "@/types";
import {
  AlertTriangle,
  Eye,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Camera,
  Activity,
} from "lucide-react";

export default function EventsPage() {
  const [events, setEvents] = useState<ExtendedDetectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [activeModalEvent, setActiveModalEvent] = useState<ExtendedDetectionEvent | null>(null);

  // Review action state
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const loadEvents = () => {
    setLoading(true);
    api.getEvents({
      severity: selectedSeverity || undefined,
      event_type: selectedType || undefined,
      limit: 100,
    })
      .then((res: any) => setEvents(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, [selectedSeverity, selectedType]);

  const handleReview = async (status: string) => {
    if (!activeModalEvent) return;
    try {
      setReviewing(true);
      await api.reviewEvent(activeModalEvent.id, status, reviewNotes);
      setActiveModalEvent((prev) => (prev ? { ...prev, evidence_status: status, review_notes: reviewNotes } : null));
      loadEvents();
    } catch (err: any) {
      alert(`Error submitting review: ${err.message}`);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Fleet Safety Events & Evidence Log"
        description="Searchable forensic record of multi-signal vision detections, captured evidence frames, and human-in-the-loop review."
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-surface-card border border-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Event Categories</option>
            <option value="drowsiness">Drowsiness / Microsleep</option>
            <option value="head_distraction">Head Distraction</option>
            <option value="phone_usage">Phone Interaction</option>
            <option value="yawning">Yawning</option>
            <option value="unknown_driver">Unknown Driver</option>
            <option value="face_lost">Face Disappearance</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-surface-card border border-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Showing {events.length} Events
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-border text-slate-400 font-mono">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Event Type</th>
                    <th className="px-5 py-3">Severity</th>
                    <th className="px-5 py-3">Evidence Frame</th>
                    <th className="px-5 py-3">Review Status</th>
                    <th className="px-5 py-3">Duration</th>
                    <th className="px-5 py-3">Confidence</th>
                    <th className="px-5 py-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-300">
                        {new Date(ev.start_time).toLocaleDateString()} {new Date(ev.start_time).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-200 capitalize">
                        {ev.event_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={ev.severity as any} size="sm">
                          {ev.severity}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        {ev.evidence_frame_url ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-950/60 text-blue-400 border border-blue-800">
                            <Camera className="w-3 h-3" /> CAPTURED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            ev.evidence_status === "VERIFIED"
                              ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800"
                              : ev.evidence_status === "FALSE_POSITIVE"
                              ? "bg-slate-800 text-slate-400 border border-slate-700"
                              : ev.evidence_status === "ESCALATED"
                              ? "bg-red-950/70 text-red-400 border border-red-800"
                              : "bg-amber-950/70 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {ev.evidence_status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-300">
                        {ev.duration_seconds > 0 ? `${ev.duration_seconds}s` : "--"}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-300">
                        {Math.round(ev.confidence * 100)}%
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveModalEvent(ev);
                            setReviewNotes(ev.review_notes || "");
                          }}
                        >
                          Evidence Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">
              No events found matching current criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forensic Evidence Frame & Human Review Dialog */}
      {activeModalEvent && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModalEvent(null)}
          title={`Forensic Incident Review: ${activeModalEvent.event_type.toUpperCase()}`}
          description={`Logged at ${new Date(activeModalEvent.start_time).toLocaleString()} | Session #${activeModalEvent.session_id}`}
        >
          <div className="space-y-4">
            {/* Visual Evidence Snapshot Container */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800/80 mb-3">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>Captured Evidence Frame (Synchronized Vision Trigger)</span>
                </span>
                <span className="text-[10px] text-slate-500">Resolution: 640x480 RAW</span>
              </div>

              {/* Synthetic/Simulated Forensic Frame Canvas */}
              <div className="w-full h-48 bg-slate-900 rounded-lg border border-slate-800 flex flex-col items-center justify-center relative group">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-red-500/70 flex items-center justify-center bg-red-950/20">
                  <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-emerald-400 border border-emerald-900">
                  OVERLAY: FACE ROI [{activeModalEvent.details?.ear ? `EAR: ${activeModalEvent.details.ear.toFixed(2)}` : "DETECTED"}]
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-amber-400 border border-amber-900">
                  RISK CONTRIB: +{activeModalEvent.risk_contribution ?? 35} PTS
                </div>
                <span className="text-[11px] text-slate-400 mt-2 font-mono">
                  Evidence ID: EV-{activeModalEvent.id}-REC
                </span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface border border-border">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Severity</span>
                <div className="mt-1">
                  <Badge variant={activeModalEvent.severity as any}>{activeModalEvent.severity}</Badge>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-border">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Confidence</span>
                <span className="text-sm font-mono font-bold text-slate-100">
                  {Math.round(activeModalEvent.confidence * 100)}%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-border">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Model Engine</span>
                <span className="text-xs font-mono font-medium text-slate-200">
                  {activeModalEvent.model_name || "SafeDrive-Fusion-v2"}
                </span>
              </div>
            </div>

            {/* Human-In-The-Loop Safety Officer Review Panel */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Safety Officer Adjudication</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  Current: <strong className="text-slate-200">{activeModalEvent.evidence_status || "PENDING"}</strong>
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Forensic Review Notes</label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter observation notes (e.g. 'Driver closed eyes during highway merge')..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-mono">RBAC: Safety Officer / Admin</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReview("FALSE_POSITIVE")}
                    disabled={reviewing}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>False Positive</span>
                  </button>
                  <button
                    onClick={() => handleReview("ESCALATED")}
                    disabled={reviewing}
                    className="px-2.5 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/80 text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    <span>Escalate</span>
                  </button>
                  <button
                    onClick={() => handleReview("VERIFIED")}
                    disabled={reviewing}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors flex items-center gap-1 shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify Incident</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setActiveModalEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
