"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { PrivacySettings, Driver } from "@/types";
import {
  LockKeyhole,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Save,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
  FileText,
  KeyRound,
} from "lucide-react";

export default function PrivacyPage() {
  const [settings, setSettings] = useState<PrivacySettings>({
    video_retention_days: 7,
    telemetry_retention_days: 30,
    evidence_retention_days: 90,
    store_raw_biometrics: false,
    pseudonymize_exports: true,
    gdpr_compliance_mode: true,
  });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Purge modal state
  const [purgeTargetDriver, setPurgeTargetDriver] = useState<Driver | null>(null);
  const [purgeReason, setPurgeReason] = useState("GDPR Article 17 - Right to erasure request");
  const [purging, setPurging] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pSettings, dList] = await Promise.all([
        api.getPrivacySettings(),
        api.getDrivers(),
      ]);
      setSettings(pSettings);
      setDrivers(dList);
    } catch (err) {
      console.error("Failed to fetch privacy data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const updated = await api.updatePrivacySettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleConsent = async (driverId: number, currentConsent: boolean) => {
    try {
      await api.updateDriverBiometricConsent(driverId, !currentConsent);
      await fetchData();
    } catch (err: any) {
      alert(`Error updating consent: ${err.message}`);
    }
  };

  const handleConfirmPurge = async () => {
    if (!purgeTargetDriver) return;
    try {
      setPurging(true);
      await api.purgeDriverBiometrics(purgeTargetDriver.id, purgeReason);
      setPurgeTargetDriver(null);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to purge biometrics: ${err.message}`);
    } finally {
      setPurging(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Privacy & Biometrics Governance</h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              GDPR / CCPA / BIPA
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Zero-storage biometric policy, automated data retention enforcement, and GDPR Article 17 right-to-be-forgotten controls.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-medium flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Compliance Mode</div>
            <div className="text-lg font-bold font-mono text-emerald-400">ENFORCED</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">GDPR Article 17 active</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <LockKeyhole className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Biometric Storage</div>
            <div className="text-lg font-bold font-mono text-blue-400">
              {settings.store_raw_biometrics ? "ENABLED" : "ANONYMIZED ONLY"}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">128D projection hashes</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Retention Windows</div>
            <div className="text-lg font-bold font-mono text-slate-200">
              {settings.video_retention_days}d / {settings.telemetry_retention_days}d
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Video / Telematics</div>
          </div>
        </div>
      </div>

      {/* Retention Policies Form */}
      <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Automated Data Retention & Scrubbing</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure rolling expiration windows for evidence clips, video frames, and telemetry records.</p>
          </div>
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>Policies updated successfully</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-300">Raw Video Footage</span>
                <span className="font-mono text-blue-400 font-bold">{settings.video_retention_days} Days</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={settings.video_retention_days}
                onChange={(e) => setSettings({ ...settings, video_retention_days: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[11px] text-slate-500">Unflagged driving video frames purged automatically.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-300">CAN-Bus & Telemetry Logs</span>
                <span className="font-mono text-indigo-400 font-bold">{settings.telemetry_retention_days} Days</span>
              </div>
              <input
                type="range"
                min="7"
                max="90"
                value={settings.telemetry_retention_days}
                onChange={(e) => setSettings({ ...settings, telemetry_retention_days: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[11px] text-slate-500">Speed, braking, and head pose telemetry logs.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-300">Hazard Evidence Clips</span>
                <span className="font-mono text-purple-400 font-bold">{settings.evidence_retention_days} Days</span>
              </div>
              <input
                type="range"
                min="30"
                max="365"
                value={settings.evidence_retention_days}
                onChange={(e) => setSettings({ ...settings, evidence_retention_days: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <p className="text-[11px] text-slate-500">High & critical hazard verified evidence snapshots.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={settings.pseudonymize_exports}
                onChange={(e) => setSettings({ ...settings, pseudonymize_exports: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <div>
                <div className="text-xs font-semibold text-slate-200">Pseudonymize PDF Reports</div>
                <div className="text-[10px] text-slate-500">Mask PII in exported reports</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={settings.gdpr_compliance_mode}
                onChange={(e) => setSettings({ ...settings, gdpr_compliance_mode: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <div>
                <div className="text-xs font-semibold text-slate-200">Strict GDPR Enforcement</div>
                <div className="text-[10px] text-slate-500">Automatic consent check before recognition</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={settings.store_raw_biometrics}
                onChange={(e) => setSettings({ ...settings, store_raw_biometrics: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <div>
                <div className="text-xs font-semibold text-slate-200">Raw Face Photos Storage</div>
                <div className="text-[10px] text-amber-500">Disabled by default for compliance</div>
              </div>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? "Updating..." : "Save Privacy Policies"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Driver Biometric Consent & GDPR Right-to-Erasure Table */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Driver Biometric Consents & GDPR Article 17 Erasure
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">{drivers.length} drivers managed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">License / ID</th>
                <th className="py-3 px-4">Biometric Consent</th>
                <th className="py-3 px-4">Privacy Status</th>
                <th className="py-3 px-4">Face Embeddings</th>
                <th className="py-3 px-4 text-right">GDPR Right to Erasure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {drivers.map((d: any) => {
                const hasConsent = d.biometric_consent_given !== false;
                const isPurged = d.privacy_status === "PURGED_GDPR_17";

                return (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{d.full_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{d.driver_code}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {d.license_number}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleConsent(d.id, hasConsent)}
                        disabled={isPurged}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium transition-colors ${
                          hasConsent
                            ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800 hover:bg-emerald-900/60"
                            : "bg-red-950/70 text-red-400 border border-red-800 hover:bg-red-900/60"
                        } ${isPurged ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {hasConsent ? (
                          <>
                            <UserCheck className="w-3 h-3" /> CONSENTED
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" /> REVOKED
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isPurged
                            ? "bg-amber-950/70 text-amber-400 border border-amber-800"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {d.privacy_status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {isPurged ? "0 vectors (scrubbed)" : `${d.embeddings_count ?? 1} vectors (128D)`}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isPurged ? (
                        <span className="text-[11px] font-mono text-slate-500">Purge Complete</span>
                      ) : (
                        <button
                          onClick={() => setPurgeTargetDriver(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-800/80 text-xs font-medium transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Purge Biometrics</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* GDPR Article 17 Purge Confirmation Modal */}
      {purgeTargetDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-red-900/50 rounded-2xl shadow-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-bold text-slate-100 mb-1">
              GDPR Article 17: Right to Erasure
            </h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              You are about to irreversibly purge all biometric face embeddings and facial templates for driver{" "}
              <strong className="text-white font-semibold">{purgeTargetDriver.full_name}</strong> (
              <span className="font-mono text-red-300">{purgeTargetDriver.driver_code}</span>).
            </p>

            <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/40 text-[11px] text-red-300 mb-4">
              This action cannot be undone. All 128-dimensional biometric recognition vectors will be cryptographically erased from disk and PostgreSQL database tables.
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">Audit Trail Reason</label>
              <input
                type="text"
                value={purgeReason}
                onChange={(e) => setPurgeReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPurgeTargetDriver(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurge}
                disabled={purging}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors shadow-lg shadow-red-600/20"
              >
                {purging ? "Purging Biometrics..." : "Confirm GDPR Erasure"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
