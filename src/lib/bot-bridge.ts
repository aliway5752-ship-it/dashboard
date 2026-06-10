/**
 * Bot Bridge — modular data layer between the dashboard and your bot instance.
 *
 * Replace mock implementations with real bot hooks:
 *   botBridge.setBotInstance(yourBot)
 *
 * All dashboard API routes call through this module.
 */

import os from "os";
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
import { sseHub } from "@/lib/sse-hub";
import { formatUptime } from "@/lib/utils";

// ---------------------------------------------------------------------------
// In-memory state (swap with real bot state when integrating)
// ---------------------------------------------------------------------------

interface BotBridgeState {
  commands: BotCommand[];
  groups: BotGroup[];
  messages: BotMessage[];
  totalUsers: number;
  todayMessages: number;
  startedAt: number;
  connection: ConnectionState;
  simulatorsStarted: boolean;
}

const globalForBridge = globalThis as unknown as {
  botBridgeState?: BotBridgeState;
};

function createInitialState(): BotBridgeState {
  return {
    commands: [
      { id: "1", name: "/help", description: "Show available commands and usage info", usageCount: 1243, enabled: true },
      { id: "2", name: "/status", description: "Display bot status and uptime", usageCount: 892, enabled: true },
      { id: "3", name: "/ping", description: "Check bot latency and responsiveness", usageCount: 567, enabled: true },
      { id: "4", name: "/kick", description: "Kick a user from the group (admin only)", usageCount: 34, enabled: false },
      { id: "5", name: "/promote", description: "Promote a user to admin (admin only)", usageCount: 12, enabled: true },
      { id: "6", name: "/broadcast", description: "Send a message to all groups", usageCount: 8, enabled: false },
    ],
    groups: [
      { id: "g1", name: "Dev Team", groupId: "-1001234567890", memberCount: 24 },
      { id: "g2", name: "General Chat", groupId: "-1009876543210", memberCount: 156 },
      { id: "g3", name: "Announcements", groupId: "-1005555555555", memberCount: 892 },
      { id: "g4", name: "Support", groupId: "-1001111222333", memberCount: 45 },
      { id: "g5", name: "Beta Testers", groupId: "-1004444555666", memberCount: 18 },
    ],
    messages: [],
    totalUsers: 3892,
    todayMessages: 1284,
    startedAt: Date.now() - 12 * 86400000 - 4 * 3600000 - 32 * 60000,
    connection: { api: "connected", gateway: "connected" },
    simulatorsStarted: false,
  };
}

const state: BotBridgeState =
  globalForBridge.botBridgeState ?? createInitialState();
if (process.env.NODE_ENV !== "production") {
  globalForBridge.botBridgeState = state;
}

// Optional real bot instance hook
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let botInstance: any = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowTime(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function createLog(
  level: SystemLog["level"],
  message: string,
  source: SystemLog["source"] = "bot"
): SystemLog {
  const log: SystemLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: nowTime(),
    level,
    message,
    source,
  };
  sseHub.emitLog(log);
  return log;
}

function addMessage(partial: Omit<BotMessage, "id" | "timestamp" | "createdAt">): BotMessage {
  const message: BotMessage = {
    ...partial,
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: nowTime(),
    createdAt: Date.now(),
  };
  state.messages.unshift(message);
  if (state.messages.length > 500) state.messages.pop();
  state.todayMessages++;
  sseHub.emitMessage(message);
  return message;
}

function getCpuPercent(): number {
  const cpus = os.cpus().length || 1;
  const load = os.loadavg()[0] ?? 0;
  const raw = (load / cpus) * 100;
  return Math.min(100, Math.max(5, raw + (Math.random() - 0.5) * 8));
}

function getRamPercent(): number {
  const total = os.totalmem();
  const free = os.freemem();
  const used = ((total - free) / total) * 100;
  return Math.min(100, Math.max(10, used + (Math.random() - 0.5) * 4));
}

// ---------------------------------------------------------------------------
// Mock simulators (disable when real bot is connected)
// ---------------------------------------------------------------------------

