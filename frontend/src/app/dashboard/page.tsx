"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { RiskTrendChart } from "@/components/charts/RiskTrendChart";
import { EventDistributionChart } from "@/components/charts/EventDistributionChart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { OverviewAnalytics, AlertItem } from "@/types";
import {
  Users,
  Video,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  TrendingUp,
  Award,
  ArrowRight,
  Sparkles,
  Smartphone,
  Eye,
  Activity,
  RefreshCw,
} from "lucide-react";

const FALLBACK_DASHBOARD_DATA: OverviewAnalytics = {
  overview: {
    total_drivers: 6,
    active_drivers: 4,
    total_sessions: 28,
    total_driving_hours: 42.5,
    current_active_sessions: 3,
    total_safety_events: 18,
    high_risk_events: 2,
    average_risk_score: 24.8,
    safety_trend_percentage: -5.4,
  },
  event_distribution: [
    { category: "Focused Gaze", count: 82, percentage: 65.6 },
    { category: "Head Distraction", count: 24, percentage: 19.2 },
    { category: "Early Fatigue", count: 12, percentage: 9.6 },
    { category: "Phone Interaction", count: 7, percentage: 5.6 },
  ],
  risk_trend: [
    { timestamp: "08:00", risk_score: 18 },
    { timestamp: "09:00", risk_score: 22 },
    { timestamp: "10:00", risk_score: 31 },
    { timestamp: "11:00", risk_score: 25 },
    { timestamp: "12:00", risk_score: 42 },
    { timestamp: "13:00", risk_score: 38 },
    { timestamp: "14:00", risk_score: 24 },
    { timestamp: "15:00", risk_score: 29 },
  ],
  driver_rankings: [
    { id: 1, driver_code: "DRV-1001", full_name: "John Doe", safety_score: 96.5, total_events: 3, rating: "A+" },
    { id: 2, driver_code: "DRV-1002", full_name: "Sarah Jenkins", safety_score: 92.0, total_events: 5, rating: "A" },
    { id: 3, driver_code: "DRV-1003", full_name: "Carlos Rivera", safety_score: 88.4, total_events: 8, rating: "B+" },
    { id: 4, driver_code: "DRV-1004", full_name: "Emma Watson", safety_score: 79.2, total_events: 14, rating: "C" },
  ],
  drowsiness_trend: [],
  distraction_trend: [],
  phone_use_trend: [],
};

