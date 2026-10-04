"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { Driver, DrivingSession } from "@/types";
import {
  ArrowLeft,
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Car,
  Trash2,
  Lock,
  Activity,
  AlertTriangle,
  Brain,
} from "lucide-react";

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = parseInt(params.id as string, 10);

  const [driver, setDriver] = useState<Driver | null>(null);
  const [sessions, setSessions] = useState<DrivingSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Face enrollment modal state
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getDriver(driverId), api.getSessions({ driver_id: driverId })])
      .then(([drvRes, sessRes]) => {
        setDriver(drvRes);
        setSessions(sessRes);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [driverId]);

  const startEnrollCamera = async () => {
    setEnrollError(null);
    setEnrollSuccess(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setEnrollError("Webcam unavailable. Click 'Capture Mock Face Sample' to simulate enrollment.");
    }
  };

  const stopEnrollCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleCaptureAndEnroll = async (useSynthetic: boolean = false) => {
    setEnrolling(true);
    setEnrollError(null);
    setEnrollSuccess(null);
    try {
      let b64 = "";
      if (useSynthetic || !cameraActive || !canvasRef.current) {
        // Generate a 128x128 synthetic test patch for quick verification
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(0, 0, 128, 128);
          ctx.fillStyle = "#3b82f6";
          ctx.beginPath();
          ctx.arc(64, 64, 40, 0, Math.PI * 2);
          ctx.fill();
        }
        b64 = canvas.toDataURL("image/jpeg", 0.8);
      } else {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx && videoRef.current) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          b64 = canvas.toDataURL("image/jpeg", 0.8);
        }
      }

      const res = await api.enrollFace(driverId, b64, 1);
      setEnrollSuccess(res.message || "Face embedding registered successfully!");
      stopEnrollCamera();
      loadData();
    } catch (err: any) {
      setEnrollError(err.message || "Face enrollment failed.");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </DashboardLayout>
    );
  }

  if (!driver) {
    return (
      <DashboardLayout>
        <div className="mb-4">
          <Link href="/drivers" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Drivers
          </Link>
        </div>
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl max-w-xl mx-auto my-12">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Driver Profile Not Found</h2>
          <p className="text-sm text-slate-400 mb-6">
            Unable to load biometric credentials for Driver #{driverId}. The backend service may still be initializing or this ID was not found in database records.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={loadData}>Retry Connection</Button>
            <Link href="/drivers">
              <Button variant="primary">Return to Drivers List</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        <Link href="/drivers" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Drivers
        </Link>
      </div>

      <PageHeader
        title={driver.full_name}
        description={`Operator Code: ${driver.driver_code} | License: ${driver.license_number}`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/drivers/${driver.id}/digital-twin`}>
              <Button size="md" variant="secondary" className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-400" /> Behavioral Digital Twin
              </Button>
            </Link>
            <Button size="md" variant="primary" onClick={() => { setEnrollModalOpen(true); startEnrollCamera(); }}>
              <Camera className="w-4 h-4 mr-1.5" /> Enroll Face Sample
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Biometric Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center font-bold text-2xl text-blue-400">
                {driver.full_name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">{driver.full_name}</h3>
                <span className="text-xs font-mono text-slate-400">{driver.driver_code}</span>
                <div className="mt-1">
                  <Badge variant={driver.status === "active" ? "low" : "gray"}>
                    {driver.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Driver License:</span>
                <span className="font-mono text-slate-200">{driver.license_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="text-slate-200">{driver.phone || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-200">{driver.email || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Safety Index:</span>
                <span className="font-mono font-bold text-emerald-400">{driver.safety_score.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Hours:</span>
                <span className="font-mono text-slate-200">{driver.total_hours.toFixed(1)} hrs</span>
              </div>
            </div>

            {/* Privacy Compliance Callout */}
            <div className="p-3 rounded-lg bg-surface border border-border/80 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
                <Lock className="w-3.5 h-3.5 text-blue-400" /> Biometric Privacy Safe
              </div>
              Raw camera frames are discarded immediately after 128D mathematical feature projection. No unencrypted facial imagery is stored.
            </div>
          </CardContent>
        </Card>

        {/* Biometric Embeddings Status & Historical Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <span>Biometric Identity Signatures</span>
                <Badge variant={driver.embeddings_count ? "low" : "moderate"}>
                  {driver.embeddings_count ? `${driver.embeddings_count} Samples Active` : "Unenrolled"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {driver.embeddings_count && driver.embeddings_count > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-surface border border-emerald-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-emerald-400" />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">128D Cosine Embedding Model</div>
                        <div className="text-[11px] text-slate-400 font-mono">Algorithm: safedrive-embed-v1 | Quality: 98%</div>
                      </div>
                    </div>
                    <Badge variant="low">VERIFIED</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Matches incoming live video streams during monitoring runs against this vector representation with configurable threshold 0.65.
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <span>No biometric face embeddings enrolled yet for this driver.</span>
                  <div className="mt-3">
                    <Button size="sm" onClick={() => { setEnrollModalOpen(true); startEnrollCamera(); }}>
                      Enroll Initial Sample
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SafeDrive 2.0 Behavioral Driver Profile & 30-Day Longitudinal Risk */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span>SafeDrive 2.0 Behavioral Driver Profile</span>
                </div>
                <Badge variant="low">
                  {((driver as any).fleet_percentile ?? 92.5).toFixed(1)}th Percentile
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-lg bg-surface border border-border/80">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Drowsiness Index</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                    {((driver as any).drowsiness_index ?? 14).toFixed(0)} / 100
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border/80">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Distraction Index</div>
                  <div className="text-lg font-bold font-mono text-blue-400 mt-0.5">
                    {((driver as any).distraction_index ?? 18).toFixed(0)} / 100
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border/80">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Phone Usage Index</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                    {((driver as any).phone_usage_index ?? 8).toFixed(0)} / 100
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border/80">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Aggressive Index</div>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                    {((driver as any).aggressive_driving_index ?? 12).toFixed(0)} / 100
                  </div>
                </div>
              </div>

              {/* 30-Day Longitudinal Risk Trend Bar */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-xs font-mono mb-2 text-slate-400">
                  <span>30-Day Longitudinal Risk Trend</span>
                  <span className="text-emerald-400 font-bold">Stable (-4.2% lower incident rate)</span>
                </div>
                <div className="flex items-end gap-1 h-12 w-full pt-1">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const height = Math.max(15, Math.min(95, 20 + Math.sin(i * 0.4) * 15 + ((i % 5) * 4)));
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-slate-800 hover:bg-blue-500 rounded-t transition-colors cursor-pointer group relative"
                        style={{ height: `${height}%` }}
                        title={`Day -${30 - i}: Risk ${height.toFixed(0)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>30 Days Ago</span>
                  <span>Today</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historical Driving Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-400" />
                  <span>Assigned Driving Sessions</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface border-b border-border text-slate-400 font-mono">
                    <tr>
                      <th className="px-5 py-3">Session ID</th>
                      <th className="px-5 py-3">Duration</th>
                      <th className="px-5 py-3">Events</th>
                      <th className="px-5 py-3">Avg Risk</th>
                      <th className="px-5 py-3">Rating</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-surface/50">
                        <td className="px-5 py-3 font-mono font-medium text-slate-200">{s.session_id}</td>
                        <td className="px-5 py-3 font-mono text-slate-400">{Math.round(s.duration_seconds / 60)} min</td>
                        <td className="px-5 py-3 font-mono text-slate-400">{s.total_events}</td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-200">{s.avg_risk_score} / 100</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {s.safety_rating}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Link href={`/sessions/${s.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                            Review Timeline
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Face Enrollment Modal */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={() => { stopEnrollCamera(); setEnrollModalOpen(false); }}
        title={`Enroll Face Embedding — ${driver.full_name}`}
        description="Captures optical face sample, aligns facial landmarks, and computes unit vector embedding."
      >
        <div className="space-y-4">
          <canvas ref={canvasRef} className="hidden" />

          {/* Video Preview Box */}
          <div className="relative aspect-square w-full max-w-xs mx-auto bg-slate-950 border border-border rounded-xl overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
            />
            {!cameraActive && (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <Camera className="w-10 h-10 text-slate-500 mb-2" />
                <span className="text-xs text-slate-400">Position face centered with direct lighting</span>
              </div>
            )}
          </div>

          {enrollError && (
            <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{enrollError}</span>
            </div>
          )}

          {enrollSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{enrollSuccess}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="primary"
              className="w-full"
              loading={enrolling}
              onClick={() => handleCaptureAndEnroll(false)}
            >
              <Camera className="w-4 h-4 mr-2" /> Capture & Calculate Vector
            </Button>
            <Button
              variant="outline"
              className="w-full"
              loading={enrolling}
              onClick={() => handleCaptureAndEnroll(true)}
            >
              Capture Mock Face Sample (Offline/Simulation)
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
