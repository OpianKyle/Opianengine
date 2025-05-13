/**
 * TIMEOUT FUNCTIONALITY REMOVED
 * 
 * This hook was causing registration timeouts and has been completely disabled.
 * The registration process was timing out when agents were signing up customers.
 */

interface SessionTimeoutOptions {
  timeoutMinutes?: number;
  warningBeforeMinutes?: number;
  onWarning?: () => void;
  ignoredPaths?: string[];
}

/**
 * Empty stub hook that maintains the API but doesn't implement timeouts
 * This prevents registration timeouts when agents are signing up customers
 */
export function useSessionTimeout(_options: SessionTimeoutOptions = {}) {
  // This function does nothing - all timeout functionality has been removed
  const resetTimer = () => {
    // No-op function
  };
  
  return {
    resetTimer,
  };
}