const MOCK_USERS = [
  { name: "Ali Hassan", id: "123456789" },
  { name: "Sara Ahmed", id: "987654321" },
  { name: "Omar Khalid", id: "456789123" },
  { name: "Fatima Noor", id: "321654987" },
  { name: "Youssef Ali", id: "789123456" },
];

const MOCK_INCOMING = [
  "Hello bot, what's the status?",
  "/help",
  "/ping",
  "Can you restart the service?",
  "Thanks for the update!",
  "Is the bot online?",
  "/status",
];

const MOCK_OUTGOING = [
  "All systems operational.",
  "Available commands: /status, /help, /ping",
  "Pong! Latency: 42ms",
  "Bot uptime is healthy.",
  "Message received and processed.",
];

let metricsInterval: ReturnType<typeof setInterval> | null = null;
let messageInterval: ReturnType<typeof setInterval> | null = null;

export function startSimulators(): void {
  if (state.simulatorsStarted || botInstance) return;
  state.simulatorsStarted = true;

  // Seed initial messages
  if (state.messages.length === 0) {
    const group = state.groups[0];
    addMessage({
      type: "incoming",
      user: "Ali Hassan",
      userId: "123456789",
      group: group.name,
      groupId: group.groupId,
      content: "Hello bot, what's the status?",
    });
    addMessage({
      type: "outgoing",
      user: "Bot",
      userId: "bot",
      group: group.name,
      groupId: group.groupId,
      content: `All systems operational. Uptime: ${formatUptime(getUptimeSeconds())}`,
    });
    state.todayMessages = 1284;
  }

  createLog("info", "Bot bridge simulators started", "system");
  createLog("info", `Monitoring process: ${process.env.BOT_PM2_NAME || "bot"}`, "system");

  metricsInterval = setInterval(() => {
    const metrics = getSystemMetrics();
    sseHub.emitMetrics(metrics);
  }, 2000);

  messageInterval = setInterval(() => {
    const group = state.groups[Math.floor(Math.random() * state.groups.length)];
    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
    const isIncoming = Math.random() > 0.35;

    if (isIncoming) {
      const content = MOCK_INCOMING[Math.floor(Math.random() * MOCK_INCOMING.length)];
      addMessage({
        type: "incoming",
        user: user.name,
        userId: user.id,
        group: group.name,
        groupId: group.groupId,
        content,
      });
      if (content.startsWith("/")) {
        const cmd = state.commands.find((c) => c.name === content.split(" ")[0]);
        if (cmd) cmd.usageCount++;
      }
      createLog("info", `Message from ${user.name} in ${group.name}`, "bot");
    } else {
      addMessage({
        type: "outgoing",
        user: "Bot",
        userId: "bot",
        group: group.name,
        groupId: group.groupId,
        content: MOCK_OUTGOING[Math.floor(Math.random() * MOCK_OUTGOING.length)],
      });
    }
  }, 4000 + Math.random() * 4000);
}

export function stopSimulators(): void {
  if (metricsInterval) clearInterval(metricsInterval);
  if (messageInterval) clearInterval(messageInterval);
  metricsInterval = null;
  messageInterval = null;
  state.simulatorsStarted = false;
}

// ---------------------------------------------------------------------------
// Public API — swap these with real bot calls
// ---------------------------------------------------------------------------

export function setBotInstance(instance: unknown): void {
  botInstance = instance;
  stopSimulators();
  createLog("info", "Real bot instance connected to bridge", "system");
}

export function getUptimeSeconds(): number {
  if (botInstance?.uptime) return botInstance.uptime;
  return Math.floor((Date.now() - state.startedAt) / 1000);
}

export function getDashboardStats(): DashboardStats {
  if (botInstance?.getStats) return botInstance.getStats();
  return {
    todayMessages: state.todayMessages,
    totalGroups: state.groups.length,
    totalUsers: state.totalUsers,
    uptimeSeconds: getUptimeSeconds(),
    messageTrend: "+12% from yesterday",
  };
}

