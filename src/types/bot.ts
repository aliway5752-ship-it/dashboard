export type MessageDirection = "incoming" | "outgoing";
export type LogLevel = "info" | "warn" | "error" | "debug";
export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export interface BotMessage {
  id: string;
  type: MessageDirection;
  user: string;
  userId: string;
  group: string;
  groupId: string;
  content: string;
  timestamp: string;
  createdAt: number;
}

export interface BotGroup {
  id: string;
  name: string;
  groupId: string;
  memberCount: number;
}

export interface BotCommand {
  id: string;
  name: string;
  description: string;
  usageCount: number;
  enabled: boolean;
}

export interface SystemMetricPoint {
  time: string;
  cpu: number;
  ram: number;
  timestamp: number;
}

export interface SystemMetrics {
  cpu: number;
  ram: number;
  point: SystemMetricPoint;
}

export interface DashboardStats {
  todayMessages: number;
  totalGroups: number;
  totalUsers: number;
  uptimeSeconds: number;
  messageTrend?: string;
}

export interface ConnectionState {
  api: ConnectionStatus;
  gateway: ConnectionStatus;
}

export interface SystemLog {
  id: string;
  time: string;
  level: LogLevel;
  message: string;
  source: "bot" | "pm2" | "system";
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GroupActionPayload {
  userId?: string;
  message?: string;
  confirm?: string;
}
