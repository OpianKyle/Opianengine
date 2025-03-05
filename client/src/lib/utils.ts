import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTransactionType(type: string): string {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

// Helper to clean up WebSocket connections
export function cleanupWebSockets() {
  // Close and cleanup any existing WebSocket connections
  if (typeof window !== 'undefined') {
    const ws = window.WebSocket;
    if (ws) {
      // Remove any script tags that might be trying to establish WS connections
      const wsScripts = document.querySelectorAll('script[src*="ws"]');
      wsScripts.forEach(script => script.remove());

      // Force close any open WebSocket connections
      const wsInstances = Array.from(document.querySelectorAll('[data-ws-connection]'));
      wsInstances.forEach(ws => ws.remove());
    }
  }
}

// Helper to handle page transitions
export function handlePageTransition(callback?: () => void) {
  cleanupWebSockets();

  // Clear any hanging network requests
  if (typeof window !== 'undefined' && window.stop) {
    window.stop();
  }

  // Execute any additional cleanup
  if (callback) {
    callback();
  }
}