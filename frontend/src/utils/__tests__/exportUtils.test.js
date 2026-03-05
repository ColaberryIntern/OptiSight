import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCSV } from '../exportUtils';

describe('exportToCSV', () => {
  let mockClick;
  let mockAnchor;
  let mockRevokeObjectURL;
  let mockCreateObjectURL;

  beforeEach(() => {
    mockClick = vi.fn();
    mockAnchor = { href: '', download: '', click: mockClick };

    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);

    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  it('creates correct CSV content with headers and rows', () => {
    const data = [
      { name: 'Widget A', price: 10, qty: 5 },
      { name: 'Widget B', price: 20, qty: 3 },
    ];

    exportToCSV(data, 'products');

    // Verify Blob was created with correct CSV content
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);

    // Read Blob content
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = () => {
        const csv = reader.result;
        const lines = csv.split('\n');
        expect(lines[0]).toBe('name,price,qty');
        expect(lines[1]).toBe('"Widget A","10","5"');
        expect(lines[2]).toBe('"Widget B","20","3"');
        resolve();
      };
      reader.readAsText(blobArg);
    });
  });

  it('handles empty data array without error', () => {
    expect(() => exportToCSV([], 'empty')).not.toThrow();
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it('handles null/undefined data without error', () => {
    expect(() => exportToCSV(null, 'null')).not.toThrow();
    expect(() => exportToCSV(undefined, 'undef')).not.toThrow();
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it('escapes commas and quotes in values', () => {
    const data = [
      { description: 'Item with "quotes"', notes: 'has, comma' },
    ];

    exportToCSV(data, 'escaped');

    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = () => {
        const csv = reader.result;
        const lines = csv.split('\n');
        // Quotes should be doubled, values wrapped in quotes
        expect(lines[1]).toBe('"Item with ""quotes""","has, comma"');
        resolve();
      };
      reader.readAsText(blobArg);
    });
  });

  it('triggers download with correct filename', () => {
    const data = [{ a: 1 }];
    const today = new Date().toISOString().split('T')[0];

    exportToCSV(data, 'report');

    expect(mockAnchor.download).toBe(`report-${today}.csv`);
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('handles null values in data cells', () => {
    const data = [{ name: 'Test', value: null }];

    exportToCSV(data, 'nulls');

    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = () => {
        const csv = reader.result;
        const lines = csv.split('\n');
        expect(lines[1]).toBe('"Test",""');
        resolve();
      };
      reader.readAsText(blobArg);
    });
  });
});
