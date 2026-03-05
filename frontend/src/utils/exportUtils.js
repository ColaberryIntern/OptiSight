/**
 * Convert array of objects to CSV string and trigger download.
 *
 * @param {Array<Object>} data  - rows to export
 * @param {string}        filename - base filename (date suffix added automatically)
 */
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h] ?? '';
        // Escape commas and quotes in values
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    ),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Print current page section as PDF-like output using the browser print dialog.
 *
 * Looks for an element with id="dashboard-export-area" and copies its HTML
 * into a new window styled for printing.
 *
 * @param {string} title - report title shown at the top of the printed page
 */
export function exportToPrint(title) {
  const printWindow = window.open('', '_blank');
  const content = document.getElementById('dashboard-export-area');
  if (!content || !printWindow) return;

  printWindow.document.write(`
    <html>
      <head><title>${title}</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          h1 { color: #1A73E8; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${content.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
