import { Fragment, type ReactNode } from "react";

/**
 * Renders the assistant's answer.
 *
 * The model is asked for plain prose with optional bullet points, bold and
 * [Source] citations. That small subset is rendered here on purpose instead
 * of pulling in a Markdown library: nothing the model writes is ever treated
 * as HTML, so there is no sanitisation problem to solve.
 */

interface AnswerTextProps {
  text: string;
}

const CITATION_RE = /\[([^[\]\n]{2,80})\]/g;
const BOLD_RE = /\*\*([^*\n]+)\*\*/g;

/** `**bold**` and `[Citation]` inside one line. */
function renderInline(line: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let index = 0;

  const pushText = (text: string) => {
    if (!text) return;
    // Bold inside plain text.
    let cursor = 0;
    for (const match of text.matchAll(BOLD_RE)) {
      const start = match.index ?? 0;
      if (start > cursor) parts.push(text.slice(cursor, start));
      parts.push(<strong key={`${keyPrefix}-b${index++}`}>{match[1]}</strong>);
      cursor = start + match[0].length;
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
  };

  for (const match of line.matchAll(CITATION_RE)) {
    const start = match.index ?? 0;
    pushText(line.slice(last, start));
    parts.push(
      <cite className="answer__cite" key={`${keyPrefix}-c${index++}`} title={match[1]}>
        {match[1]}
      </cite>,
    );
    last = start + match[0].length;
  }
  pushText(line.slice(last));
  return parts;
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "h"; text: string };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", lines: paragraph });
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      continue;
    }

    const heading = /^#{1,4}\s+(.+)$/.exec(trimmed);
    if (heading) {
      flush();
      blocks.push({ kind: "h", text: heading[1] });
      continue;
    }

    const bullet = /^[-*•]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ul") last.items.push(bullet[1]);
      else blocks.push({ kind: "ul", items: [bullet[1]] });
      continue;
    }

    const numbered = /^\d{1,2}[.)]\s+(.+)$/.exec(trimmed);
    if (numbered) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ol") last.items.push(numbered[1]);
      else blocks.push({ kind: "ol", items: [numbered[1]] });
      continue;
    }

    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

export default function AnswerText({ text }: AnswerTextProps) {
  const blocks = parseBlocks(text);

  return (
    <div className="answer" dir="auto">
      {blocks.map((block, blockIndex) => {
        const key = `blk${blockIndex}`;
        switch (block.kind) {
          case "h":
            return (
              <p className="answer__heading" key={key}>
                {renderInline(block.text, key)}
              </p>
            );
          case "ul":
            return (
              <ul key={key}>
                {block.items.map((item, i) => (
                  <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key}>
                {block.items.map((item, i) => (
                  <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={key}>
                {block.lines.map((line, i) => (
                  <Fragment key={`${key}-${i}`}>
                    {i > 0 ? <br /> : null}
                    {renderInline(line, `${key}-${i}`)}
                  </Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
