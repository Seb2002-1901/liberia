"use client";

import * as React from "react";

/**
 * Minimal markdown renderer for coach responses.
 * Handles: paragraphs, **bold**, *italic*, `code`, bullet lists.
 * No HTML injection — content is rendered as React text nodes.
 */
export function Markdown({ text }: { text: string }) {
  const blocks = splitBlocks(text);
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-foreground">
      {blocks.map((block, i) =>
        block.type === "ul" ? (
          <ul key={i} className="ml-5 list-disc space-y-1">
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(block.text)}
          </p>
        ),
      )}
    </div>
  );
}

type Block = { type: "p"; text: string } | { type: "ul"; items: string[] };

function splitBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let buffer: string[] = [];
  let listBuffer: string[] = [];

  const flushPara = () => {
    if (buffer.length) {
      blocks.push({ type: "p", text: buffer.join("\n").trim() });
      buffer = [];
    }
  };
  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({ type: "ul", items: listBuffer });
      listBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trimStart();
    const isItem = /^[-*]\s+/.test(trimmed);
    if (isItem) {
      flushPara();
      listBuffer.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (trimmed === "") {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    buffer.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  // Split by tokens: **bold**, *italic*, `code`.
  const parts: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/;
  while (rest.length) {
    const match = rest.match(pattern);
    if (!match) {
      parts.push(rest);
      break;
    }
    const idx = match.index ?? 0;
    if (idx > 0) parts.push(rest.slice(0, idx));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`b-${key++}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={`c-${key++}`}
          className="rounded bg-secondary/60 px-1 py-0.5 font-mono text-[13px]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={`i-${key++}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    rest = rest.slice(idx + token.length);
  }
  return <>{parts}</>;
}
