/**
 * EduWiki WMD (Wiki Markdown) Parser — wmd-parser.js
 *
 * Converts .wmd source files into HTML for EduWiki.
 *
 * ── FRONTMATTER ────────────────────────────────────────────────────
 * Begins and ends with a line containing only "---".
 *
 *   ---
 *   title:       Article Title
 *   category:    mathematics
 *   author:      EduWiki Team
 *   lastUpdated: 2026-02-27
 *   tags:        math, calculus, derivatives
 *   featured:    true
 *   summary:     Short one-paragraph summary shown in the summary box.
 *   ---
 *
 * ── HEADINGS ───────────────────────────────────────────────────────
 *   ## Section Heading        → <h2>
 *   ### Subsection            → <h3>
 *   #### Sub-subsection       → <h4>
 *
 * ── INLINE FORMATTING ──────────────────────────────────────────────
 *   **bold**                  → <strong>
 *   *italic*                  → <em>
 *   ***bold italic***         → <strong><em>
 *   ~~strikethrough~~         → <del>
 *   `inline code`             → <code>
 *   $inline math$             → MathJax inline
 *   [link text](url)          → <a>
 *
 * ── BLOCK ELEMENTS ─────────────────────────────────────────────────
 *   $$...$$                   → display math block
 *   ```lang ... ```           → code block (fenced)
 *   > blockquote              → <blockquote>
 *   - item / * item           → <ul>
 *   1. item                   → <ol>
 *   | Col | Col |             → <table> (GFM-style with separator row)
 *   ---                       → <hr> (three or more dashes on own line)
 *
 * ── FENCED BLOCKS (::: ... :::) ────────────────────────────────────
 * All fenced blocks open with ":::type params" and close with ":::".
 *
 *   :::summary
 *   Paragraph text shown in the blue summary box.
 *   :::
 *
 *   :::notice
 *   Admin/warning notice (yellow box).
 *   :::
 *
 *   :::infobox Quick Facts
 *   | Field   | Value  |
 *   | Field 2 | Value2 |
 *   :::
 *
 *   :::dropdown Example Title
 *   Content shown when expanded. Supports full markdown.
 *   :::
 *
 *   :::desmos 400 | Graph Label
 *   [{"id":"f","latex":"y=x^2","color":"#2563eb"}]
 *   {"left":-5,"right":5,"bottom":-3,"top":10}
 *   :::
 *   (Second line for bounds is optional.)
 *
 *   :::figure ../media/image.png | Caption text
 *   :::
 *
 *   :::citations
 *   1. Author, A. (Year). *Title*. Publisher.
 *   2. Author, B. (Year). *Title*. [https://url](https://url)
 *   :::
 *
 *   :::quote Author Name
 *   The quote text goes here.
 *   :::
 */

/* global WMDParser */

