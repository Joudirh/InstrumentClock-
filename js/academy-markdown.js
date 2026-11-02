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
    || /^```/.test(line)
    || /^([-*_])(?:\s*\1){2,}\s*$/.test(line.trim())
    || /^\s*>/.test(line)
    || isListItem(line)
    || (line.includes('|') && isTableSeparator(lines[index + 1] ?? ''));
};

const parseMermaidGraph = (source) => {
  const lines = source.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!/^graph\s+(?:TD|TB|LR|RL|BT)\b/i.test(lines[0] ?? '')) return null;

  const nodes = new Map();
  const edges = [];
  for (const line of lines.slice(1)) {
    const edgePattern = /([A-Za-z_][\w-]*)(?:\s*(?:\[[^\]]*\]|\{[^}]*\}|\([^)]*\)))?\s*-->\s*(?:\|[^|]*\|\s*)?([A-Za-z_][\w-]*)/g;
    for (const match of line.matchAll(edgePattern)) {
      edges.push([match[1], match[2]]);
    }

    const declarationPattern = /([A-Za-z_][\w-]*)\s*(?:\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\))/g;
    for (const match of line.matchAll(declarationPattern)) {
      nodes.set(match[1], (match[2] ?? match[3] ?? match[4]).trim());
    }
  }
  for (const [from, to] of edges) {
    if (!nodes.has(from)) nodes.set(from, from);
    if (!nodes.has(to)) nodes.set(to, to);
  }
  if (!edges.length) return null;

  const incoming = new Set(edges.map(([, to]) => to));
  const roots = [...nodes.keys()].filter((id) => !incoming.has(id));
  if (roots.length !== 1) return null;

  const children = new Map();
  for (const [from, to] of edges) {
    const nodeChildren = children.get(from) || [];
    if (!nodeChildren.includes(to)) nodeChildren.push(to);
    children.set(from, nodeChildren);
  }
  return { nodes, children, root: roots[0] };
};

const renderMermaidInfographic = (source, caption) => {
  const graph = parseMermaidGraph(source);
  if (!graph) {
    return `<pre class="academy-code-block"><code>${escapeHtml(source)}</code></pre>`;
  }

  const { nodes, children, root } = graph;
  const renderChildren = (id, ancestors = new Set()) => {
    const descendants = children.get(id) || [];
    if (!descendants.length) return '';
    const nextAncestors = new Set(ancestors).add(id);
    return `<ul>${descendants
      .map((child) => {
        const label = escapeHtml(nodes.get(child) ?? child);
        const nested = nextAncestors.has(child) ? '' : renderChildren(child, nextAncestors);
        return `<li><span>${label}</span>${nested}</li>`;
      })
      .join('')}</ul>`;
  };
  const branches = (children.get(root) || []).map((id, index) => `
    <section class="academy-infographic-branch">
      <h3><span class="academy-infographic-index">${String(index + 1).padStart(2, '0')}</span>${escapeHtml(nodes.get(id) ?? id)}</h3>
      ${renderChildren(id, new Set([root]))}
    </section>
  `).join('');

  return `<figure class="academy-infographic">
    ${caption ? `<figcaption>${caption}</figcaption>` : ''}
    <div class="academy-infographic-root">${escapeHtml(nodes.get(root) ?? root)}</div>
    <div class="academy-infographic-branches">${branches}</div>
  </figure>`;
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

    if (/^```/.test(line)) {
      const language = line.slice(3).trim().toLowerCase();
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;

      if (language === 'mermaid') {
        const previousBlock = blocks.at(-1);
        const title = previousBlock?.match(/^<p><strong>(.+)<\/strong><\/p>$/);
        if (title) blocks.pop();
        blocks.push(renderMermaidInfographic(codeLines.join('\n'), title?.[1] ?? ''));
      } else {
        blocks.push(`<pre class="academy-code-block"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      }
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
