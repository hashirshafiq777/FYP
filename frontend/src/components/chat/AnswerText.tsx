import { Fragment, type ReactNode } from "react";

/**
 * Renders the assistant's answer.
 *
 * A deliberately small Markdown subset — headings, bullet and numbered lists,
 * tables, horizontal rules, bold and [Source] citations — is parsed here
 * instead of pulling in a Markdown library: nothing the model writes is ever
 * treated as HTML, so there is no sanitisation problem to solve.
 *
 * Models do not always honour the formatting rules in the system prompt, so
 * this renderer is forgiving: a stray `<br>` becomes a line break and any
 * other HTML tag that leaks through is dropped rather than shown as literal
 * angle-bracket text.
 */

interface AnswerTextProps {
  text: string;
}

const CITATION_RE = /\[([^[\]\n]{2,80})\]/g;
const BOLD_RE = /\*\*([^*\n]+)\*\*/g;
const BR_RE = /<br\s*\/?>/gi;
const HTML_TAG_RE = /<\/?[a-zA-Z][^>\n]{0,200}>/g;

/**
 * Stand-in for a `<br>` while the text is still being split into lines.
 * Converting straight to "\n" would break a table row into several lines and
 * destroy the table, so the break is carried inside the line and resolved when
 * the line (or table cell) is finally rendered.
 */
const BREAK = "\u0000br\u0000";

function stripHtml(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(BR_RE, BREAK).replace(HTML_TAG_RE, "");
}

/** `**bold**` and `[Citation]` inside one line, plus carried `<br>` breaks. */
function renderInline(line: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let index = 0;

  const pushBold = (text: string) => {
    if (!text) return;
    let cursor = 0;
    for (const match of text.matchAll(BOLD_RE)) {
      const start = match.index ?? 0;
      if (start > cursor) parts.push(text.slice(cursor, start));
      parts.push(<strong key={`${keyPrefix}-b${index++}`}>{match[1]}</strong>);
      cursor = start + match[0].length;
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
  };

  const pushSegment = (segment: string) => {
    let last = 0;
    for (const match of segment.matchAll(CITATION_RE)) {
      const start = match.index ?? 0;
      pushBold(segment.slice(last, start));
      parts.push(
        <cite className="answer__cite" key={`${keyPrefix}-c${index++}`} title={match[1]}>
          {match[1]}
        </cite>,
      );
      last = start + match[0].length;
    }
    pushBold(segment.slice(last));
  };

  const segments = line.split(BREAK);
  segments.forEach((segment, i) => {
    if (i > 0) parts.push(<br key={`${keyPrefix}-br${index++}`} />);
    pushSegment(segment);
  });

  return parts;
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "h"; text: string }
  | { kind: "hr" }
  | { kind: "table"; header: string[]; rows: string[][] };

/** Split `| a | b |` into its cells, tolerating a missing leading/trailing pipe. */
function splitRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|")) body = body.slice(0, -1);
  return body.split("|").map((cell) => cell.trim());
}

function looksLikeRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes("|") && trimmed.replace(/[^|]/g, "").length >= 2;
}

/** The `|---|:--:|` line directly under a table's header. */
function isSeparatorRow(line: string): boolean {
  if (!line.includes("-")) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{1,}:?$/.test(cell));
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = stripHtml(text).split("\n");
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", lines: paragraph });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();

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

    // A table only starts where a row is followed by a separator; that check
    // also keeps a lone "---" from being mistaken for one.
    if (looksLikeRow(trimmed) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      flush();
      const header = splitRow(trimmed);
      const rows: string[][] = [];
      i += 1; // skip the separator

      while (i + 1 < lines.length && looksLikeRow(lines[i + 1])) {
        i += 1;
        if (isSeparatorRow(lines[i])) continue;
        const cells = splitRow(lines[i]);
        // Pad or trim so every row matches the header width.
        while (cells.length < header.length) cells.push("");
        rows.push(cells.slice(0, header.length));
      }

      blocks.push({ kind: "table", header, rows });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flush();
      blocks.push({ kind: "hr" });
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
          case "hr":
            return <hr className="answer__rule" key={key} />;
          case "table":
            return (
              <div className="answer__table-wrap" key={key}>
                <table className="answer__table">
                  <thead>
                    <tr>
                      {block.header.map((cell, i) => (
                        <th key={`${key}-h${i}`} scope="col">
                          {renderInline(cell, `${key}-h${i}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={`${key}-r${r}`}>
                        {row.map((cell, c) => (
                          <td key={`${key}-r${r}c${c}`}>
                            {renderInline(cell, `${key}-r${r}c${c}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