const WMDParser = (() => {

  /* ── Utilities ───────────────────────────────────────────── */

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── Inline Parser ───────────────────────────────────────── */

  /**
   * Process inline markdown within a single line of text.
   * Protects LaTeX math and inline code from markdown processing.
   */
  function parseInline(text) {
    const slots = [];

    // Protect inline code  `...`
    text = text.replace(/`([^`\n]+)`/g, (_, code) => {
      const i = slots.length;
      slots.push(`<code>${escapeHtml(code)}</code>`);
      return `\x00${i}\x00`;
    });

    // Protect inline math  $...$  (not $$)
    text = text.replace(/\$([^$\n]+)\$/g, (match) => {
      const i = slots.length;
      slots.push(match);
      return `\x00${i}\x00`;
    });

    // Bold-italic  ***...***
    text = text.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold  **...**
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    // Italic  *...*
    text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    // Strikethrough  ~~...~~
    text = text.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
    // Links  [text](url)
    text = text.replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g, (_, linkText, href) => {
      const external = /^https?:\/\//.test(href);
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}"${attrs}>${linkText}</a>`;
    });

    // Restore protected slots
    return text.replace(/\x00(\d+)\x00/g, (_, idx) => slots[+idx]);
  }

  /* ── Frontmatter Parser ──────────────────────────────────── */

  function parseFrontmatter(source) {
    const lines = source.split('\n');
    const meta = {};
    let i = 0;

    if (lines[0] && lines[0].trim() === '---') {
      i = 1;
      while (i < lines.length && lines[i].trim() !== '---') {
        const m = lines[i].match(/^(\w+):\s*(.*)/);
        if (m) {
          const key = m[1].trim();
          const val = m[2].trim();
          if (key === 'tags') {
            meta.tags = val.split(',').map(t => t.trim()).filter(Boolean);
          } else if (val === 'true') {
            meta[key] = true;
          } else if (val === 'false') {
            meta[key] = false;
          } else {
            meta[key] = val;
          }
        }
        i++;
      }
      i++; // skip closing ---
    }

    return { meta, body: lines.slice(i).join('\n') };
  }

  /* ── Block Renderers ─────────────────────────────────────── */

  function renderSummaryBlock(bodyHtml) {
    return `<div class="wiki-summary" role="note"><strong>Summary</strong>${bodyHtml}</div>`;
  }

  function renderNoticeBlock(bodyHtml) {
    return `<div class="admin-notice" role="note">${bodyHtml}</div>`;
  }

  function renderInfoboxBlock(params, rawBody) {
    const title = params.trim() || 'Quick Facts';
    const rows = rawBody.trim().split('\n')
      .filter(l => l.trim().startsWith('|') && !/^\|[\s\-|:]+\|$/.test(l.trim()))
      .map(l => {
        const cols = l.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 2) {
          return `<tr><td>${parseInline(cols[0])}</td><td>${parseInline(cols[1])}</td></tr>`;
        }
        return '';
      }).filter(Boolean).join('\n');
    return `<div class="infobox" aria-label="Quick facts">
  <div class="infobox-title">${escapeHtml(title)}</div>
  <table>${rows}</table>
</div>`;
  }

  function renderDropdownBlock(params, bodyHtml) {
    const title = params.trim();
    return `<div class="wiki-dropdown">
  <button class="wiki-dropdown-trigger" type="button">${escapeHtml(title)}</button>
  <div class="wiki-dropdown-body">${bodyHtml}</div>
</div>`;
  }

  function renderDesmosBlock(params, rawBody) {
    // params: "height | label"  (height in px, label is display text)
    const pipeIdx = params.indexOf('|');
    const height = pipeIdx !== -1
      ? parseInt(params.slice(0, pipeIdx).trim()) || 400
      : parseInt(params.trim()) || 400;
    const label = pipeIdx !== -1
      ? params.slice(pipeIdx + 1).trim()
      : 'Interactive Graph';

    const bodyLines = rawBody.trim().split('\n');
    const expressions = bodyLines[0] ? bodyLines[0].trim() : '[]';
    const bounds = bodyLines[1] ? bodyLines[1].trim() : '';

    let attrs = `class="desmos-container" data-height="${height}" data-label="${escapeHtml(label)}" data-expressions='${expressions}'`;
    if (bounds) attrs += ` data-bounds='${bounds}'`;
    return `<div ${attrs}></div>`;
  }

  function renderFigureBlock(params) {
    // params: "src | caption"
    const pipeIdx = params.indexOf('|');
    const src = pipeIdx !== -1 ? params.slice(0, pipeIdx).trim() : params.trim();
    const caption = pipeIdx !== -1 ? params.slice(pipeIdx + 1).trim() : '';
    return `<figure class="wiki-figure">
  <img src="${src}" alt="${escapeHtml(caption || src)}">
  ${caption ? `<figcaption>${parseInline(caption)}</figcaption>` : ''}
</figure>`;
  }

  function renderCitationsBlock(rawBody) {
    const items = rawBody.trim().split('\n')
      .filter(l => /^\d+\./.test(l.trim()))
      .map(l => `<li>${parseInline(l.trim().replace(/^\d+\.\s*/, ''))}</li>`)
      .join('\n');
    return `<section class="wiki-citations" aria-labelledby="citations-heading">
  <h2 id="citations-heading">References</h2>
  <ol>${items}</ol>
</section>`;
  }

  function renderDatabaseBlock(params) {
    // params: "Title | path/to/data.json"
    const pipeIdx = params.indexOf('|');
    const title = pipeIdx !== -1 ? params.slice(0, pipeIdx).trim() : params.trim();
    const src   = pipeIdx !== -1 ? params.slice(pipeIdx + 1).trim() : '';
    return `<div class="wiki-database" data-src="${escapeHtml(src)}">
  <div class="wiki-database-header">
    <span class="wiki-database-title">${escapeHtml(title)}</span>
    <input class="wiki-database-search" type="search" placeholder="Search…" aria-label="Search ${escapeHtml(title)}">
    <label class="wiki-database-limit-label">Show <input class="wiki-database-limit" type="number" min="1" value="5" aria-label="Maximum results to show"> results</label>
  </div>
  <div class="wiki-database-body">
    <p class="wiki-database-loading">Loading…</p>
  </div>
</div>`;
  }

  function renderQuoteBlock(params, bodyHtml) {
    const attribution = params.trim();
    return `<blockquote>
  ${bodyHtml}
  ${attribution ? `<footer>— ${parseInline(attribution)}</footer>` : ''}
</blockquote>`;
  }

  /* ── Table Renderer ──────────────────────────────────────── */

  function renderTable(tableLines) {
    // Filter out separator rows (---|---|---)
    const dataRows = tableLines.filter(l => !/^\|[\s\-|:]+\|$/.test(l.trim()) && l.trim().startsWith('|'));
    if (!dataRows.length) return '';

    const parseCols = line => line.split('|').map(c => c.trim()).filter(Boolean);

    const [headerRow, ...bodyRows] = dataRows;
    const headCells = parseCols(headerRow).map(c => `<th>${parseInline(c)}</th>`).join('');
    const bodyHtml = bodyRows.map(row => {
      const cells = parseCols(row).map(c => `<td>${parseInline(c)}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('\n');

    return `<table>
  <thead><tr>${headCells}</tr></thead>
  <tbody>${bodyHtml}</tbody>
</table>`;
  }

  /* ── Main Block Parser ───────────────────────────────────── */

  /**
   * Parse a block of WMD content into an HTML string.
   * This is recursive — fenced blocks call parseBlocks on their body.
   */
  function parseBlocks(source) {
    const lines = source.split('\n');
    const output = [];
    let i = 0;
    let paragraphLines = [];

    function flushParagraph() {
      const text = paragraphLines.join(' ').trim();
      if (text) output.push(`<p>${parseInline(text)}</p>`);
      paragraphLines = [];
    }

    while (i < lines.length) {
      const raw = lines[i];
      const trimmed = raw.trim();

      // ── Blank line: flush paragraph ──────────────────────
      if (!trimmed) {
        flushParagraph();
        i++;
        continue;
      }

      // ── Fenced block  :::type params ─────────────────────
      const fencedOpen = trimmed.match(/^:::(\w+)(.*)/);
      if (fencedOpen) {
        flushParagraph();
        const blockType = fencedOpen[1];
        const blockParams = fencedOpen[2].trim();
        const blockLines = [];
        i++;
        while (i < lines.length && lines[i].trim() !== ':::') {
          blockLines.push(lines[i]);
          i++;
        }
        i++; // skip closing :::

        const rawBody = blockLines.join('\n');

        switch (blockType) {
          case 'summary':
            output.push(renderSummaryBlock(parseBlocks(rawBody)));
            break;
          case 'notice':
            output.push(renderNoticeBlock(parseBlocks(rawBody)));
            break;
          case 'infobox':
            output.push(renderInfoboxBlock(blockParams, rawBody));
            break;
          case 'dropdown':
            output.push(renderDropdownBlock(blockParams, parseBlocks(rawBody)));
            break;
          case 'desmos':
            output.push(renderDesmosBlock(blockParams, rawBody));
            break;
          case 'figure':
            output.push(renderFigureBlock(blockParams));
            break;
          case 'citations':
            output.push(renderCitationsBlock(rawBody));
            break;
          case 'database':
            output.push(renderDatabaseBlock(blockParams));
            break;
          case 'quote':
            output.push(renderQuoteBlock(blockParams, parseBlocks(rawBody)));
            break;
          default:
            output.push(`<div class="wmd-${escapeHtml(blockType)}">${parseBlocks(rawBody)}</div>`);
        }
        continue;
      }

      // ── Display math  $$ ... $$ ───────────────────────────
      if (trimmed === '$$') {
        flushParagraph();
        const mathLines = [];
        i++;
        while (i < lines.length && lines[i].trim() !== '$$') {
          mathLines.push(lines[i]);
          i++;
        }
        i++;
        output.push(`<div class="math-block">$$${mathLines.join('\n')}$$</div>`);
        continue;
      }
      // Single-line display math  $$...$$ on one line
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
        flushParagraph();
        output.push(`<div class="math-block">${trimmed}</div>`);
        i++;
        continue;
      }

      // ── Fenced code block  ``` lang ──────────────────────
      if (trimmed.startsWith('```')) {
        flushParagraph();
        const lang = trimmed.slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
        output.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        continue;
      }

      // ── Headings  ## / ### / #### ────────────────────────
      const h4m = trimmed.match(/^#### (.+)/);
      if (h4m) {
        flushParagraph();
        output.push(`<h4>${parseInline(h4m[1])}</h4>`);
        i++;
        continue;
      }
      const h3m = trimmed.match(/^### (.+)/);
      if (h3m) {
        flushParagraph();
        output.push(`<h3>${parseInline(h3m[1])}</h3>`);
        i++;
        continue;
      }
      const h2m = trimmed.match(/^## (.+)/);
      if (h2m) {
        flushParagraph();
        output.push(`<h2>${parseInline(h2m[1])}</h2>`);
        i++;
        continue;
      }

      // ── Horizontal rule  --- ─────────────────────────────
      if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
        flushParagraph();
        output.push('<hr>');
        i++;
        continue;
      }

      // ── Blockquote  > text ───────────────────────────────
      if (trimmed.startsWith('> ') || trimmed === '>') {
        flushParagraph();
        const qLines = [];
        while (i < lines.length && (lines[i].trim().startsWith('> ') || lines[i].trim() === '>')) {
          qLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        output.push(`<blockquote>${parseBlocks(qLines.join('\n'))}</blockquote>`);
        continue;
      }

      // ── Unordered list  - item  or  * item ───────────────
      if (/^[-*] /.test(trimmed)) {
        flushParagraph();
        const items = [];
        while (i < lines.length && /^[-*] /.test(lines[i].trim())) {
          items.push(`<li>${parseInline(lines[i].trim().replace(/^[-*] /, ''))}</li>`);
          i++;
        }
        output.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      // ── Ordered list  1. item ────────────────────────────
      if (/^\d+\. /.test(trimmed)) {
        flushParagraph();
        const items = [];
        while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
          items.push(`<li>${parseInline(lines[i].trim().replace(/^\d+\. /, ''))}</li>`);
          i++;
        }
        output.push(`<ol>${items.join('')}</ol>`);
        continue;
      }

      // ── Table  | col | col | ─────────────────────────────
      if (trimmed.startsWith('|')) {
        flushParagraph();
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        output.push(renderTable(tableLines));
        continue;
      }

      // ── Paragraph text ───────────────────────────────────
      paragraphLines.push(trimmed);
      i++;
    }

    flushParagraph();
    return output.join('\n');
  }

  /* ── Public API ──────────────────────────────────────────── */

  /**
   * Parse a full WMD source string.
   * Returns { meta: Object, html: string }
   *   meta — frontmatter key/value pairs
   *   html — rendered HTML body (no wrapper, no title/meta bar)
   */
  function parse(source) {
    const { meta, body } = parseFrontmatter(source);
    const html = parseBlocks(body);
    return { meta, html };
  }

  return { parse, parseInline, escapeHtml };

})();
