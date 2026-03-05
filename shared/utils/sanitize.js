/**
 * Sanitizes a string to prevent XSS by escaping HTML special characters.
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Strips potential SQL injection patterns from a string.
 * Note: This is a defense-in-depth measure. Always use parameterized queries.
 */
function sanitizeSqlInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/['";\\]/g, '');
}

/**
 * Sanitizes an object's string values recursively.
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = escapeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

module.exports = { escapeHtml, sanitizeSqlInput, sanitizeObject };
