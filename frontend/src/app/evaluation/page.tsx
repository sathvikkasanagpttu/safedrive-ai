"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import {
  FlaskConical,
  Database,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Info,
  Scale
} from "lucide-react";

export default function EvaluationLabPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalSuccess, setEvalSuccess] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getEvaluationDatasets(), api.getEvaluationRuns()])
      .then(([ds, rn]) => {
        setDatasets(ds);
        setRuns(rn);
        if (rn.length > 0 && !selectedRun) {
          setSelectedRun(rn[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunEvaluation = async (datasetId: number, modelName: string) => {
    setEvaluating(true);
    setEvalSuccess(null);
    try {
      const res = await api.runModelEvaluation({
        dataset_id: datasetId,
        model_name: modelName,
      });
      setEvalSuccess(`Validation run for ${modelName} completed with accuracy: ${(res.accuracy * 100).toFixed(1)}%`);
      loadData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="AI Model Evaluation Lab"
        description="Standardized ground-truth benchmarking across public driver-safety datasets. Transparent validation with zero fabricated metrics."
        action={
          <div className="flex items-center gap-2">
            <Badge variant="low" className="font-mono text-xs px-3 py-1 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
              BENCHMARK LAB v3.0
            </Badge>
          </div>
        }
      />

      {/* Ground Truth Truthfulness Disclosure */}
      <div className="mb-6 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-start gap-3">
        <Scale className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-200 leading-relaxed">
          <strong>GROUND-TRUTH BENCHMARK VERIFICATION:</strong> Model accuracy, ROC-AUC, and latency scores are computed
          against standard academic validation splits (e.g., LFW View 2, NTHU-DDD evaluation partition). Any experimental or
          untested model is strictly identified as <span className="font-mono font-bold text-amber-300">NOT EVALUATED</span> to prevent metric hallucination.
        </div>
      </div>

      {evalSuccess && (
        <div className="mb-6 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{evalSuccess}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Ground Truth Datasets Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                Benchmark Datasets
              </h2>
              <span className="text-xs font-mono text-slate-500">{datasets.length} Datasets Active</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {datasets.map((ds) => (
                <Card key={ds.id} className="bg-slate-900/60 border-slate-800">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="gray" className="text-[10px] uppercase font-mono">
                        {ds.task_type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] font-mono text-slate-500">v{ds.version}</span>
                    </div>

                    <h3 className="font-bold text-sm text-white line-clamp-1">{ds.name}</h3>

                    <div className="space-y-1 text-xs text-slate-400 font-mono">
                      <div>Samples: <span className="text-white">{ds.sample_count?.toLocaleString()}</span></div>
                      <div className="text-[11px] text-slate-500 truncate">Split: {ds.split}</div>
                      <div className="text-[10px] text-slate-600 truncate">{ds.source}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Model Benchmark Runs Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-400" />
                  <span>Validated Model Benchmark Runs</span>
                </div>
                <span className="text-xs font-mono text-slate-500">Ground-Truth Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 font-mono uppercase text-slate-400">
                    <tr>
                      <th className="p-3">Model</th>
                      <th className="p-3">Benchmark Dataset</th>
                      <th className="p-3">Accuracy</th>
                      <th className="p-3">F1-Score</th>
                      <th className="p-3">Precision / Recall</th>
                      <th className="p-3">ROC-AUC</th>
                      <th className="p-3">Latency</th>
                      <th className="p-3">Hardware</th>
                      <th className="p-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {runs.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedRun(r)}
                        className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${selectedRun?.id === r.id ? "bg-slate-800/50" : ""}`}
                      >
                        <td className="p-3 font-semibold text-white">
                          <div>{r.model_name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{r.model_version}</div>
                        </td>
                        <td className="p-3 text-slate-300">{r.dataset_name}</td>
                        <td className="p-3 text-emerald-400 font-bold">
                          {r.accuracy ? `${(r.accuracy * 100).toFixed(1)}%` : <span className="text-slate-500">NOT EVAL</span>}
                        </td>
                        <td className="p-3 text-white">
                          {r.f1_score ? r.f1_score.toFixed(3) : "—"}
                        </td>
                        <td className="p-3 text-slate-400">
                          {r.precision ? `${r.precision.toFixed(3)} / ${r.recall?.toFixed(3)}` : "—"}
                        </td>
                        <td className="p-3 text-blue-400 font-semibold">
                          {r.roc_auc ? r.roc_auc.toFixed(3) : "—"}
                        </td>
                        <td className="p-3 text-slate-300">
                          {r.latency_ms ? `${r.latency_ms} ms` : "—"}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px] truncate max-w-[140px]">
                          {r.hardware}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant={selectedRun?.id === r.id ? "primary" : "secondary"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRun(r);
                            }}
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Deep Inspection: Confusion Matrix & Decision Boundary */}
          {selectedRun && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Confusion Matrix: {selectedRun.model_name}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{selectedRun.dataset_name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRun.confusion_matrix ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto font-mono text-center">
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <span className="text-[10px] text-emerald-400 uppercase">True Positive (TP)</span>
                          <div className="text-xl font-bold text-white mt-1">
                            {selectedRun.confusion_matrix.tp?.toLocaleString()}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                          <span className="text-[10px] text-red-400 uppercase">False Positive (FP)</span>
                          <div className="text-xl font-bold text-white mt-1">
                            {selectedRun.confusion_matrix.fp?.toLocaleString()}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <span className="text-[10px] text-amber-400 uppercase">False Negative (FN)</span>
                          <div className="text-xl font-bold text-white mt-1">
                            {selectedRun.confusion_matrix.fn?.toLocaleString()}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                          <span className="text-[10px] text-blue-400 uppercase">True Negative (TN)</span>
                          <div className="text-xl font-bold text-white mt-1">
                            {selectedRun.confusion_matrix.tn?.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-3 border-t border-slate-800 text-slate-400">
                        <div>False Positive Rate (FPR): <span className="text-white font-bold">{selectedRun.false_positive_rate ? `${(selectedRun.false_positive_rate * 100).toFixed(2)}%` : "N/A"}</span></div>
                        <div>False Negative Rate (FNR): <span className="text-white font-bold">{selectedRun.false_negative_rate ? `${(selectedRun.false_negative_rate * 100).toFixed(2)}%` : "N/A"}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 font-mono">
                      Confusion matrix not recorded for this model evaluation run.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Operational Operating Point</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">Decision Threshold</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Decision Threshold:</span>
                      <span className="text-white font-bold">{selectedRun.threshold_used}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Inference Latency:</span>
                      <span className="text-white font-bold">{selectedRun.latency_ms} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hardware Runtime:</span>
                      <span className="text-white truncate max-w-[200px]">{selectedRun.hardware}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Evaluation Timestamp:</span>
                      <span className="text-slate-300">{new Date(selectedRun.evaluated_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="secondary"
                      disabled={evaluating}
                      onClick={() => handleRunEvaluation(selectedRun.dataset_id, selectedRun.model_name)}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 text-blue-400" />
                      {evaluating ? "Evaluating Split..." : "Re-Run Validation Benchmark"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
