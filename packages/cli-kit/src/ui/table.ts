/**
 * Very small table renderer for CLI output.
 */
export type TableRow = (string | number | null | undefined)[];

export interface TableOptions {
  headers?: string[];
  padding?: number;
}

export function renderTable(rows: TableRow[], options: TableOptions = {}): string {
  const padding = options.padding ?? 2;
  const allRows: TableRow[] = options.headers ? [options.headers, ...rows] : rows;

  if (allRows.length === 0) return "";

  const colCount = Math.max(...allRows.map((r) => r.length));
  const widths: number[] = new Array(colCount).fill(0);

  for (const row of allRows) {
    row.forEach((cell, index) => {
      const text = cellToString(cell);
      widths[index] = Math.max(widths[index], text.length);
    });
  }

  const lines: string[] = [];

  allRows.forEach((row, rowIndex) => {
    const cells: string[] = [];
    for (let i = 0; i < colCount; i++) {
      const text = cellToString(row[i]);
      const padded = text + " ".repeat(widths[i] - text.length + padding);
      cells.push(padded);
    }
    lines.push(cells.join(""));
    if (options.headers && rowIndex === 0) {
      lines.push("-".repeat(widths.reduce((a, b) => a + b + padding, 0)));
    }
  });

  return lines.join("\n");
}

function cellToString(cell: string | number | null | undefined): string {
  if (cell === null || cell === undefined) return "";
  return String(cell);
}

export function printTable(rows: TableRow[], options: TableOptions = {}): void {
  const text = renderTable(rows, options);
  if (text) process.stdout.write(text + "\n");
}
