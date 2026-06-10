"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Filter, Send, Inbox, ArrowUpRight } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSSE } from "@/hooks/use-sse";
import { apiFetch } from "@/lib/api-client";
import type { BotMessage } from "@/types/bot";

type MessageType = "all" | "incoming" | "outgoing";

export default function MessagesPage() {
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<MessageType>("all");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<BotMessage[]>("/api/messages?limit=100").then((res) => {
      if (res.success && res.data) setMessages(res.data);
    });
  }, []);

  const { connected } = useSSE<BotMessage>({
    url: "/api/stream/messages",
    onMessage: (msg) => {
      setMessages((prev) => [msg, ...prev].slice(0, 200));
    },
  });

  const filtered = useMemo(() => {
    return messages.filter((msg) => {
      const matchesSearch =
        !search ||
        msg.content.toLowerCase().includes(search.toLowerCase()) ||
        msg.user.toLowerCase().includes(search.toLowerCase()) ||
        msg.group.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "all" || msg.type === filterType;
      const matchesUser =
        !filterUserId || msg.userId.includes(filterUserId);
      const matchesGroup =
        !filterGroup ||
        msg.group.toLowerCase().includes(filterGroup.toLowerCase()) ||
        msg.groupId.includes(filterGroup);
      return matchesSearch && matchesType && matchesUser && matchesGroup;
    });
  }, [messages, search, filterType, filterUserId, filterGroup]);

  return (
    <DashboardShell
      title="Direct Messages"
      description="Live chat logs and message history"
    >
      <PageHeader
        title="Message Logs"
        description="Real-time feed of all incoming and outgoing messages"
      />

      <div className="flex h-[calc(100vh-12rem)] gap-4">
        <Card className="hidden w-72 shrink-0 flex-col md:flex">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Message Type
              </p>
              {(["all", "incoming", "outgoing"] as MessageType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm capitalize transition-colors",
                    filterType === type
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {type === "incoming" && <Inbox className="h-4 w-4" />}
                  {type === "outgoing" && <Send className="h-4 w-4" />}
                  {type === "all" && <Filter className="h-4 w-4" />}
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Quick Filters
              </p>
              <Input
                placeholder="Filter by User ID"
                className="text-xs"
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
              />
              <Input
                placeholder="Filter by Group"
                className="text-xs"
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="border-b border-border py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Live Feed</CardTitle>
              <Badge variant={connected ? "success" : "danger"} className="gap-1.5">
                {connected && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                )}
                {connected ? "Live" : "Disconnected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent ref={feedRef} className="flex-1 overflow-y-auto p-0">
            <div className="divide-y divide-border">
              {filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No messages match your filters.
                </p>
              ) : (
                filtered.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-accent/30"
                  >
                    <div
                      className={cn(
                        "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        msg.type === "incoming"
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      )}
                    >
                      {msg.type === "incoming" ? (
                        <Inbox className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{msg.user}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {msg.group}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
