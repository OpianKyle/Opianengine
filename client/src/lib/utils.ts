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
  // Prevent any ongoing network requests
  window.stop();

  // Clear any pending timeouts
  const highestTimeoutId = window.setTimeout(() => {}, 0);
  for (let i = 0; i < highestTimeoutId; i++) {
    window.clearTimeout(i);
  }

  // Clean up WebSocket connections
  cleanupWebSockets();

  // Execute any additional cleanup
  if (callback) {
    callback();
  }

  // Give the browser a moment to process cleanup
  return new Promise(resolve => setTimeout(resolve, 100));
}

// Helper to ensure clean navigation
export async function navigateTo(path: string) {
  await handlePageTransition();
  window.location.href = path;
}