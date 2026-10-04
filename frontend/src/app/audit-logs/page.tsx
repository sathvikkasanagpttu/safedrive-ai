"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { FileClock, ShieldCheck, Search, Filter } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");

  const loadLogs = () => {
    setLoading(true);
    api.getAuditLogs({ action: filterAction || undefined })
      .then((res) => setLogs(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, [filterAction]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Security & Compliance Audit Trail"
        description="Immutable record of system authentications, role changes, driver enrollments, and alert interventions."
      />

      <div className="flex items-center justify-between gap-4 mb-6">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-surface-card border border-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Security Actions</option>
          <option value="USER_LOGIN">USER_LOGIN</option>
          <option value="USER_REGISTERED">USER_REGISTERED</option>
          <option value="CREATE_DRIVER">CREATE_DRIVER</option>
          <option value="ENROLL_FACE">ENROLL_FACE</option>
          <option value="START_SESSION">START_SESSION</option>
          <option value="STOP_SESSION">STOP_SESSION</option>
          <option value="ACKNOWLEDGE_ALERT">ACKNOWLEDGE_ALERT</option>
          <option value="UPDATE_SYSTEM_SETTING">UPDATE_SYSTEM_SETTING</option>
        </select>

        <span className="text-xs font-mono text-slate-400">
          {logs.length} Audit Entries Logged
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-border text-slate-400 font-mono">
                  <tr>
                    <th className="px-5 py-3">Timestamp (UTC)</th>
                    <th className="px-5 py-3">Operator</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Resource Target</th>
                    <th className="px-5 py-3">Client IP</th>
                    <th className="px-5 py-3">Payload Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-300">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-200">{log.user_email}</td>
                      <td className="px-5 py-3 font-mono">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-950 text-blue-400 border border-blue-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-400">
                        {log.resource_type}:{log.resource_id}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-400">{log.ip_address}</td>
                      <td className="px-5 py-3 text-slate-400 max-w-xs truncate font-mono">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">No audit records found.</div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
