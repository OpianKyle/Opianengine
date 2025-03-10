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

// Helper to handle page transitions
export function handlePageTransition(callback?: () => void) {
  // Prevent any ongoing network requests
  window.stop();

  // Clear any pending timeouts
  const highestTimeoutId = window.setTimeout(() => {}, 0);
  for (let i = 0; i < highestTimeoutId; i++) {
    window.clearTimeout(i);
  }

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