/**
 * Bot Bridge — proxies all dashboard operations to the remote Bot Express API.
 *
 * Remote endpoints:
 *   GET  /api/bot-data?scope=<stats|metrics|status|messages|commands|groups|logs>
 *   POST /api/bot-command  { action: "restart" | "clear_cache" | ... }
 *
 * Auth: x-api-key header (BOT_API_KEY)
 */

import type {
  ApiResponse,
  BotCommand,
  BotGroup,
  BotMessage,
  ConnectionState,
  DashboardStats,
  SystemLog,
  SystemMetrics,
} from "@/types/bot";
import {
  BotApiError,
  fetchBotData,
  isBotApiConfigured,
  sendBotCommand,
} from "@/lib/bot-api-client";
import { sseHub } from "@/lib/sse-hub";

const DISCONNECTED: ConnectionState = {
  api: "disconnected",
  gateway: "disconnected",
};

// ---------------------------------------------------------------------------
// Normalizers (tolerate minor shape differences from the remote bot)
// ---------------------------------------------------------------------------

function normalizeMessage(raw: BotMessage): BotMessage {
  return {
    id: raw.id,
    type: raw.type,
    user: raw.user,
    userId: raw.userId,
    group: raw.group,
    groupId: raw.groupId,
    content: raw.content,
    timestamp: raw.timestamp,
    createdAt: raw.createdAt ?? Date.now(),
  };
}


function toSystemMetrics(metrics: {
  processRssMB?: number;
  systemUsedMemoryMB?: number;
  systemTotalMemoryMB?: number;
  cpuUsage?: number;
}): SystemMetrics {
  const timestamp = Date.now();
  // Calculate CPU and RAM from actual bot API response
  // Bot returns: processRssMB, systemTotalMemoryMB, systemUsedMemoryMB, cpuUsage
  const ramUsed = metrics.systemUsedMemoryMB || metrics.processRssMB || 0;
  const ramTotal = metrics.systemTotalMemoryMB || 1;
  const ramPercent = (ramUsed / ramTotal) * 100;
  
  // CPU is provided as cpuUsage in the bot API response
  const cpuPercent = metrics.cpuUsage || 0;
  
  return {
    cpu: cpuPercent,
    ram: ramPercent,
    point: {
      time: new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false }),
      cpu: cpuPercent,
      ram: ramPercent,
      timestamp,
    },
  };
}

function unwrapData<T>(response: any): T {
  if (!response || !response.success) {
    throw new BotApiError(response?.error ?? "Remote bot returned success: false");
  }
  if (response.data !== undefined) return response.data;
  if (response.status !== undefined) return response.status;
  if (response.metrics !== undefined) return response.metrics;
  return response as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createLog(
  level: SystemLog["level"],
  message: string,
  source: SystemLog["source"] = "system"
): SystemLog {
  const log: SystemLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    level,
    message,
    source,
  };
  sseHub.emitLog(log);
  return log;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isBotApiConfigured()) {
    throw new BotApiError("Bot API is not configured");
  }
  const response = await fetchBotData("stats");
  const data = unwrapData(response);
  // Handle both direct object and nested data structure
  const stats = typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {};
  return stats as DashboardStats;
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  if (!isBotApiConfigured()) {
    throw new BotApiError("Bot API is not configured");
  }
  const response = await fetchBotData("metrics");
  const metrics = unwrapData(response) as {
    processRssMB?: number;
    systemUsedMemoryMB?: number;
    systemTotalMemoryMB?: number;
    cpuUsage?: number;
  };
  return toSystemMetrics(metrics);
}

export async function getConnectionState(): Promise<ConnectionState> {
  if (!isBotApiConfigured()) return DISCONNECTED;
  try {
    const response = await fetchBotData("status");
    if (!response || !response.success) return DISCONNECTED;
    const botStatus = unwrapData(response) as { connected: boolean };
    const status = botStatus.connected ? "connected" : "disconnected";
    return { api: status, gateway: status };
  } catch {
    return DISCONNECTED;
  }
}

export async function getMessages(limit = 100): Promise<BotMessage[]> {
  if (!isBotApiConfigured()) {
    throw new BotApiError("Bot API is not configured");
  }
  const response = await fetchBotData("messages", { limit: String(limit) });
  const messages = unwrapData(response) as BotMessage[];
  return messages.map(normalizeMessage);
}

