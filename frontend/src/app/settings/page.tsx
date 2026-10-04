"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { Sliders, ShieldCheck, Lock, Save, CheckCircle2, RotateCcw } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Thresholds state
  const [earThreshold, setEarThreshold] = useState(0.22);
  const [marThreshold, setMarThreshold] = useState(0.58);
  const [headYawThreshold, setHeadYawThreshold] = useState(25.0);
  const [phoneConfThreshold, setPhoneConfThreshold] = useState(0.50);
  const [cooldownDrowsiness, setCooldownDrowsiness] = useState(15);
  const [cooldownDistraction, setCooldownDistraction] = useState(10);
  const [biometricRawStorage, setBiometricRawStorage] = useState(false);

  useEffect(() => {
    api.getSettings()
      .then((settingsList) => {
        settingsList.forEach((s) => {
          if (s.key === "ear_threshold") setEarThreshold(Number(s.value));
          if (s.key === "mar_threshold") setMarThreshold(Number(s.value));
          if (s.key === "head_yaw_threshold") setHeadYawThreshold(Number(s.value));
          if (s.key === "phone_confidence_threshold") setPhoneConfThreshold(Number(s.value));
          if (s.key === "alert_cooldown_drowsiness") setCooldownDrowsiness(Number(s.value));
          if (s.key === "alert_cooldown_distraction") setCooldownDistraction(Number(s.value));
          if (s.key === "biometric_storage_enabled") setBiometricRawStorage(Boolean(s.value));
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await Promise.all([
        api.updateSetting("ear_threshold", earThreshold),
        api.updateSetting("mar_threshold", marThreshold),
        api.updateSetting("head_yaw_threshold", headYawThreshold),
        api.updateSetting("phone_confidence_threshold", phoneConfThreshold),
        api.updateSetting("alert_cooldown_drowsiness", cooldownDrowsiness),
        api.updateSetting("alert_cooldown_distraction", cooldownDistraction),
        api.updateSetting("biometric_storage_enabled", biometricRawStorage),
      ]);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update settings.");
    } finally {
      setSaving(false);
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

  return (
    <DashboardLayout>
      <PageHeader
        title="AI Inference Thresholds & Sensitivity Controls"
        description="Fine-tune computer vision parameters, event cooldowns, and biometric storage policies."
      />

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Computer Vision Sensitivity */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Facial Telemetry Sensitivity</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-200">Eye Aspect Ratio (EAR) Threshold</span>
                <span className="font-mono text-blue-400 font-bold">{earThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.32"
                step="0.01"
                value={earThreshold}
                onChange={(e) => setEarThreshold(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Values below this threshold indicate closed eyes. Default is 0.22.
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-200">Mouth Aspect Ratio (MAR) Threshold</span>
                <span className="font-mono text-blue-400 font-bold">{marThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.45"
                max="0.75"
                step="0.01"
                value={marThreshold}
                onChange={(e) => setMarThreshold(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Values above this threshold classify as yawn initiation. Default is 0.58.
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-200">Head Yaw Distraction Angle (Degrees)</span>
                <span className="font-mono text-blue-400 font-bold">{headYawThreshold.toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="15"
                max="45"
                step="1"
                value={headYawThreshold}
                onChange={(e) => setHeadYawThreshold(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Yaw deflection angle required to trigger LOOKING_LEFT or LOOKING_RIGHT event.
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-200">Phone Object Detection Confidence</span>
                <span className="font-mono text-blue-400 font-bold">{Math.round(phoneConfThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.80"
                step="0.05"
                value={phoneConfThreshold}
                onChange={(e) => setPhoneConfThreshold(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Alert Cooldowns */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span>Alert Anti-Fatigue Cooldowns (Seconds)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Drowsiness Repeat Cooldown</label>
              <input
                type="number"
                min="5"
                max="60"
                value={cooldownDrowsiness}
                onChange={(e) => setCooldownDrowsiness(parseInt(e.target.value, 10))}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Suppresses repeated buzzer tones during ongoing episode.</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Distraction Repeat Cooldown</label>
              <input
                type="number"
                min="5"
                max="60"
                value={cooldownDistraction}
                onChange={(e) => setCooldownDistraction(parseInt(e.target.value, 10))}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Seconds between head-turn warning sound triggers.</span>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Compliance Toggle */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Biometric Data & Video Retention Policy</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border/80">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Store Raw Biometric Video Clips</span>
                <span className="text-[11px] text-slate-400">
                  When disabled (recommended), frames are discarded after vectorization in volatile RAM.
                </span>
              </div>
              <input
                type="checkbox"
                checked={biometricRawStorage}
                onChange={(e) => setBiometricRawStorage(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Parameters saved successfully!
            </span>
          )}
          <div className="ml-auto">
            <Button type="submit" variant="primary" loading={saving}>
              <Save className="w-4 h-4 mr-2" /> Save AI Configuration
            </Button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
