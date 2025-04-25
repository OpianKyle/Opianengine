/**
 * API utility functions for making authenticated requests
 * 
 * This module provides helper functions to make consistent API requests
 * with proper authentication handling.
 */
import { getStoredToken } from '../hooks/use-auth';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Make an authenticated API request
 * 
 * @param endpoint - API endpoint (should start with '/')
 * @param options - Request options including method, body, etc.
 * @returns Promise with the response data
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...restOptions } = options;
  
  // Add query parameters if provided
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, value);
    });
    url += `?${searchParams.toString()}`;
  }

  // Get authentication token
  const token = getStoredToken();
  
  // Prepare headers with authentication
  const requestHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };
  
  // Add token to headers if available
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  // Make the request
  const response = await fetch(url, {
    headers: requestHeaders,
    credentials: 'include', // Include cookies
    ...restOptions,
  });
  
  // Handle response
  if (!response.ok) {
    // Try to parse error message from the response
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || `API request failed: ${response.status}`);
    } catch (parseError) {
      throw new Error(`API request failed: ${response.status}`);
    }
  }
  
  // Parse JSON response
  try {
    return await response.json();
  } catch (error) {
    return {} as T; // Return empty object if no JSON data
  }
}

/**
 * Make a GET request
 */
export function get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET', ...options });
}

/**
 * Make a POST request
 */
export function post<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

/**
 * Make a PUT request
 */
export function put<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

/**
 * Make a DELETE request
 */
export function del<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE', ...options });
}