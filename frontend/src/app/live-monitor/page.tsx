"use client";

import React, { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { VideoStreamCanvas } from "@/components/monitor/VideoStreamCanvas";
import { TelemetryHUD } from "@/components/monitor/TelemetryHUD";
import { RiskMeter } from "@/components/monitor/RiskMeter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAudioAlert } from "@/hooks/useAudioAlert";
import { Activity, Radio, Volume2, VolumeX, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

export default function LiveMonitorPage() {
  const { soundEnabled, setSoundEnabled, triggerAlertSound } = useAudioAlert();
  const [liveEventFeed, setLiveEventFeed] = useState<Array<any>>([]);

  const handleAlert = useCallback((alert: any) => {
    triggerAlertSound(alert.severity || "warning");
    setLiveEventFeed((prev) => [
      {
        ...alert,
        time: new Date().toLocaleTimeString(),
        id: Math.random().toString(),
      },
      ...prev.slice(0, 19),
    ]);
  }, [triggerAlertSound]);

  const { telemetry, isConnected, activeMode, sendFrame, switchMode } = useWebSocket({
    mode: "demo",
    onAlert: handleAlert,
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Real-Time Driver Monitoring Console"
        description="High-frequency telemetry stream with multi-signal event fusion, drowsiness tracking, and gaze estimation."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" /> Audio Alerts ON
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" /> Audio Muted
                </>
              )}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface font-mono text-xs">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              <span>{isConnected ? "WS CONNECTED" : "OFFLINE"}</span>
            </div>
          </div>
        }
      />

      {/* Main Grid: Stream & Telemetry HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left Column: Video Canvas & HUD (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <VideoStreamCanvas
            telemetry={telemetry}
            activeMode={activeMode}
            onSendFrame={sendFrame}
            onSwitchMode={switchMode}
          />

          <TelemetryHUD telemetry={telemetry} />
        </div>

        {/* Right Column: Risk Meter & Live Event Stream (5/4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <RiskMeter
            score={telemetry?.risk?.score || 18}
            category={telemetry?.risk?.category || "LOW"}
            contributors={telemetry?.risk?.contributors || []}
          />

          {/* Real-Time Live Safety Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>Real-Time Incident Stream</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Live Queue</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 max-h-[380px] overflow-y-auto">
              {liveEventFeed.length > 0 ? (
                liveEventFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-surface border border-border/80 flex items-start justify-between gap-3 text-xs animate-fade-in"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-slate-200">{item.title}</span>
                        <Badge variant={item.severity as any} size="sm">
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{item.message}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">{item.time}</span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500/40 mx-auto mb-2" />
                  <span>Monitoring driver telemetry. Anomalies will stream here instantly.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
