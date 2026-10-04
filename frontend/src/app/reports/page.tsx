"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { DrivingSession, SafetyReport } from "@/types";
import { FileText, Download, CheckCircle2, ShieldAlert, Award, AlertCircle, FileCheck } from "lucide-react";

export default function ReportsPage() {
  const [sessions, setSessions] = useState<DrivingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.getSessions()
      .then((res) => {
        setSessions(res);
        if (res.length > 0) {
          // Default to canonical demo session or first session
          const demoSess = res.find((s) => s.session_id.includes("DEMO")) || res[0];
          setSelectedSessionId(demoSess.id);
          fetchReport(demoSess.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const fetchReport = (sessionId: number) => {
    setGenerating(true);
    api.generateReport(sessionId)
      .then((rep) => setReport(rep))
      .catch((err) => console.error(err))
      .finally(() => {
        setGenerating(false);
        setLoading(false);
      });
  };

  const handleSelectSession = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = parseInt(e.target.value, 10);
    setSelectedSessionId(sId);
    fetchReport(sId);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Fleet Safety Audit Reports"
        description="Certified engineering summaries, telemetry timelines, and downloadable forensic PDFs."
        action={
          selectedSessionId ? (
            <a
              href={api.getPdfUrl(selectedSessionId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button size="md" variant="primary">
                <Download className="w-4 h-4 mr-2" /> Download Executive PDF
              </Button>
            </a>
          ) : undefined
        }
      />

      {/* Session Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 p-4 rounded-xl bg-surface-card border border-border">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-slate-200">Select Session for Audit Generation:</span>
            <p className="text-[11px] text-slate-400">Pulls session telemetry, computed risk metrics, and hazard recommendations.</p>
          </div>
        </div>

        <select
          value={selectedSessionId || ""}
          onChange={handleSelectSession}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.session_id} — {s.driver?.full_name || "Driver"} ({Math.round(s.duration_seconds / 60)} min)
            </option>
          ))}
        </select>
      </div>

      {generating ? (
        <div className="p-12 text-center">
          <Skeleton className="h-96 w-full" />
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>1. Executive Summary</span>
                </div>
                <span className="text-xs font-mono text-slate-400">Report ID: {report.report_id}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300 leading-relaxed bg-surface/60 p-4 rounded-lg border border-border/60">
                {report.executive_summary}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400">Driver</span>
                  <div className="font-semibold text-sm text-slate-200 mt-0.5">{report.driver_information.name}</div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400">Duration</span>
                  <div className="font-mono text-sm text-slate-200 mt-0.5">{report.session_information.duration_minutes} min</div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400">Avg Risk Index</span>
                  <div className="font-mono text-sm font-bold text-slate-200 mt-0.5">
                    {report.risk_summary.average_risk_score} / 100
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400">Max Risk Peak</span>
                  <div className="font-mono text-sm font-bold text-red-400 mt-0.5">
                    {report.risk_summary.maximum_risk_score} / 100
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Telemetry Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Drowsiness Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Incidents:</span>
                  <strong className="text-slate-200">{report.drowsiness_analysis.total_events}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Closure:</span>
                  <strong className="text-slate-200">{report.drowsiness_analysis.max_closure_duration}s</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assessment:</span>
                  <span className="font-semibold text-amber-400">{report.drowsiness_analysis.assessment}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distraction Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Incidents:</span>
                  <strong className="text-slate-200">{report.distraction_analysis.total_events}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gaze Directions:</span>
                  <strong className="text-slate-200">{(report.distraction_analysis.directions_observed || []).join(", ") || "None"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assessment:</span>
                  <span className="font-semibold text-amber-400">{report.distraction_analysis.assessment}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Phone Usage Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Incidents:</span>
                  <strong className="text-slate-200">{report.phone_usage_analysis.total_events}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Interaction:</span>
                  <strong className="text-slate-200">{report.phone_usage_analysis.max_interaction_duration}s</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assessment:</span>
                  <span className="font-semibold text-red-400">{report.phone_usage_analysis.assessment}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-400" />
                  <span>Safety Recommendations</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 p-2.5 rounded-lg bg-surface border border-border/80">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Technical Notes / Legal Disclaimer */}
          <div className="p-4 rounded-xl bg-surface/40 border border-border/60 text-xs text-slate-500 space-y-1">
            <span className="font-semibold text-slate-400 block">Technical Notes & Compliance Disclaimer</span>
            <p>{report.technical_notes}</p>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-500">
          Select a session to generate executive audit report.
        </div>
      )}
    </DashboardLayout>
  );
}
