import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split(/\r?\n/);

  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      elements.push(
        <p key={elements.length} style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
          {currentParagraph.join(" ")}
        </p>
      );
      currentParagraph = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      flushParagraph();
      elements.push(
        <h1
          key={elements.length}
          style={{
            fontSize: 26,
            fontWeight: 600,
            margin: "0 0 12px"
          }}
        >
          {trimmed.replace(/^# /, "")}
        </h1>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      elements.push(
        <h2
          key={elements.length}
          style={{
            fontSize: 20,
            fontWeight: 600,
            margin: "18px 0 8px"
          }}
        >
          {trimmed.replace(/^## /, "")}
        </h2>
      );
      return;
    }
    if (trimmed.startsWith("- ")) {
      flushParagraph();
      const items: string[] = [];
      items.push(trimmed.replace(/^- /, ""));
      elements.push(
        <ul key={elements.length} style={{ margin: "0 0 10px 16px", padding: 0 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 4, lineHeight: 1.5 }}>
              {item}
            </li>
          ))}
        </ul>
      );
      return;
    }
    if (trimmed.length === 0) {
      flushParagraph();
      return;
    }
    currentParagraph.push(trimmed);
  });

  flushParagraph();

  return <div>{elements}</div>;
};
