/**
 * Simple in-memory cache utility for database queries
 * 
 * This module provides caching functionality for expensive database queries.
 * It's a simple implementation without eviction policies other than TTL.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Get data from cache or execute the query function and cache the result
   * @param key The cache key
   * @param queryFn Function to execute if cache miss
   * @param ttl Time to live in milliseconds
   * @returns The data from cache or query function
   */
  async getOrFetch<T>(
    key: string, 
    queryFn: () => Promise<T>, 
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cachedEntry = this.cache.get(key);
    const now = Date.now();
    
    // Return cached data if valid
    if (cachedEntry && now - cachedEntry.timestamp < ttl) {
      console.log(`[CACHE] Hit for key: ${key}`);
      return cachedEntry.data;
    }
    
    // Cache miss or expired, execute query function
    console.log(`[CACHE] Miss for key: ${key}`);
    const data = await queryFn();
    
    // Cache the result
    this.cache.set(key, {
      data,
      timestamp: now
    });
    
    return data;
  }

  /**
   * Invalidate a specific cache key
   * @param key The cache key to invalidate
   */
  invalidate(key: string): void {
    console.log(`[CACHE] Invalidated key: ${key}`);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries with keys matching a pattern
   * @param pattern The pattern to match (string or regex)
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      : pattern;
    
    let count = 0;
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    });
    
    console.log(`[CACHE] Invalidated ${count} keys matching pattern: ${pattern}`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    console.log(`[CACHE] Cleared all ${this.cache.size} entries`);
    this.cache.clear();
  }
}

// Export a singleton instance
export const queryCache = new QueryCache();