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
  ArrowRight,
  GitBranch,
  GitCommit,
  AlertTriangle,
  Clock,
  Activity,
  ShieldAlert,
  Smartphone,
  Eye,
  Compass,
  CheckCircle2,
  Info
} from "lucide-react";

export default function SessionEventGraphPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getSessionEventGraph(sessionId)
      .then((data) => {
        setGraphData(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Error fetching event graph:", err);
        setError("Unable to load session temporal causal graph.");
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const getNodeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("phone")) return <Smartphone className="w-4 h-4 text-purple-400" />;
    if (t.includes("drowsiness") || t.includes("eye")) return <Eye className="w-4 h-4 text-red-400" />;
    if (t.includes("distraction")) return <Compass className="w-4 h-4 text-amber-400" />;
    if (t.includes("restored")) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    return <AlertTriangle className="w-4 h-4 text-blue-400" />;
  };

  const getSeverityBadgeVariant = (sev: string): "critical" | "high" | "moderate" | "low" | "gray" => {
    switch (sev.toLowerCase()) {
      case "critical": return "critical";
      case "high": return "high";
      case "warning": return "moderate";
      case "info": return "low";
      default: return "gray";
    }
  };

  const getRelationBadgeStyle = (rel: string) => {
    switch (rel) {
      case "CONTRIBUTED_TO":
        return "bg-red-500/20 text-red-300 border-red-500/40";
      case "ESCALATED":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "CO_OCCURRED":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "RECOVERED_AFTER":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <Link
          href={`/sessions/${sessionId}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Session Review
        </Link>
      </div>

      <PageHeader
        title={`Safety Event Causal Graph: ${graphData?.session_id || sessionId}`}
        description="Temporal Directed Acyclic Graph (DAG) reconstructing incident evolution, precursor events, and causal escalation pathways."
        action={
          <div className="flex items-center gap-2">
            <Badge variant="low" className="font-mono text-xs px-3 py-1 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              {graphData?.summary?.total_nodes || 0} NODES / {graphData?.summary?.total_edges || 0} EDGES
            </Badge>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : error ? (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="p-6 text-center text-red-300">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="font-semibold">{error}</p>
          </CardContent>
        </Card>
      ) : graphData?.nodes?.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-12 text-center max-w-md mx-auto space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">No Safety Hazards Recorded</h3>
            <p className="text-xs text-slate-400">
              This driving trip completed with zero detected drowsiness, distraction, or behavioral safety anomalies.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-4">
                <span className="text-[11px] font-mono text-slate-400 uppercase">Incident Nodes</span>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {graphData.summary.total_nodes}
                </div>
                <span className="text-[10px] text-slate-500">Flagged hazard detections</span>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-4">
                <span className="text-[11px] font-mono text-slate-400 uppercase">Causal / Temporal Edges</span>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {graphData.summary.total_edges}
                </div>
                <span className="text-[10px] text-slate-500">Temporal associations (&le; 45s)</span>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-4">
                <span className="text-[11px] font-mono text-slate-400 uppercase">Escalation Chains</span>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {graphData.summary.causal_chains_count}
                </div>
                <span className="text-[10px] text-slate-500">Contributory or escalating sequences</span>
              </CardContent>
            </Card>
          </div>

          {/* Critical Causal Escalation Callouts */}
          {graphData.causal_chains && graphData.causal_chains.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Identified Incident Escalation Chains</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">Temporal Multi-Factor Causality</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {graphData.causal_chains.map((chain: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-white uppercase">{chain.source}</span>
                      <Badge variant={getSeverityBadgeVariant(chain.source_severity)} className="text-[10px] uppercase">
                        {chain.source_severity}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] font-bold uppercase bg-amber-500/10 text-amber-400 border-amber-500/30">
                      <span>{chain.relationship}</span>
                      <span>(+{chain.time_delta}s)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-white uppercase">{chain.target}</span>
                      <Badge variant={getSeverityBadgeVariant(chain.target_severity)} className="text-[10px] uppercase">
                        {chain.target_severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Interactive Sequential Directed Graph Flow */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-blue-400" />
                  <span>Causal Graph Node Timeline</span>
                </div>
                <span className="text-xs font-mono text-slate-500">Chronological DAG Sequence</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {graphData.nodes.map((node: any, idx: number) => {
                  const outgoing = (graphData.edges || []).filter((e: any) => e.source === node.id);

                  return (
                    <div key={node.id} className="relative pl-6 pb-4 border-l border-slate-800 last:border-0 last:pb-0">
                      {/* Node Bullet */}
                      <div className="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      </div>

                      {/* Node Card */}
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {getNodeIcon(node.node_type)}
                            <span className="font-semibold text-sm text-white font-mono uppercase">
                              {node.node_type.replace(/_/g, " ")}
                            </span>
                            <Badge variant={getSeverityBadgeVariant(node.severity)} className="text-[10px] uppercase font-mono">
                              {node.severity}
                            </Badge>
                          </div>
                          <span className="text-xs font-mono text-slate-500">
                            {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        {/* Node Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                          <span>Confidence: {Math.round(node.confidence * 100)}%</span>
                          {node.metadata?.duration_sec > 0 && (
                            <span>Duration: {node.metadata.duration_sec}s</span>
                          )}
                          {node.metadata?.risk_contribution > 0 && (
                            <span className="text-amber-400">Risk Contribution: +{node.metadata.risk_contribution}</span>
                          )}
                        </div>

                        {/* Outgoing Causal Edges */}
                        {outgoing.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">Causal Edges:</span>
                            <div className="flex flex-wrap gap-2">
                              {outgoing.map((edge: any) => {
                                const targetNode = graphData.nodes.find((n: any) => n.id === edge.target);
                                return (
                                  <div
                                    key={edge.id}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono ${getRelationBadgeStyle(edge.relationship)}`}
                                  >
                                    <span>{edge.relationship}</span>
                                    <span className="text-[10px] opacity-80">(+{edge.time_delta_seconds}s)</span>
                                    <ArrowRight className="w-3 h-3" />
                                    <span className="font-semibold text-white uppercase">{targetNode?.node_type.replace(/_/g, " ")}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
