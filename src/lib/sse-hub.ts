import type { BotMessage, SystemLog, SystemMetrics } from "@/types/bot";

type SSEChannel = "metrics" | "messages" | "logs";
type SSEListener<T> = (data: T) => void;

class SSEHub {
  private listeners: Record<SSEChannel, Set<SSEListener<unknown>>> = {
    metrics: new Set(),
    messages: new Set(),
    logs: new Set(),
  };

  subscribe<T>(channel: SSEChannel, listener: SSEListener<T>): () => void {
    this.listeners[channel].add(listener as SSEListener<unknown>);
    return () => this.listeners[channel].delete(listener as SSEListener<unknown>);
  }

  emitMetrics(data: SystemMetrics): void {
    this.broadcast("metrics", data);
  }

  emitMessage(data: BotMessage): void {
    this.broadcast("messages", data);
  }

  emitLog(data: SystemLog): void {
    this.broadcast("logs", data);
  }

  private broadcast(channel: SSEChannel, data: unknown): void {
    for (const listener of this.listeners[channel]) {
      listener(data);
    }
  }
}

const globalForSSE = globalThis as unknown as { sseHub?: SSEHub };

export const sseHub = globalForSSE.sseHub ?? new SSEHub();
if (process.env.NODE_ENV !== "production") {
  globalForSSE.sseHub = sseHub;
}
