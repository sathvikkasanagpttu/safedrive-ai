"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { RiskTrendChart } from "@/components/charts/RiskTrendChart";
import { EventDistributionChart } from "@/components/charts/EventDistributionChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { OverviewAnalytics } from "@/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { BarChart3, TrendingUp, AlertTriangle, Eye, Smartphone, Compass } from "lucide-react";

const FALLBACK_ANALYTICS: OverviewAnalytics = {
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
  drowsiness_trend: [
    { hour: "06:00", count: 1 },
    { hour: "09:00", count: 3 },
    { hour: "12:00", count: 6 },
    { hour: "15:00", count: 8 },
    { hour: "18:00", count: 4 },
    { hour: "21:00", count: 9 },
  ],
  distraction_trend: [
    { hour: "06:00", count: 2 },
    { hour: "09:00", count: 5 },
    { hour: "12:00", count: 11 },
    { hour: "15:00", count: 14 },
    { hour: "18:00", count: 7 },
    { hour: "21:00", count: 5 },
  ],
  phone_use_trend: [
    { hour: "06:00", count: 0 },
    { hour: "09:00", count: 2 },
    { hour: "12:00", count: 4 },
    { hour: "15:00", count: 5 },
    { hour: "18:00", count: 3 },
    { hour: "21:00", count: 1 },
  ],
};

export default function AnalyticsPage() {
  const [data, setData] = useState<OverviewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalyticsOverview()
      .then((res) => setData(res))
      .catch((err) => {
        console.warn("Backend not responding, using fallback analytics:", err);
        setData(FALLBACK_ANALYTICS);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  const currentData = data || FALLBACK_ANALYTICS;

  return (
    <DashboardLayout>
      <PageHeader
        title="Fleet Safety Analytics & Behavioral Intelligence"
        description="Macro-level temporal trends, circadian fatigue peaks, and distraction gaze distribution."
      />

      <div className="space-y-6">
        {/* Top Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Continuous Risk Score Trajectory */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>Fleet Risk Evolution (Continuous)</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RiskTrendChart data={currentData.risk_trend} height={280} />
            </CardContent>
          </Card>

          {/* Incident Category Share */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span>Hazard Category Proportions</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EventDistributionChart data={currentData.event_distribution} height={280} />
            </CardContent>
          </Card>
        </div>

        {/* Behavioral Deep-Dives: Distraction & Drowsiness */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Head Distraction Directional Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>Distraction Vectors by Day</span>
                </div>
                <span className="text-xs font-mono text-slate-400">Gaze Directions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={currentData.distraction_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="looking_right" name="Looking Right (Mirror/Blindspot)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="looking_left" name="Looking Left" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="looking_down" name="Looking Down (High Hazard)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Phone Interaction Trend */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span>Mobile Device Interactions</span>
                </div>
                <span className="text-xs font-mono text-slate-400">Detected vs Confirmed</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={currentData.phone_use_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="detections" name="Device in Envelope" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="confirmed_usage" name="Confirmed Active Operation" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
