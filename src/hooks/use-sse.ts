"use client";

import { useEffect, useRef, useState } from "react";

interface UseSSEOptions<T> {
  url: string;
  enabled?: boolean;
  onMessage?: (data: T) => void;
  maxItems?: number;
}

export function useSSE<T>({
  url,
  enabled = true,
  onMessage,
  maxItems,
}: UseSSEOptions<T>) {
  const [connected, setConnected] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [latest, setLatest] = useState<T | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource(url);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as T & { type?: string };
        if (parsed && typeof parsed === "object" && parsed.type === "error") {
          setConnected(false);
          return;
        }
        const data = parsed as T;
        setLatest(data);
        onMessageRef.current?.(data);

        if (maxItems !== undefined) {
          setItems((prev) => [data, ...prev].slice(0, maxItems));
        }
      } catch {
        // Ignore malformed events
      }
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [url, enabled, maxItems]);

  return { connected, items, latest, setItems };
}
