// This hook is deprecated and has been replaced by use-notifications.ts
// Keeping this file as a placeholder to prevent import errors, but the functionality
// has been moved to the notifications system
import { useEffect, useRef } from 'react';
import { useUser } from './use-user';

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);

  // Return empty websocket ref as this hook is deprecated
  return ws;
}