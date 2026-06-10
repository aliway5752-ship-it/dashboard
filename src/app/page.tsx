"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Users,
  UserCircle,
  Clock,
  Activity,
  Cpu,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSSE } from "@/hooks/use-sse";
import { apiFetch } from "@/lib/api-client";
import { formatUptime } from "@/lib/utils";
import type { DashboardStats, SystemMetrics } from "@/types/bot";

const MAX_POINTS = 30;

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<
    { time: string; cpu: number; ram: number }[]
  >([]);

  useEffect(() => {
    apiFetch<DashboardStats>("/api/stats").then((res) => {
      if (res.success && res.data) setStats(res.data);
    });
  }, []);

  useSSE<SystemMetrics>({
    url: "/api/stream/metrics",
    onMessage: (metrics) => {
      setChartData((prev) =>
        [...prev, metrics.point].slice(-MAX_POINTS)
      );
    },
  });

  return (
    <DashboardShell
      title="Dashboard"
      description="Overview of bot activity and system health"
    >
      <PageHeader
        title="Overview"
        description="Real-time statistics and system metrics"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's Messages"
          value={stats ? stats.todayMessages.toLocaleString() : "—"}
          icon={MessageSquare}
          trend={stats?.messageTrend}
        />
        <StatCard
          title="Total Groups"
          value={stats ? stats.totalGroups.toLocaleString() : "—"}
          icon={Users}
          iconColor="text-violet-400"
        />
        <StatCard
          title="Total Users"
          value={stats ? stats.totalUsers.toLocaleString() : "—"}
          icon={UserCircle}
          iconColor="text-cyan-400"
        />
        <StatCard
          title="Bot Uptime"
          value={stats ? formatUptime(stats.uptimeSeconds) : "—"}
          icon={Clock}
          iconColor="text-amber-400"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">CPU Usage</CardTitle>
            </div>
            <CardDescription>Real-time processor utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a2e",
                      border: "1px solid #2a2a3e",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "CPU"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#cpuGrad)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-base">RAM Usage</CardTitle>
            </div>
            <CardDescription>Memory consumption over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a2e",
                      border: "1px solid #2a2a3e",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "RAM"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="ram"
                    stroke="#34d399"
                    strokeWidth={2}
                    fill="url(#ramGrad)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
