"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Brain,
  Clock,
  Moon,
  Smartphone,
  Eye,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Info
} from "lucide-react";

export default function DriverDigitalTwinPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = parseInt(params.id as string, 10);

  const [twin, setTwin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getDriverDigitalTwin(driverId)
      .then((data) => {
        setTwin(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Error fetching digital twin:", err);
        setError("Failed to load driver behavioral baseline.");
      })
      .finally(() => setLoading(false));
  }, [driverId]);

  return (
    <DashboardLayout>
      <div className="mb-4">
        <Link
          href={`/drivers/${driverId}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Driver Profile
        </Link>
      </div>

      <PageHeader
        title={`Behavioral Digital Twin: ${twin?.driver_name || "Driver"}`}
        description="Personalized longitudinal safety baseline, circadian fatigue vulnerabilities, and behavioral distraction propensities."
        action={
          twin?.status === "CALIBRATED" ? (
            <Badge variant="low" className="font-mono text-xs px-3 py-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              CALIBRATED ({twin.sessions_analyzed} TRIPS)
            </Badge>
          ) : (
            <Badge variant="moderate" className="font-mono text-xs px-3 py-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              STATUS: {twin?.status || "PENDING"}
            </Badge>
          )
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : error ? (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="p-6 text-center text-red-300">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="font-semibold">{error}</p>
          </CardContent>
        </Card>
      ) : twin?.status === "INSUFFICIENT_HISTORICAL_DATA" ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-8 text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Insufficient Historical Baseline</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              SafeDrive AI strictly prohibits fabricating driver behavioral metrics. 
              To construct a mathematically calibrated behavioral digital twin, a minimum of 
              <span className="font-mono font-bold text-amber-400"> {twin.minimum_sessions_required} completed driving trips</span> is required.
            </p>
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs font-mono text-slate-400">
              Recorded sessions for this driver: <span className="text-white font-bold">{twin.sessions_found}</span> / {twin.minimum_sessions_required}
            </div>
            <div className="pt-2">
              <Button onClick={() => router.push("/sessions")} variant="secondary">
                View Fleet Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Key Baseline Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>BASELINE ATTENTION</span>
                  <Brain className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {twin?.baseline?.baseline_attention_score} / 100
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Historical average attention level
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>MEAN RISK SCORE</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {twin?.baseline?.mean_risk_score}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Across {twin?.total_driving_hours} recorded hours
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>SAFETY TREND</span>
                  {twin?.baseline?.trend === "IMPROVING" ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : twin?.baseline?.trend === "DEGRADING" ? (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  ) : (
                    <Activity className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="text-2xl font-bold font-mono text-white flex items-center gap-2">
                  <span>{twin?.baseline?.trend}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Risk delta: {twin?.baseline?.trend_delta > 0 ? `+${twin?.baseline?.trend_delta}` : twin?.baseline?.trend_delta}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>NIGHT RISK FACTOR</span>
                  <Moon className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {twin?.baseline?.circadian_profile?.night_risk_multiplier}x
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Night vs day incident multiplier
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Behavioral Rates & Propensities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span>Hourly Behavioral Incident Baselines</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">Events / Driving Hour</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">Drowsiness &amp; Eye Closures</div>
                        <div className="text-xs text-slate-400">Propensity: <span className="font-mono text-amber-300">{twin?.baseline?.propensities?.fatigue}</span></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-white">{twin?.baseline?.rates_per_hour?.drowsiness}</div>
                      <div className="text-[10px] text-slate-500 uppercase">per hour</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">Gaze / Head Distraction</div>
                        <div className="text-xs text-slate-400">Susceptibility: <span className="font-mono text-blue-300">{twin?.baseline?.propensities?.distraction}</span></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-white">{twin?.baseline?.rates_per_hour?.distraction}</div>
                      <div className="text-[10px] text-slate-500 uppercase">per hour</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-purple-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">Mobile Device Interaction</div>
                        <div className="text-xs text-slate-400">Risk rating: <span className="font-mono text-purple-300">{twin?.baseline?.propensities?.phone}</span></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-white">{twin?.baseline?.rates_per_hour?.phone_interaction}</div>
                      <div className="text-[10px] text-slate-500 uppercase">per hour</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">Yawning Episodes</div>
                        <div className="text-xs text-slate-400">Early fatigue precursor indicator</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-white">{twin?.baseline?.rates_per_hour?.yawning}</div>
                      <div className="text-[10px] text-slate-500 uppercase">per hour</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-purple-400" />
                    <span>Circadian Vulnerability Distribution</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">24-Hour Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-slate-400">
                  Incident frequency across the 24-hour day based on recorded event timestamps.
                </p>

                {/* 24 hour bar chart */}
                <div className="grid grid-cols-12 gap-1.5 pt-4">
                  {twin?.baseline?.circadian_profile?.hourly_event_histogram?.slice(0, 12).map((cnt: number, i: number) => {
                    const maxVal = Math.max(...(twin?.baseline?.circadian_profile?.hourly_event_histogram || [1]), 1);
                    const heightPercent = Math.max(8, Math.round((cnt / maxVal) * 100));
                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="w-full bg-slate-800/80 rounded-t h-20 flex items-end">
                          <div
                            className={`w-full rounded-t ${cnt > 0 ? "bg-blue-500" : "bg-slate-700/30"}`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">{i}h</span>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-12 gap-1.5 pt-1">
                  {twin?.baseline?.circadian_profile?.hourly_event_histogram?.slice(12, 24).map((cnt: number, i: number) => {
                    const maxVal = Math.max(...(twin?.baseline?.circadian_profile?.hourly_event_histogram || [1]), 1);
                    const heightPercent = Math.max(8, Math.round((cnt / maxVal) * 100));
                    return (
                      <div key={i + 12} className="flex flex-col items-center gap-1">
                        <div className="w-full bg-slate-800/80 rounded-t h-20 flex items-end">
                          <div
                            className={`w-full rounded-t ${cnt > 0 ? "bg-purple-500" : "bg-slate-700/30"}`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">{i + 12}h</span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Peak vulnerability hours:</span>
                  <span className="font-mono text-white font-semibold">
                    {twin?.baseline?.circadian_profile?.peak_vulnerability_hours?.length > 0
                      ? twin.baseline.circadian_profile.peak_vulnerability_hours.map((h: number) => `${h}:00`).join(", ")
                      : "Uniform"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400 flex items-center justify-between font-mono">
            <span>DATA SOURCE: {twin?.data_source}</span>
            <span>CALIBRATED: {new Date(twin?.calibrated_at).toLocaleString()}</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
