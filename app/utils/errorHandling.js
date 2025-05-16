import { analyticsLogger } from "../services/loggerService";

/**
 * Standard error handler for API responses
 */
export function handleApiError(error, context, details = {}) {
  // Log the full error for debugging
  analyticsLogger.error(`API Error in ${context}:`, error, details);
  
  // Return a sanitized error for the client
  return {
    error: "An error occurred while processing your request",
    errorCode: error.code || "UNKNOWN_ERROR",
    // Only include non-sensitive details in development
    ...(process.env.NODE_ENV !== 'production' ? { message: error.message } : {})
  };
}
