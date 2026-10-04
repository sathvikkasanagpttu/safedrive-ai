"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { User, UserRole } from "@/types";
import { Shield, Users, Cpu, Database, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadUsers = () => {
    setLoading(true);
    api.getAdminUsers()
      .then((res) => setUsers(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdatingId(userId);
    try {
      await api.updateUserRole(userId, newRole);
      loadUsers();
    } catch (err: any) {
      alert(err.message || "Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (user: User) => {
    setUpdatingId(user.id);
    try {
      await api.updateUserRole(user.id, user.role, !user.is_active);
      loadUsers();
    } catch (err: any) {
      alert(err.message || "Failed to update user status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="System Administration & Role-Based Access Control"
        description="Manage security roles, active operator credentials, and core infrastructure health."
      />

      {/* System Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-surface-card border border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-200">Database Engine</span>
            <span className="text-[11px] font-mono text-emerald-400 block">PostgreSQL / SQLAlchemy (Connected)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-200">Inference Runtime</span>
            <span className="text-[11px] font-mono text-blue-400 block">MediaPipe + YOLO Engine (Ready)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-200">Security Architecture</span>
            <span className="text-[11px] font-mono text-purple-400 block">JWT + Refresh Token Rotation</span>
          </div>
        </div>
      </div>

      {/* Operator Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Operator Directory & Assigned Roles</span>
            </div>
            <span className="text-xs font-mono text-slate-400">{users.length} Registered Accounts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-border text-slate-400 font-mono">
                  <tr>
                    <th className="px-5 py-3">Operator Name</th>
                    <th className="px-5 py-3">Email Address</th>
                    <th className="px-5 py-3">Assigned Role</th>
                    <th className="px-5 py-3">Account Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-200">{u.full_name}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{u.email}</td>
                      <td className="px-5 py-3">
                        <select
                          value={u.role}
                          disabled={updatingId === u.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-surface border border-border rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="admin">ADMIN</option>
                          <option value="safety_officer">SAFETY_OFFICER</option>
                          <option value="fleet_manager">FLEET_MANAGER</option>
                          <option value="viewer">VIEWER</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={u.is_active ? "low" : "critical"} size="sm">
                          {u.is_active ? "ACTIVE" : "DISABLED"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant={u.is_active ? "danger" : "outline"}
                          disabled={updatingId === u.id}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">No users found.</div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
