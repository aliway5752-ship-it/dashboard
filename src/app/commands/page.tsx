"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Terminal } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import type { BotCommand } from "@/types/bot";

export default function CommandsPage() {
  const [commands, setCommands] = useState<BotCommand[]>([]);
  const [reloading, setReloading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCommands = async () => {
    const res = await apiFetch<BotCommand[]>("/api/commands");
    if (res.success && res.data) setCommands(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCommands();
  }, []);

  const toggleCommand = async (id: string, enabled: boolean) => {
    const res = await apiFetch<BotCommand>(`/api/commands/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
    if (res.success && res.data) {
      setCommands((prev) =>
        prev.map((cmd) => (cmd.id === id ? res.data! : cmd))
      );
    }
  };

  const handleReload = async () => {
    setReloading(true);
    await apiFetch("/api/commands/reload", { method: "POST" });
    await fetchCommands();
    setReloading(false);
  };

  return (
    <DashboardShell
      title="Commands"
      description="Manage bot commands and plugins"
    >
      <PageHeader
        title="Commands Management"
        description="Enable, disable, and monitor bot command usage"
        action={
          <Button onClick={handleReload} disabled={reloading}>
            <RefreshCw className={reloading ? "animate-spin" : ""} />
            Reload Plugins/Commands
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Loading commands...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Command
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Usage Count
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Enabled
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {commands.map((cmd) => (
                    <tr
                      key={cmd.id}
                      className="border-b border-border transition-colors hover:bg-accent/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-primary" />
                          <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                            {cmd.name}
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {cmd.description}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs">
                          {cmd.usageCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={cmd.enabled ? "success" : "secondary"}>
                          {cmd.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Switch
                          checked={cmd.enabled}
                          onCheckedChange={(checked) =>
                            toggleCommand(cmd.id, checked)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