export function getSystemMetrics(): SystemMetrics {
  const cpu = Math.round(getCpuPercent() * 10) / 10;
  const ram = Math.round(getRamPercent() * 10) / 10;
  const timestamp = Date.now();
  return {
    cpu,
    ram,
    point: {
      time: new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false }),
      cpu,
      ram,
      timestamp,
    },
  };
}

export function getConnectionState(): ConnectionState {
  if (botInstance?.connection) return botInstance.connection;
  return state.connection;
}

export function getMessages(limit = 100): BotMessage[] {
  if (botInstance?.messages) return botInstance.messages.slice(0, limit);
  return state.messages.slice(0, limit);
}

export function getCommands(): BotCommand[] {
  if (botInstance?.commands) return botInstance.commands;
  return state.commands;
}

export function getGroups(): BotGroup[] {
  if (botInstance?.groups) return botInstance.groups;
  return state.groups;
}

export function toggleCommand(id: string, enabled: boolean): ApiResponse<BotCommand> {
  const cmd = state.commands.find((c) => c.id === id);
  if (!cmd) return { success: false, error: "Command not found" };

  cmd.enabled = enabled;
  createLog("info", `Command ${cmd.name} ${enabled ? "enabled" : "disabled"}`, "bot");
  return { success: true, data: cmd };
}

export function reloadCommands(): ApiResponse<{ count: number }> {
  createLog("info", "Reloading plugins and commands...", "bot");
  createLog("info", "Plugin 'commands' loaded", "bot");
  createLog("info", "Plugin 'moderation' loaded", "bot");
  createLog("info", `Loaded ${state.commands.length} commands`, "bot");
  return { success: true, data: { count: state.commands.length } };
}

export function sendGroupMessage(
  groupId: string,
  message: string
): ApiResponse<{ messageId: string }> {
  const group = state.groups.find((g) => g.id === groupId || g.groupId === groupId);
  if (!group) return { success: false, error: "Group not found" };

  const msg = addMessage({
    type: "outgoing",
    user: "Bot (Admin)",
    userId: "bot",
    group: group.name,
    groupId: group.groupId,
    content: message,
  });

  createLog("info", `Admin message sent to ${group.name}`, "bot");
  return { success: true, data: { messageId: msg.id } };
}

export function kickMember(
  groupId: string,
  userId: string
): ApiResponse<{ userId: string }> {
  const group = state.groups.find((g) => g.id === groupId || g.groupId === groupId);
  if (!group) return { success: false, error: "Group not found" };

  createLog("warn", `Kicked user ${userId} from ${group.name}`, "bot");
  return { success: true, data: { userId } };
}

export function promoteMember(
  groupId: string,
  userId: string
): ApiResponse<{ userId: string }> {
  const group = state.groups.find((g) => g.id === groupId || g.groupId === groupId);
  if (!group) return { success: false, error: "Group not found" };

  createLog("info", `Promoted user ${userId} in ${group.name}`, "bot");
  return { success: true, data: { userId } };
}

export function purgeGroup(
  groupId: string,
  confirm: string
): ApiResponse<{ kicked: number }> {
  if (confirm !== "CONFIRM") {
    return { success: false, error: 'Type "CONFIRM" to proceed' };
  }

  const group = state.groups.find((g) => g.id === groupId || g.groupId === groupId);
  if (!group) return { success: false, error: "Group not found" };

  const kicked = group.memberCount;
  group.memberCount = 0;
  createLog("error", `PURGE: Kicked all ${kicked} members from ${group.name}`, "bot");
  return { success: true, data: { kicked } };
}

export function clearCache(): ApiResponse {
  createLog("info", "Cache cleared successfully", "system");
  return { success: true };
}

export const botBridge = {
  setBotInstance,
  startSimulators,
  stopSimulators,
  getDashboardStats,
  getSystemMetrics,
  getConnectionState,
  getMessages,
  getCommands,
  getGroups,
  toggleCommand,
  reloadCommands,
  sendGroupMessage,
  kickMember,
  promoteMember,
  purgeGroup,
  clearCache,
  getUptimeSeconds,
  createLog,
};
