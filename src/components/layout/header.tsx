"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import type { ConnectionState, ConnectionStatus } from "@/types/bot";

interface HeaderProps {
  title: string;
  description?: string;
  onMenuClick?: () => void;
}

function statusBadge(status: ConnectionStatus) {
  if (status === "connected") return "success" as const;
  if (status === "connecting") return "warning" as const;
  return "danger" as const;
}

export function Header({ title, description, onMenuClick }: HeaderProps) {
  const [connection, setConnection] = useState<ConnectionState>({
    api: "connecting",
    gateway: "connecting",
  });

  useEffect(() => {
    apiFetch<ConnectionState>("/api/status").then((res) => {
      if (res.success && res.data) setConnection(res.data);
    });
    const interval = setInterval(() => {
      apiFetch<ConnectionState>("/api/status").then((res) => {
        if (res.success && res.data) setConnection(res.data);
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={statusBadge(connection.api)} className="hidden sm:flex">
          API {connection.api === "connected" ? "Connected" : connection.api}
        </Badge>
        <Badge variant={statusBadge(connection.gateway)} className="hidden sm:flex">
          Gateway {connection.gateway === "connected" ? "Connected" : connection.gateway}
        </Badge>
      </div>
    </header>
  );
}
