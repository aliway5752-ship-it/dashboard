"use client";

import { useEffect, useRef, useState } from "react";
import {
  RotateCcw,
  Trash2,
  Terminal,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSSE } from "@/hooks/use-sse";
import { apiFetch } from "@/lib/api-client";
import type { ConnectionState, ConnectionStatus, SystemLog } from "@/types/bot";

const MAX_LOGS = 200;

export default function SettingsPage() {
  const [connection, setConnection] = useState<ConnectionState>({
    api: "connecting",
    gateway: "connecting",
  });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [restarting, setRestarting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<ConnectionState>("/api/status").then((res) => {
      if (res.success && res.data) setConnection(res.data);
    });
    apiFetch<SystemLog[]>("/api/logs?limit=50").then((res) => {
      if (res.success && res.data) setLogs(res.data);
    });
    const interval = setInterval(() => {
      apiFetch<ConnectionState>("/api/status").then((res) => {
        if (res.success && res.data) setConnection(res.data);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const { connected: logsConnected } = useSSE<SystemLog>({
    url: "/api/stream/logs",
    onMessage: (log) => {
      setLogs((prev) => [...prev, log].slice(-MAX_LOGS));
    },
  });

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const statusConfig = {
    connected: { label: "Connected", variant: "success" as const, icon: Wifi },
    disconnected: { label: "Disconnected", variant: "danger" as const, icon: WifiOff },
    connecting: { label: "Connecting", variant: "warning" as const, icon: Loader2 },
  };

  const handleRestart = async () => {
    setRestarting(true);
    setActionMessage(null);
    const res = await apiFetch<{ output: string }>("/api/system/restart", {
      method: "POST",
    });
    setRestarting(false);
    setActionMessage(
      res.success
        ? `Restart successful: ${res.data?.output}`
        : res.error ?? "Restart failed"
    );
  };

  const handleClearCache = async () => {
    setClearing(true);
    setActionMessage(null);
    const res = await apiFetch("/api/system/clear-cache", { method: "POST" });
    setClearing(false);
    setActionMessage(res.success ? "Cache cleared successfully" : res.error ?? "Failed");
  };

  return (
    <DashboardShell
      title="System Settings"
      description="Bot process control and system monitoring"
    >
      <PageHeader
        title="System Settings"
        description="Manage bot process, cache, and view live logs"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {(["api", "gateway"] as const).map((type) => {
          const status: ConnectionStatus = connection[type];
          const config = statusConfig[status];
          const Icon = config.icon;

          return (
            <Card key={type}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {type} Status
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Icon
                      className={`h-4 w-4 ${
                        status === "connecting" ? "animate-spin" : ""
                      }`}
                    />
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                </div>
                <div
                  className={`h-3 w-3 rounded-full ${
                    status === "connected"
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                      : status === "connecting"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-red-500"
                  }`}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={handleRestart} disabled={restarting}>
          {restarting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Restart Bot Process
        </Button>
        <Button variant="outline" onClick={handleClearCache} disabled={clearing}>
          {clearing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Clear Cache
        </Button>
        {actionMessage && (
          <p className="text-sm text-muted-foreground">{actionMessage}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Live Log Viewer</CardTitle>
            </div>
            <Badge variant={logsConnected ? "success" : "danger"}>
              {logsConnected ? "Streaming" : "Offline"}
            </Badge>
          </div>
          <CardDescription>
            PM2 error logs + real-time system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-[#0d0d14] p-4 font-mono text-xs leading-relaxed">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 py-0.5">
                <span className="shrink-0 text-muted-foreground">
                  [{log.time}]
                </span>
                <span
                  className={`shrink-0 uppercase ${
                    log.level === "error"
                      ? "text-red-400"
                      : log.level === "warn"
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-foreground/80">{log.message}</span>
              </div>
            ))}
            <div ref={logEndRef} className="mt-2 flex items-center gap-1 text-muted-foreground">
              <span className="animate-pulse">▊</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
