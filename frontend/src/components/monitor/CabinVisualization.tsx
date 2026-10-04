"use client";

import React from "react";
import { Eye, Navigation, AlertTriangle, ShieldCheck, Smartphone } from "lucide-react";

interface CabinVisualizationProps {
  telemetry: any;
}

export const CabinVisualization: React.FC<CabinVisualizationProps> = ({ telemetry }) => {
  const headPose = telemetry?.telemetry?.head_pose || { pitch: 0, yaw: 0, roll: 0, direction: "FOCUSED" };
  const attentionState = telemetry?.attention_state || "FOCUSED";
  const attentionScore = telemetry?.attention_score ?? 85;
  const isDistracted = attentionState.includes("DISTRACTED") || headPose.direction !== "FOCUSED";
  const phoneActive = telemetry?.phone_state === "CONFIRMED_PHONE_USAGE" || telemetry?.phone_state === "PHONE_DETECTED";
  const speed = telemetry?.vehicle_telemetry?.speed_kmh ?? 62.5;
  const hardBraking = telemetry?.vehicle_telemetry?.hard_braking ?? false;

  // Calculate gaze ray angle from yaw
  const yaw = headPose.yaw || 0;
  const pitch = headPose.pitch || 0;
  const rayAngle = Math.max(-50, Math.min(50, yaw));

  // Gaze target coordinates
  const originX = 160;
  const originY = 170;
  const rayLength = 95;
  const rad = ((rayAngle - 90) * Math.PI) / 180;
  const targetX = originX + rayLength * Math.cos(rad);
  const targetY = originY + rayLength * Math.sin(rad);

  const gazeColor = isDistracted ? "#ef4444" : attentionScore < 70 ? "#f59e0b" : "#10b981";

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 overflow-hidden relative shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            3D Cockpit Gaze & Telemetry Perspective
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          Isometric Model
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-3">
        {/* SVG Cabin Rendering (7 cols) */}
        <div className="md:col-span-7 flex justify-center relative">
          <svg
            viewBox="0 0 320 240"
            className="w-full max-w-[300px] h-auto drop-shadow-2xl select-none"
          >
            {/* Cabin Outer Shell / Windshield Wireframe */}
            <path
              d="M 40 40 L 280 40 L 305 210 L 15 210 Z"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="2"
              strokeDasharray="4 2"
            />

            {/* Windshield Glass Horizon */}
            <path
              d="M 55 55 L 265 55 L 285 110 L 35 110 Z"
              fill="#1e293b"
              fillOpacity="0.4"
              stroke="#475569"
              strokeWidth="1.5"
            />
            {/* Road Horizon lines */}
            <line x1="160" y1="55" x2="160" y2="105" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="120" y1="105" x2="80" y2="55" stroke="#64748b" strokeWidth="0.8" />
            <line x1="200" y1="105" x2="240" y2="55" stroke="#64748b" strokeWidth="0.8" />

            {/* Dashboard Arc */}
            <path
              d="M 30 115 Q 160 100 290 115 L 295 150 Q 160 140 25 150 Z"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Steering Wheel */}
            <ellipse
              cx="160"
              cy="145"
              rx="42"
              ry="26"
              fill="none"
              stroke="#64748b"
              strokeWidth="4"
            />
            <ellipse
              cx="160"
              cy="145"
              rx="15"
              ry="9"
              fill="#334155"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />

            {/* Driver Head (Top/Angled View) */}
            <circle
              cx={originX}
              cy={originY}
              r="22"
              fill="#1e293b"
              stroke={gazeColor}
              strokeWidth="2.5"
            />
            {/* Nose indicator */}
            <line
              x1={originX}
              y1={originY - 20}
              x2={originX + yaw * 0.4}
              y2={originY - 28}
              stroke={gazeColor}
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Gaze Ray Cone */}
            <line
              x1={originX}
              y1={originY - 15}
              x2={targetX}
              y2={targetY}
              stroke={gazeColor}
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <circle
              cx={targetX}
              cy={targetY}
              r="5"
              fill={gazeColor}
              className="animate-ping"
            />
            <circle
              cx={targetX}
              cy={targetY}
              r="3.5"
              fill={gazeColor}
            />

            {/* Camera Sensor Mount */}
            <rect
              x="148"
              y="32"
              width="24"
              height="10"
              rx="3"
              fill="#0ea5e9"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <circle cx="160" cy="37" r="2.5" fill="#ffffff" />
            <line x1="160" y1="42" x2={originX} y2={originY} stroke="#0ea5e9" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.4" />

            {/* Phone Detection in cabin */}
            {phoneActive && (
              <g transform="translate(195, 140)">
                <rect x="0" y="0" width="14" height="22" rx="2" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
                <circle cx="7" cy="18" r="1.5" fill="#ffffff" />
              </g>
            )}
          </svg>
        </div>

        {/* Real-Time Cabin Metrics & Gaze Vector (5 cols) */}
        <div className="md:col-span-5 space-y-3">
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Gaze Ray Divergence:</span>
              <span
                className="font-bold"
                style={{ color: gazeColor }}
              >
                {yaw.toFixed(1)}° ({headPose.direction.replace(/_/g, " ")})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Attention Score:</span>
              <span className="font-bold text-slate-100">{attentionScore.toFixed(0)} / 100</span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Vehicle Speed:</span>
              <span className="font-bold text-blue-400">{speed.toFixed(1)} km/h</span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Emergency Braking:</span>
              <span className={`font-bold ${hardBraking ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
                {hardBraking ? "BRAKE TRIGGERED" : "NORMAL"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono p-2 rounded bg-slate-900/50 border border-slate-800/80">
            {isDistracted ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className={isDistracted ? "text-red-300" : "text-emerald-300"}>
              {isDistracted
                ? "Gaze ray outside windshield primary field of view"
                : "Forward cone aligned with highway travel trajectory"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
