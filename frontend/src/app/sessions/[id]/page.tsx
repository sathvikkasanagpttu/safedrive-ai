"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { RiskTrendChart } from "@/components/charts/RiskTrendChart";
import { api } from "@/lib/api";
import { DrivingSession, DetectionEvent } from "@/types";
import {
  ArrowLeft,
  FileText,
  Download,
  Car,
  AlertTriangle,
  Eye,
  Smartphone,
  Compass,
  CheckCircle2,
  Clock,
  Gauge,
  ShieldAlert,
} from "lucide-react";

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = parseInt(params.id as string, 10);

  const [session, setSession] = useState<DrivingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSession(sessionId)
      .then((res) => setSession(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const getEventIcon = (type: string) => {
    if (type.includes("drowsiness") || type.includes("eye")) return Eye;
    if (type.includes("phone")) return Smartphone;
    if (type.includes("distraction")) return Compass;
    return AlertTriangle;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="mb-4">
          <Link href="/sessions" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sessions
          </Link>
        </div>
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl max-w-xl mx-auto my-12">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Session Record Not Found</h2>
          <p className="text-sm text-slate-400 mb-6">
            Unable to load telemetry log for Driving Session #{sessionId}. The backend may be offline or this session does not exist.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => {
              setLoading(true);
              api.getSession(sessionId)
                .then((res) => setSession(res))
                .catch((err) => console.error(err))
                .finally(() => setLoading(false));
            }}>Retry Connection</Button>
            <Link href="/sessions">
              <Button variant="primary">Return to Sessions</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Format events sorted chronologically
  const sortedEvents = (session.events || []).sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const riskTimelineData = (session.risk_scores || []).map((r) => ({
    timestamp: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    risk_score: r.overall_risk,
  }));

  return (
    <DashboardLayout>
      <div className="mb-4">
        <Link href="/sessions" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sessions
        </Link>
      </div>

      <PageHeader
        title={`Session Review: ${session.session_id}`}
        description={`Driver: ${session.driver?.full_name || "Unassigned"} | Started: ${new Date(session.start_time).toLocaleString()}`}
        action={
          <div className="flex items-center gap-2">
            <a
              href={api.getPdfUrl(session.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button size="md" variant="primary">
                <Download className="w-4 h-4 mr-2" /> Download Safety PDF
              </Button>
            </a>
          </div>
        }
      />

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-surface-card border border-border">
          <span className="text-[10px] font-mono uppercase text-slate-400">Duration</span>
          <div className="text-xl font-bold font-mono text-slate-100 mt-1">
            {Math.round(session.duration_seconds / 60)} minutes
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-border">
          <span className="text-[10px] font-mono uppercase text-slate-400">Avg / Peak Risk</span>
          <div className="text-xl font-bold font-mono text-slate-100 mt-1">
            {session.avg_risk_score} / <strong className="text-red-400">{session.max_risk_score}</strong>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-border">
          <span className="text-[10px] font-mono uppercase text-slate-400">Total Safety Events</span>
          <div className="text-xl font-bold font-mono text-slate-100 mt-1">
            {session.total_events} ({session.high_risk_events} Critical)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-border">
          <span className="text-[10px] font-mono uppercase text-slate-400">Compliance Rating</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-emerald-400">{session.safety_rating}</span>
            <Badge variant="low">{session.status}</Badge>
          </div>
        </div>
      </div>

      {/* Risk Chart Over Session Duration */}
      {riskTimelineData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              <span>Session Risk Trajectory</span>
              <span className="text-xs font-mono text-slate-400">Continuous Evaluation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskTrendChart data={riskTimelineData} height={240} />
          </CardContent>
        </Card>
      )}

      {/* Chronological Event Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Chronological Event Timeline</span>
            </div>
            <span className="text-xs font-mono text-slate-400">{sortedEvents.length} Events Recorded</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedEvents.length > 0 ? (
            <div className="relative border-l border-slate-700/80 ml-4 space-y-6 py-2">
              {sortedEvents.map((ev, index) => {
                const Icon = getEventIcon(ev.event_type);
                const timeStr = new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return (
                  <div key={ev.id || index} className="relative pl-6">
                    {/* Timeline Node dot */}
                    <div className={`absolute -left-2.5 top-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] ${
                      ev.severity === "critical"
                        ? "bg-red-500 text-white"
                        : ev.severity === "high"
                        ? "bg-orange-500 text-white"
                        : ev.severity === "warning"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-blue-500 text-white"
                    }`}>
                      <Icon className="w-2.5 h-2.5" />
                    </div>

                    {/* Timeline Content */}
                    <div className="p-3.5 rounded-lg bg-surface border border-border/80 hover:border-slate-700 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-400">{timeStr}</span>
                          <span className="text-xs font-semibold text-slate-200 capitalize">
                            {ev.event_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <Badge variant={ev.severity as any} size="sm">
                          {ev.severity}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap gap-4 mt-2 font-mono">
                        {ev.duration_seconds > 0 && (
                          <span>Duration: <strong className="text-slate-300">{ev.duration_seconds}s</strong></span>
                        )}
                        <span>Confidence: <strong className="text-slate-300">{Math.round(ev.confidence * 100)}%</strong></span>
                        {ev.details && Object.entries(ev.details).map(([k, v]) => (
                          <span key={k}>{k}: <strong className="text-slate-300">{String(v)}</strong></span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
              <span>Clean driving session. No anomalies logged during this trip.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
