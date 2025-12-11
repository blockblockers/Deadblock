/**
 * API Utility
 * Provides request deduplication, caching, and standardized error handling
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { API, ERROR_CODES } from './constants';
import { logger } from './logger';

const log = logger.network;

// =============================================================================
// REQUEST CACHE & DEDUPLICATION
// =============================================================================

// In-flight requests for deduplication
const inFlightRequests = new Map();

// Response cache
const responseCache = new Map();

/**
 * Generate a cache key from request parameters
 */
function getCacheKey(table, operation, params) {
  return `${table}:${operation}:${JSON.stringify(params)}`;
}

/**
 * Check if cached response is still valid
 */
function isCacheValid(cacheEntry, maxAge = 30000) {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.timestamp < maxAge;
}

/**
 * Execute a Supabase query with deduplication and caching
 * 
 * @param {string} key - Unique key for this request
 * @param {Function} queryFn - Function that returns a Supabase query
 * @param {Object} options - Options for caching and deduplication
 * @returns {Promise<{data: any, error: any}>}
 */
export async function executeQuery(key, queryFn, options = {}) {
  const {
    cache = false,
    cacheMaxAge = 30000,
    deduplicate = true,
  } = options;

  // Check cache first
  if (cache) {
    const cached = responseCache.get(key);
    if (isCacheValid(cached, cacheMaxAge)) {
      log.debug(`Cache hit: ${key}`);
      return { data: cached.data, error: null, fromCache: true };
    }
  }

  // Check for in-flight request (deduplication)
  if (deduplicate && inFlightRequests.has(key)) {
    log.debug(`Deduplicating request: ${key}`);
    return inFlightRequests.get(key);
  }

  // Execute the query
  const promise = (async () => {
    try {
      const result = await queryFn();
      
      // Cache successful responses
      if (cache && !result.error) {
        responseCache.set(key, {
          data: result.data,
          timestamp: Date.now(),
        });
      }
      
      return result;
    } finally {
      // Remove from in-flight requests
      inFlightRequests.delete(key);
    }
  })();

  // Store in-flight request
  if (deduplicate) {
    inFlightRequests.set(key, promise);
  }

  return promise;
}

/**
 * Clear cache for a specific key or pattern
 */
export function clearCache(keyOrPattern = null) {
  if (!keyOrPattern) {
    responseCache.clear();
    log.debug('Cleared all cache');
    return;
  }
  
  if (typeof keyOrPattern === 'string') {
    // Clear exact key or pattern match
    for (const key of responseCache.keys()) {
      if (key === keyOrPattern || key.startsWith(keyOrPattern)) {
        responseCache.delete(key);
      }
    }
  }
}

// =============================================================================
// STANDARDIZED API RESPONSES
// =============================================================================

/**
 * Create a standardized success response
 */
export function successResponse(data, meta = {}) {
  return {
    success: true,
    data,
    error: null,
    ...meta,
  };
}

/**
 * Create a standardized error response
 */
export function errorResponse(error, code = null) {
  return {
    success: false,
    data: null,
    error: {
      message: error?.message || String(error),
      code: code || error?.code || ERROR_CODES.NETWORK_ERROR,
    },
  };
}

// =============================================================================
// SUPABASE HELPERS
// =============================================================================

/**
 * Check if Supabase is configured and available
 */
export function checkSupabase() {
  if (!isSupabaseConfigured()) {
    return errorResponse('Online features not configured', ERROR_CODES.NOT_CONFIGURED);
  }
  return null;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  const check = checkSupabase();
  if (check) return { user: null, error: check.error };
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  } catch (err) {
    return { user: null, error: err };
  }
}

/**
 * Require authentication, return error if not authenticated
 */
export async function requireAuth() {
  const { user, error } = await getCurrentUser();
  
  if (error) {
    return errorResponse(error);
  }
  
  if (!user) {
    return errorResponse('Not authenticated', ERROR_CODES.NOT_AUTHENTICATED);
  }
  
  return { user };
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

/**
 * Execute a function with retry logic
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise<any>}
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = API.MAX_RETRIES,
    delayBase = API.RETRY_DELAY_BASE,
    shouldRetry = (error) => true,
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // Exponential backoff
      const delay = delayBase * Math.pow(2, attempt);
      log.debug(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  throw lastError;
}

// =============================================================================
// TIMEOUT WRAPPER
// =============================================================================

/**
 * Wrap a promise with a timeout
 * 
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} message - Timeout error message
 * @returns {Promise<any>}
 */
export function withTimeout(promise, timeout = API.REQUEST_TIMEOUT, message = 'Request timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(message));
      }, timeout);
    }),
  ]);
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Execute multiple queries in parallel with a concurrency limit
 * 
 * @param {Array<Function>} queries - Array of query functions
 * @param {number} concurrency - Max concurrent requests
 * @returns {Promise<Array>}
 */
export async function batchQueries(queries, concurrency = 5) {
  const results = [];
  const executing = [];
  
  for (const query of queries) {
    const promise = query().then(result => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Classify an error for appropriate handling
 */
export function classifyError(error) {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code;
  
  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return { type: 'network', retryable: true };
  }
  
  // Authentication errors
  if (code === '401' || message.includes('unauthorized') || message.includes('not authenticated')) {
    return { type: 'auth', retryable: false };
  }
  
  // Not found
  if (code === ERROR_CODES.NOT_FOUND || message.includes('not found')) {
    return { type: 'notFound', retryable: false };
  }
  
  // Rate limiting
  if (code === '429' || message.includes('rate limit')) {
    return { type: 'rateLimit', retryable: true };
  }
  
  // Server errors
  if (code?.startsWith?.('5') || message.includes('server error')) {
    return { type: 'server', retryable: true };
  }
  
  // Default
  return { type: 'unknown', retryable: false };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const api = {
  executeQuery,
  clearCache,
  successResponse,
  errorResponse,
  checkSupabase,
  getCurrentUser,
  requireAuth,
  withRetry,
  withTimeout,
  batchQueries,
  classifyError,
};

export default api;
