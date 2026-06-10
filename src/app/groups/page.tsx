"use client";

import { useEffect, useState } from "react";
import {
  Users,
  MessageSquare,
  UserCog,
  AlertTriangle,
  Send,
  X,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import type { BotGroup } from "@/types/bot";

type ModalType = "send" | "member" | "purge" | null;

interface ModalState {
  type: ModalType;
  group: BotGroup | null;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<BotGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: null, group: null });
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [memberAction, setMemberAction] = useState<"kick" | "promote">("kick");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchGroups = async () => {
    const res = await apiFetch<BotGroup[]>("/api/groups");
    if (res.success && res.data) setGroups(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const openModal = (type: ModalType, group: BotGroup) => {
    setModal({ type, group });
    setMessage("");
    setUserId("");
    setConfirmText("");
    setFeedback(null);
  };

  const closeModal = () => setModal({ type: null, group: null });

  const handleSendMessage = async () => {
    if (!modal.group || !message.trim()) return;
    setSubmitting(true);
    const res = await apiFetch(`/api/groups/${modal.group.id}/message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    setSubmitting(false);
    if (res.success) {
      closeModal();
    } else {
      setFeedback(res.error ?? "Failed to send message");
    }
  };

  const handleMemberAction = async () => {
    if (!modal.group || !userId.trim()) return;
    setSubmitting(true);
    const endpoint =
      memberAction === "kick" ? "kick" : "promote";
    const res = await apiFetch(`/api/groups/${modal.group.id}/${endpoint}`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    setSubmitting(false);
    if (res.success) {
      closeModal();
    } else {
      setFeedback(res.error ?? "Action failed");
    }
  };

  const handlePurge = async () => {
    if (!modal.group) return;
    setSubmitting(true);
    const res = await apiFetch<{ kicked: number }>(
      `/api/groups/${modal.group.id}/purge`,
      {
        method: "POST",
        body: JSON.stringify({ confirm: confirmText }),
      }
    );
    setSubmitting(false);
    if (res.success) {
      await fetchGroups();
      closeModal();
    } else {
      setFeedback(res.error ?? "Purge failed");
    }
  };

  return (
    <DashboardShell
      title="Groups"
      description="Manage bot groups and members"
    >
      <PageHeader
        title="Groups Management"
        description="View and manage all groups the bot is in"
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Loading groups...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Group Name
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Group ID
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Members
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className="border-b border-border transition-colors hover:bg-accent/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="font-medium">{group.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                          {group.groupId}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary">
                          {group.memberCount} members
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openModal("send", group)}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Send Message
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openModal("member", group)}
                          >
                            <UserCog className="h-3.5 w-3.5" />
                            Promote/Kick
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openModal("purge", group)}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Purge Group
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {modal.type && modal.group && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="font-semibold">
                {modal.type === "send" && "Send Message"}
                {modal.type === "member" && "Promote / Kick Member"}
                {modal.type === "purge" && "Purge Group"}
              </h3>
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-muted-foreground">
                Group:{" "}
                <span className="font-medium text-foreground">
                  {modal.group.name}
                </span>
              </p>

              {feedback && (
                <p className="text-sm text-destructive">{feedback}</p>
              )}

              {modal.type === "send" && (
                <>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    onClick={handleSendMessage}
                    disabled={submitting || !message.trim()}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send to Group
                  </Button>
                </>
              )}

              {modal.type === "member" && (
                <>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={memberAction === "kick" ? "default" : "outline"}
                      onClick={() => setMemberAction("kick")}
                    >
                      Kick
                    </Button>
                    <Button
                      size="sm"
                      variant={memberAction === "promote" ? "default" : "outline"}
                      onClick={() => setMemberAction("promote")}
                    >
                      Promote
                    </Button>
                  </div>
                  <Input
                    placeholder="User ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    variant={memberAction === "kick" ? "destructive" : "default"}
                    onClick={handleMemberAction}
                    disabled={submitting || !userId.trim()}
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {memberAction === "kick" ? "Kick User" : "Promote User"}
                  </Button>
                </>
              )}

              {modal.type === "purge" && (
                <>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-destructive">
                          Dangerous Action
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          This will kick ALL {modal.group.memberCount} members from
                          &quot;{modal.group.name}&quot;. This action cannot be
                          undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Input
                    placeholder='Type "CONFIRM" to proceed'
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={handlePurge}
                    disabled={submitting || confirmText !== "CONFIRM"}
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Purge All Members
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