const FALLBACK_ALERTS: AlertItem[] = [
  {
    id: 1,
    session_id: 1,
    alert_type: "DROWSINESS_SUSPECTED",
    severity: "warning",
    title: "Microsleep Warning",
    message: "Driver John Doe exhibited prolonged eyelid closure exceeding 1.2s on Highway 101 corridor.",
    sound_alert: true,
    is_acknowledged: false,
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 2,
    session_id: 2,
    alert_type: "PHONE_DISTRACTION",
    severity: "high",
    title: "Handheld Phone Divergence",
    message: "Smart phone interaction detected with diverted gaze for 3.4 seconds while vehicle traveling at 74 km/h.",
    sound_alert: true,
    is_acknowledged: true,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
];

export default function DashboardPage() {
  const [data, setData] = useState<OverviewAnalytics | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const loadDashboardData = () => {
    setLoading(true);
    Promise.all([api.getAnalyticsOverview(), api.getAlerts({ limit: 6 })])
      .then(([analyticsRes, alertsRes]) => {
        setData(analyticsRes);
        setAlerts(alertsRes);
        setIsOffline(false);
      })
      .catch((err) => {
        console.warn("Backend not responding, using resilient fallback telemetry:", err);
        setData(FALLBACK_DASHBOARD_DATA);
        setAlerts(FALLBACK_ALERTS);
        setIsOffline(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentData = data || FALLBACK_DASHBOARD_DATA;
  const { overview, event_distribution, risk_trend, driver_rankings } = currentData;

  return (
    <DashboardLayout>
      <PageHeader
        title="Fleet Safety Command Center"
        description="Real-time telematics, multi-signal driver anomaly indicators, and safety rankings."
        action={
          <div className="flex items-center gap-2">
            {isOffline && (
              <button
                onClick={loadDashboardData}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                title="Retry connecting to live FastAPI backend"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Live Sync</span>
              </button>
            )}
            <Link href="/live-monitor">
              <Button size="md" variant="primary">
                <Video className="w-4 h-4 mr-2" /> Open Live Monitor
              </Button>
            </Link>
          </div>
        }
      />

      {isOffline && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="font-semibold text-amber-200">Interactive Simulation Mode Active</div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                FastAPI backend at <code className="text-amber-300 font-mono">http://127.0.0.1:8000</code> is offline or starting up. Showing fully interactive demo fleet telemetry.
              </div>
            </div>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono font-medium text-xs transition-colors self-start sm:self-auto shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Connect Live DB</span>
          </button>
        </div>
      )}

      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Drivers"
          value={overview.total_drivers}
          subtitle={`${overview.active_drivers} active on duty`}
          icon={Users}
          highlightColor="blue"
        />
        <StatCard
          title="Driving Hours"
          value={`${overview.total_driving_hours}h`}
          subtitle={`${overview.total_sessions} logged missions`}
          icon={Clock}
          highlightColor="purple"
        />
        <StatCard
          title="Avg Safety Risk"
          value={`${overview.average_risk_score} / 100`}
          subtitle="Nominal fleet condition"
          icon={Gauge}
          trend={{ value: "-4.2% lower", positive: true }}
          highlightColor={overview.average_risk_score > 60 ? "red" : overview.average_risk_score > 35 ? "amber" : "emerald"}
        />
        <StatCard
          title="High Risk Hazards"
          value={overview.high_risk_events}
          subtitle={`${overview.total_safety_events} total anomalies`}
          icon={ShieldAlert}
          highlightColor={overview.high_risk_events > 0 ? "red" : "emerald"}
        />
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Risk Score Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <span>Fleet Risk Index Over Time</span>
              <span className="text-xs font-mono text-slate-400">Sampled Telemetry</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskTrendChart data={risk_trend} height={280} />
          </CardContent>
        </Card>

        {/* Events By Category */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span>Incident Breakdown</span>
              <span className="text-xs font-mono text-slate-400">By Hazard Type</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EventDistributionChart data={event_distribution} height={280} />
          </CardContent>
        </Card>
      </div>

      {/* Secondary Row: Driver Rankings & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Driver Safety Leaderboard */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Driver Safety Ranking</span>
              </div>
              <Link href="/drivers" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-border text-slate-400 font-mono">
                  <tr>
                    <th className="px-5 py-3">Rank</th>
                    <th className="px-5 py-3">Driver</th>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Safety Score</th>
                    <th className="px-5 py-3">Incidents</th>
                    <th className="px-5 py-3">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {driver_rankings.map((d, index) => (
                    <tr key={d.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-slate-400">#{index + 1}</td>
                      <td className="px-5 py-3 font-medium text-slate-200">
                        <Link href={`/drivers/${d.id}`} className="hover:text-blue-400">
                          {d.full_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-400">{d.driver_code}</td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-200">
                        {d.safety_score.toFixed(1)}%
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-400">{d.total_events}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          d.rating.startsWith("A")
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : d.rating.startsWith("B")
                            ? "bg-blue-950 text-blue-400 border border-blue-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}>
                          {d.rating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts Feed */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Recent Safety Alerts</span>
              </div>
              <Link href="/events" className="text-xs text-blue-400 hover:text-blue-300">
                All
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((al) => (
                <div
                  key={al.id}
                  className="p-3 rounded-lg bg-surface border border-border/80 flex flex-col gap-1 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{al.title}</span>
                    <Badge variant={al.severity as any} size="sm">
                      {al.severity}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{al.message}</p>
                  <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-slate-500">
                    <span>{new Date(al.created_at).toLocaleTimeString()}</span>
                    <span>{al.is_acknowledged ? "Acknowledged" : "Action Required"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-4 text-center">No alerts logged in current corridor.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
