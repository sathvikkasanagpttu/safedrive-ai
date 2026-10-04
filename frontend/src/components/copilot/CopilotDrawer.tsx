"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { CopilotResponse } from "@/types";
import { Sparkles, Send, X, Bot, User as UserIcon, ShieldAlert, Car, TrendingUp, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: "user" | "copilot";
  content?: string;
  response?: CopilotResponse;
  timestamp: string;
}

const SUGGESTED_QUERIES = [
  "Who are the highest risk drivers this week?",
  "Investigate Vehicle 101 safety records",
  "What is the status of driver John Doe?",
  "Analyze fleet fatigue patterns"
];

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "copilot",
      content: "Hello! I am your SafeDrive 2.0 AI Safety Copilot. I analyze fleet telematics, driver risk scores, and evidence logs directly from your database with zero hallucination. How can I assist your fleet safety operations today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      const res = await api.queryCopilot(q);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "copilot",
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "copilot",
        content: `Error querying safety telemetry: ${err.message || "Failed to reach copilot engine."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">AI Safety Copilot</h3>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  SafeDrive 2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Grounded fleet safety intelligence & natural language investigation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Suggested Queries */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80">
          <p className="text-[11px] font-medium text-slate-400 mb-2">Suggested Investigations:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUERIES.map((sq, i) => (
              <button
                key={i}
                onClick={() => handleSend(sq)}
                disabled={loading}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:border-indigo-500/50 transition-all text-left flex items-center gap-1.5"
              >
                <span>{sq}</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.sender === "copilot" && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  m.sender === "user"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-slate-800/90 text-slate-200 border border-slate-700/70"
                }`}
              >
                {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}

                {m.response && (
                  <div className="space-y-3">
                    {/* Header with intent and citations */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700 text-xs">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {m.response.intent}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {m.response.citations_count} citations grounded
                      </span>
                    </div>

                    {/* Summary text */}
                    <div className="whitespace-pre-wrap text-slate-200 text-xs leading-relaxed font-sans">
                      {m.response.grounded_summary}
                    </div>

                    {/* Render structured data if available */}
                    {Array.isArray(m.response.data) && m.response.data.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-700/80 space-y-2">
                        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                          Ranked Intelligence Dossier:
                        </div>
                        <div className="space-y-1.5">
                          {m.response.data.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-2 rounded bg-slate-900/80 border border-slate-700/60 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-indigo-400">#{item.rank || idx + 1}</span>
                                <div>
                                  <span className="font-medium text-slate-100">{item.name || item.driver_name || item.vehicle_code}</span>
                                  {item.driver_code && (
                                    <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                                      ({item.driver_code})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                {item.safety_score !== undefined && (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-red-950/60 text-red-400 border border-red-900/50">
                                    Score: {item.safety_score}
                                  </span>
                                )}
                                {item.risk_score !== undefined && (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-950/60 text-amber-400 border border-amber-900/50">
                                    Risk: {item.risk_score}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 font-mono text-right ${
                    m.sender === "user" ? "text-blue-200" : "text-slate-500"
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
              {m.sender === "user" && (
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4 text-blue-300" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Consulting database & analyzing telematics telemetry...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Copilot (e.g., 'Who is the highest risk driver this week?')..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-3.5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-slate-500 mt-1.5 text-center">
            Zero-hallucination queries strictly bound to live telemetry, session history & safety records.
          </p>
        </div>
      </div>
    </div>
  );
};
