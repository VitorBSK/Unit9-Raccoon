/**
 * Render a simple ASCII banner for Unit09 CLI tools.
 */
export function renderBanner(title: string, subtitle?: string): string {
  const border = "+------------------------------------------+";
  const lines: string[] = [];
  lines.push(border);
  const centeredTitle = centerText(title, border.length - 2);
  lines.push("|" + centeredTitle + "|");
  if (subtitle) {
    const centeredSubtitle = centerText(subtitle, border.length - 2);
    lines.push("|" + centeredSubtitle + "|");
  }
  lines.push(border);
  return lines.join("\n");
}

function centerText(text: string, width: number): string {
  const trimmed = text.length > width ? text.slice(0, width) : text;
  const paddingTotal = width - trimmed.length;
  const left = Math.floor(paddingTotal / 2);
  const right = paddingTotal - left;
  return " ".repeat(left) + trimmed + " ".repeat(right);
}

export function printBanner(title: string, subtitle?: string): void {
  process.stdout.write(renderBanner(title, subtitle) + "\n");
}
