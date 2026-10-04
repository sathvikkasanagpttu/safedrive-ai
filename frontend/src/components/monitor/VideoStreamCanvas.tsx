"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Camera, Play, VideoOff, RefreshCw, AlertTriangle, Eye, ShieldAlert, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface VideoStreamCanvasProps {
  telemetry: any;
  activeMode: string;
  onSendFrame: (base64Image: string) => void;
  onSwitchMode: (mode: "demo" | "camera") => void;
}

export const VideoStreamCanvas: React.FC<VideoStreamCanvasProps> = ({
  telemetry,
  activeMode,
  onSendFrame,
  onSwitchMode,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        onSwitchMode("camera");

        // Periodically capture frame and send to WebSocket
        frameIntervalRef.current = setInterval(() => {
          if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx && videoRef.current.videoWidth > 0) {
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const b64 = canvas.toDataURL("image/jpeg", 0.7);
              onSendFrame(b64);
            }
          }
        }, 100); // 10 FPS transmission to avoid overwhelming client uplink
      }
    } catch (err: any) {
      setCameraError(err.message || "Failed to access webcam. Switching to high-fidelity Demo Mode.");
      setCameraActive(false);
      onSwitchMode("demo");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    setCameraActive(false);
    onSwitchMode("demo");
  };

  useEffect(() => {
    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Draw overlay bounding boxes and HUD on canvas
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!telemetry) return;

    const faceBox = telemetry.boxes?.face;
    const isDistracted = telemetry.attention_state?.includes("DISTRACTED");
    const isDrowsy = telemetry.drowsiness_state === "DROWSINESS" || telemetry.drowsiness_state === "ALERTED";
    const boxColor = isDrowsy ? "#ef4444" : isDistracted ? "#f59e0b" : "#10b981";

    if (faceBox) {
      // Draw Face Bounding Box
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = boxColor;
      ctx.strokeRect(faceBox.x, faceBox.y, faceBox.w, faceBox.h);

      // Label Pill
      ctx.fillStyle = boxColor;
      ctx.fillRect(faceBox.x, Math.max(0, faceBox.y - 24), 160, 24);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px JetBrains Mono, monospace";
      ctx.fillText(
        `${telemetry.driver?.name || "Driver"} (${Math.round((telemetry.driver?.confidence || 0.95) * 100)}%)`,
        faceBox.x + 6,
        Math.max(14, faceBox.y - 7)
      );

      // Gaze Direction Vector pointer
      const cx = faceBox.x + faceBox.w / 2;
      const cy = faceBox.y + faceBox.h / 2;
      const yaw = telemetry.telemetry?.head_pose?.yaw || 0;
      const pitch = telemetry.telemetry?.head_pose?.pitch || 0;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + yaw * 2, cy + pitch * 2);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw Phone Bounding Box if detected in simulated stream
    if (telemetry.phone_state?.includes("PHONE")) {
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(340, 270, 60, 100);
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(340, 246, 120, 24);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.fillText("PHONE DETECTED", 346, 262);
    }
  }, [telemetry]);

  return (
    <div className="relative bg-slate-950 border border-border rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Banner / Mode Bar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-border/80 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {activeMode === "DEMO MODE" ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> DEMO MODE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center gap-1">
              <Camera className="w-3 h-3 text-blue-400" /> LIVE CAMERA
            </span>
          )}
          <span className="text-xs text-slate-400 hidden sm:inline">
            {activeMode === "DEMO MODE"
              ? "Running deterministic 75s safety test simulation"
              : "Analyzing live optical stream"}
          </span>
        </div>

        {/* Mode controls */}
        <div className="flex items-center gap-2">
          {cameraActive ? (
            <Button size="sm" variant="danger" onClick={stopCamera}>
              <VideoOff className="w-3.5 h-3.5" /> Stop Camera
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={startCamera}>
              <Camera className="w-3.5 h-3.5" /> Start Webcam
            </Button>
          )}

          {activeMode !== "DEMO MODE" && (
            <Button size="sm" variant="outline" onClick={() => onSwitchMode("demo")}>
              Switch to Demo
            </Button>
          )}
        </div>
      </div>

      {/* Main Video / Synthetic Canvas Area */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Hidden processing canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live video element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
        />

        {/* Simulated driver visual backdrop in Demo Mode */}
        {!cameraActive && (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
            {/* Animated Synthetic Face Wireframe */}
            <div className="relative w-64 h-72 border-2 border-dashed border-blue-500/40 rounded-3xl flex flex-col items-center justify-center p-4 bg-blue-950/10 backdrop-blur-sm">
              <div className="w-24 h-24 rounded-full border-2 border-blue-400/60 flex items-center justify-center mb-3">
                <Eye className="w-10 h-10 text-blue-400 animate-pulse" />
              </div>
              <span className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-widest">
                {telemetry?.driver?.name || "John Doe (Demo)"}
              </span>
              <span className="font-mono text-[11px] text-emerald-400 mt-0.5">
                STATUS: {telemetry?.attention_state || "FOCUSED"}
              </span>

              {/* Dynamic simulation warning banner */}
              {telemetry?.alerts && telemetry.alerts.length > 0 && (
                <div className="mt-3 px-2 py-1 rounded bg-red-950/80 border border-red-800 text-[10px] font-mono text-red-300 animate-pulse">
                  {telemetry.alerts[0].title}
                </div>
              )}
            </div>

            {/* Clear prominent Demo Mode Watermark */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/70 border border-border text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>SIMULATION PLAYBACK: DEMO MODE</span>
            </div>
          </div>
        )}

        {/* Overlay Canvas for Bounding Boxes and Landmarks */}
        <canvas
          ref={overlayCanvasRef}
          width={640}
          height={360}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Camera Error banner */}
        {cameraError && (
          <div className="absolute top-4 inset-x-4 p-3 bg-red-950/90 border border-red-800 rounded-lg text-xs text-red-200 z-20 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              {cameraError}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setCameraError(null)}>Dismiss</Button>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Ticker */}
      <div className="px-4 py-2 bg-slate-900 border-t border-border/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span>FRAME: <strong className="text-slate-200">{telemetry?.frame_index || 0}</strong></span>
          <span>DRIVER: <strong className="text-blue-400">{telemetry?.driver?.name || "Demo Driver"}</strong></span>
          <span>ATTENTION: <strong className="text-emerald-400">{telemetry?.attention_state || "FOCUSED"}</strong></span>
        </div>
        <div>
          <span>RISK: <strong className="text-slate-200">{telemetry?.risk?.score || 18} / 100</strong></span>
        </div>
      </div>
    </div>
  );
};