export async function getCommands(): Promise<BotCommand[]> {
  if (!isBotApiConfigured()) {
    throw new BotApiError("Bot API is not configured");
  }
  const response = await fetchBotData("commands");
  return unwrapData(response) as BotCommand[];
}

export async function getGroups(): Promise<BotGroup[]> {
  if (!isBotApiConfigured()) throw new BotApiError("Bot API is not configured");
  const response = await fetchBotData("groups");
  const data = unwrapData(response);
  const groupsArray = Array.isArray(data) ? data : [];
  return groupsArray.map((g: any) => ({
    id: g.groupId,
    groupId: g.groupId,
    name: g.groupName,
    memberCount: g.membersCount || 0,
  }));
}

export async function getLogs(limit = 50): Promise<SystemLog[]> {
  if (!isBotApiConfigured()) {
    throw new BotApiError("Bot API is not configured");
  }
  const response = await fetchBotData("logs", { limit: String(limit) });
  return unwrapData(response) as SystemLog[];
}

export async function toggleCommand(
  id: string,
  enabled: boolean
): Promise<ApiResponse<BotCommand>> {
  const result = await sendBotCommand<BotCommand>({
    action: "toggle_command",
    commandId: id,
    enabled,
  });
  if (result.success) {
    createLog(
      "info",
      `Command ${id} ${enabled ? "enabled" : "disabled"}`,
      "bot"
    );
  }
  return result;
}

export async function reloadCommands(): Promise<ApiResponse<{ count: number }>> {
  const result = await sendBotCommand<{ count: number }>({
    action: "reload_commands",
  });
  if (result.success) {
    createLog("info", "Plugins and commands reloaded", "bot");
  }
  return result;
}

export async function restartBot(): Promise<ApiResponse<{ output?: string }>> {
  createLog("warn", "Sending restart command to remote bot...", "system");
  const result = await sendBotCommand<{ output?: string }>({
    action: "restart",
  });
  if (result.success) {
    createLog("info", "Remote bot restart acknowledged", "bot");
  }
  return result;
}

export async function sendGroupMessage(
  groupId: string,
  message: string
): Promise<ApiResponse<{ messageId: string }>> {
  const result = await sendBotCommand<{ messageId: string }>({
    action: "send_message",
    groupId,
    message,
  });
  if (result.success) {
    createLog("info", `Message sent to group ${groupId}`, "bot");
  }
  return result;
}

export async function kickMember(
  groupId: string,
  userId: string
): Promise<ApiResponse<{ userId: string }>> {
  const result = await sendBotCommand<{ userId: string }>({
    action: "kick",
    groupId,
    userId,
  });
  if (result.success) {
    createLog("warn", `Kicked user ${userId} from group ${groupId}`, "bot");
  }
  return result;
}

export async function promoteMember(
  groupId: string,
  userId: string
): Promise<ApiResponse<{ userId: string }>> {
  const result = await sendBotCommand<{ userId: string }>({
    action: "promote",
    groupId,
    userId,
  });
  if (result.success) {
    createLog("info", `Promoted user ${userId} in group ${groupId}`, "bot");
  }
  return result;
}

export async function purgeGroup(
  groupId: string,
  confirm: string
): Promise<ApiResponse<{ kicked: number }>> {
  if (confirm !== "CONFIRM") {
    return { success: false, error: 'Type "CONFIRM" to proceed' };
  }
  const result = await sendBotCommand<{ kicked: number }>({
    action: "purge",
    groupId,
    confirm,
  });
  if (result.success) {
    createLog("error", `Purged group ${groupId}`, "bot");
  }
  return result;
}

export async function clearCache(): Promise<ApiResponse> {
  const result = await sendBotCommand({ action: "clear_cache" });
  if (result.success) {
    createLog("info", "Remote bot cache cleared", "bot");
  }
  return result;
}

export const botBridge = {
  getDashboardStats,
  getSystemMetrics,
  getConnectionState,
  getMessages,
  getCommands,
  getGroups,
  getLogs,
  toggleCommand,
  reloadCommands,
  restartBot,
  sendGroupMessage,
  kickMember,
  promoteMember,
  purgeGroup,
  clearCache,
  createLog,
};
