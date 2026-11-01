const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const inlineMarkdown = (value) => {
  const code = [];
  let html = escapeHtml(value).replace(/`([^`]+)`/g, (_match, text) => {
    const token = `\u0000${code.length}\u0000`;
    code.push(`<code>${text}</code>`);
    return token;
  });
  html = html
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_match, a, b) => `<strong>${a ?? b}</strong>`)
    .replace(/\*([^*\n]+)\*|_([^_\n]+)_/g, (_match, a, b) => `<em>${a ?? b}</em>`);
  return html.replace(/\u0000(\d+)\u0000/g, (_match, index) => code[Number(index)]);
};

const tableCells = (line) => {
  const normalized = line.trim().replace(/\\\|/g, '\u0000');
  const cells = normalized.replace(/^\|/, '').replace(/\|$/, '').split('|');
  return cells.map((cell) => cell.replace(/\u0000/g, '|').trim());
};

const tableAlignment = (cell) => {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  return 'left';
};

const isTableSeparator = (line) => {
  const cells = tableCells(line);
  return line.includes('|') && cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

const isListItem = (line) => /^\s*(?:[-+*]|\d+[.)])\s+/.test(line);
const isBlockStart = (lines, index) => {
  const line = lines[index];
  return /^#{1,6}\s+/.test(line)
    || /^([-*_])(?:\s*\1){2,}\s*$/.test(line.trim())
    || /^\s*>/.test(line)
    || isListItem(line)
    || (line.includes('|') && isTableSeparator(lines[index + 1] ?? ''));
};

export function renderAcademyMarkdown(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const tag = heading[1].length <= 3 ? 'h4' : 'h5';
      blocks.push(`<${tag}>${inlineMarkdown(heading[2])}</${tag}>`);
      index += 1;
      continue;
    }

    if (/^([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push('<hr>');
      index += 1;
      continue;
    }

    if (line.includes('|') && isTableSeparator(lines[index + 1] ?? '')) {
      const headers = tableCells(line);
      const alignments = tableCells(lines[index + 1]).map(tableAlignment);
      const cell = (text, tag, cellIndex) =>
        `<${tag} class="is-align-${alignments[cellIndex] ?? 'left'}">${inlineMarkdown(text ?? '')}</${tag}>`;
      const header = `<thead><tr>${headers.map((text, cellIndex) => cell(text, 'th', cellIndex)).join('')}</tr></thead>`;
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        const values = tableCells(lines[index]);
        rows.push(`<tr>${headers.map((_text, cellIndex) => cell(values[cellIndex], 'td', cellIndex)).join('')}</tr>`);
        index += 1;
      }
      blocks.push(`<div class="academy-table-wrap"><table>${header}<tbody>${rows.join('')}</tbody></table></div>`);
      continue;
    }

    if (isListItem(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length && isListItem(lines[index])) {
        const item = lines[index].match(/^\s*(?:[-+*]|\d+[.)])\s+(.+)$/);
        items.push(`<li>${inlineMarkdown(item[1])}</li>`);
        index += 1;
      }
      blocks.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, '').trim());
        index += 1;
      }
      blocks.push(`<blockquote><p>${quote.map(inlineMarkdown).join('<br>')}</p></blockquote>`);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`);
  }

  return blocks.join('');
}
