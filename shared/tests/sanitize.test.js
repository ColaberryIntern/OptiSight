const { escapeHtml, sanitizeSqlInput, sanitizeObject } = require('../utils/sanitize');

describe('escapeHtml', () => {
  test('escapes < and > characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  test('escapes & character', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  test('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  test('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  test('returns non-string input unchanged', () => {
    expect(escapeHtml(42)).toBe(42);
    expect(escapeHtml(null)).toBe(null);
    expect(escapeHtml(undefined)).toBe(undefined);
    expect(escapeHtml(true)).toBe(true);
  });
});

describe('sanitizeSqlInput', () => {
  test('removes single quotes, double quotes, semicolons, and backslashes', () => {
    expect(sanitizeSqlInput("Robert'; DROP TABLE users;--")).toBe(
      'Robert DROP TABLE users--'
    );
  });

  test('removes backslashes', () => {
    expect(sanitizeSqlInput('path\\to\\file')).toBe('pathtofile');
  });

  test('returns non-string input unchanged', () => {
    expect(sanitizeSqlInput(123)).toBe(123);
    expect(sanitizeSqlInput(null)).toBe(null);
    expect(sanitizeSqlInput(undefined)).toBe(undefined);
  });
});

describe('sanitizeObject', () => {
  test('sanitizes nested string values', () => {
    const input = {
      name: '<b>Bold</b>',
      details: {
        description: 'A & B',
      },
    };
    const result = sanitizeObject(input);
    expect(result.name).toBe('&lt;b&gt;Bold&lt;/b&gt;');
    expect(result.details.description).toBe('A &amp; B');
  });

  test('handles arrays by recursing into each element', () => {
    const input = [
      { tag: '<script>' },
      { tag: 'safe' },
      { tag: '<img>' },
    ];
    const result = sanitizeObject(input);
    expect(result).toEqual([
      { tag: '&lt;script&gt;' },
      { tag: 'safe' },
      { tag: '&lt;img&gt;' },
    ]);
  });

  test('preserves non-string values', () => {
    const input = {
      count: 42,
      active: true,
      data: null,
      label: '<em>test</em>',
    };
    const result = sanitizeObject(input);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.data).toBe(null);
    expect(result.label).toBe('&lt;em&gt;test&lt;/em&gt;');
  });

  test('returns non-object input unchanged', () => {
    expect(sanitizeObject(null)).toBe(null);
    expect(sanitizeObject(undefined)).toBe(undefined);
    expect(sanitizeObject('')).toBe('');
    expect(sanitizeObject(0)).toBe(0);
  });
});
