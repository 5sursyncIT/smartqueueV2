import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(url: string | null, options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs to avoid recreating connect function
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onMessage, onConnect, onDisconnect, onError]);

  const connect = useCallback(() => {
    if (!url) {
      console.log('[WebSocket] No URL provided, skipping connection');
      return;
    }

    // Don't connect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected, skipping');
      return;
    }

    try {
      let wsUrl = url;

      // Convert http/https to ws/wss only for absolute URLs
      if (url.startsWith('http')) {
        wsUrl = url.replace(/^http/, 'ws');
      }
      // For relative URLs (starting with /), use the backend URL directly
      else if (url.startsWith('/')) {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        wsUrl = backendUrl.replace(/^http/, 'ws') + url;
      }

      console.log('[WebSocket] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] ✅ Connected successfully');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnectRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('[WebSocket] Message received:', message);
          onMessageRef.current?.(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        console.error('[WebSocket] URL was:', wsUrl);
        onErrorRef.current?.(error);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        onDisconnectRef.current?.();

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `[WebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('[WebSocket] Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to create WebSocket connection:', error);
      onErrorRef.current?.(error as Event);
    }
  }, [url, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      console.log('[WebSocket] Disconnecting...');
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }, []);

  // Connect on mount or when URL changes, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]); // Only reconnect when URL changes

  return {
    isConnected,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}
