/**
 * Safely parse number from any input
 */
export function safeParseNumber(value, defaultValue = 0) {
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse date from string
 */
export function safeParseDate(dateString, defaultValue = new Date()) {
  if (!dateString) return defaultValue;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? defaultValue : date;
}

/**
 * Validate and sanitize object properties
 */
export function sanitizeObject(obj, schema) {
  const result = {};
  Object.keys(schema).forEach(key => {
    const value = obj[key];
    const type = schema[key];
    
    if (type === 'string') {
      result[key] = value?.toString() || '';
    } else if (type === 'number') {
      result[key] = safeParseNumber(value);
    } else if (type === 'date') {
      result[key] = safeParseDate(value);
    } else if (type === 'boolean') {
      result[key] = !!value;
    } else if (type === 'array') {
      result[key] = Array.isArray(value) ? value : [];
    }
  });
  
  return result;
}
