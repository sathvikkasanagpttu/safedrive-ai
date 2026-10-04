"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TelemetryFrame } from "@/types";

interface UseWebSocketOptions {
  mode?: "demo" | "camera";
  sessionId?: string;
  onAlert?: (alert: any) => void;
}

export function useWebSocket({ mode = "demo", sessionId, onAlert }: UseWebSocketOptions = {}) {
  const [telemetry, setTelemetry] = useState<TelemetryFrame | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeMode, setActiveMode] = useState<string>(mode === "demo" ? "DEMO MODE" : "CAMERA MODE");
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_WS_HOST || "127.0.0.1:8000";
    const url = `${protocol}//${host}/ws/live-monitor?mode=${mode}${sessionId ? `&session_id=${sessionId}` : ""}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Start heartbeat ping
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "PING" }));
          }
        }, 8000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "TELEMETRY") {
            setTelemetry(data);
            if (data.mode) setActiveMode(data.mode);
            // Trigger alerts callback
            if (data.alerts && data.alerts.length > 0 && onAlertRef.current) {
              data.alerts.forEach((al: any) => onAlertRef.current!(al));
            }
          } else if (data.type === "MODE_CHANGED") {
            setActiveMode(data.mode === "DEMO" ? "DEMO MODE" : "CAMERA MODE");
          }
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setIsConnected(false);
    }
  }, [mode, sessionId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  const sendFrame = useCallback((base64Image: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "FRAME",
        data: base64Image
      }));
    }
  }, []);

  const switchMode = useCallback((newMode: "demo" | "camera") => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: newMode === "demo" ? "START_DEMO" : "STOP_DEMO"
      }));
      setActiveMode(newMode === "demo" ? "DEMO MODE" : "CAMERA MODE");
    }
  }, []);

  return {
    telemetry,
    isConnected,
    activeMode,
    sendFrame,
    switchMode
  };
}
