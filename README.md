# EduWiki

Live site: https://hyrumhendrickson.github.io/wiki/

EduWiki is a static, open-source educational wiki built with plain HTML, CSS, and JavaScript. Articles are written in **WMD (Wiki Markdown)** — a custom lightweight markup language that gets converted to a fully formatted wiki page automatically in the browser.

## Writing Articles — WMD Format

All articles are plain-text `.wmd` files in the `articles/` folder. No HTML knowledge required.

### Minimal Example

```
---
title:       My Article Title
category:    mathematics
author:      Your Name
lastUpdated: 2026-02-27
tags:        keyword1, keyword2
featured:    false
---

:::summary
A 2–4 sentence summary shown at the top of the article.
:::

## First Section

Paragraph text with **bold**, *italic*, `code`, $inline math$, and [links](https://url).

$$\text{Display math block}$$

### Subsection

- Bullet item
- Another item

:::dropdown Example Title
Expandable worked example with full markdown support.
:::

## Second Section

More content…

## See Also

- [Related Article 1](article.html?id=related-article-1)
- [Related Article 2](article.html?id=related-article-2)
- [Related Article 3](article.html?id=related-article-3)
- [Related Article 4](article.html?id=related-article-4)
- [Related Article 5](article.html?id=related-article-5)

:::citations
1. Author, A. (Year). *Title*. Publisher.
:::
```

### Fenced Block Types

| Block | Syntax | Purpose |
|-------|--------|---------|
| Summary | `:::summary ... :::` | Blue summary box at the top of every article |
| Infobox | `:::infobox Title ... :::` | Right-floating facts table (rows: `\| Key \| Value \|`) |
| Dropdown | `:::dropdown Title ... :::` | Expandable accordion section |
| Desmos | `:::desmos 400 \| Label ... :::` | Interactive Desmos graph |
| Figure | `:::figure path \| Caption :::` | Centered image with caption |
| Citations | `:::citations ... :::` | Numbered references section |
| Notice | `:::notice ... :::` | Yellow admin notice box |
| Quote | `:::quote Attribution ... :::` | Styled blockquote |
| Database | `:::database Title \| path/to/data.json :::` | Client-side searchable table from a JSON file |

See `admin/admin-article.html?id=wmd-reference` (or `admin/admin-article.html?id=create-article`) for full documentation.

### Adding a New Article

1. Create `articles/your-article-id.wmd` using the template above.
2. Add an entry to the last file in `config/articles/` (e.g. `config/articles/articles-5.json`). Each file in that folder is a JSON array of article objects and must not exceed 600 lines. If the last file is near the limit, create a new `articles-N.json` and add it to the `"files"` list in `config/articles.json`:
   ```json
   {
     "id": "your-article-id",
     "title": "Your Article Title",
     "category": "mathematics",
     "path": "articles/article.html?id=your-article-id",
     "summary": "A one-sentence summary.",
     "tags": ["keyword1", "keyword2"],
     "author": "Your Name",
     "lastUpdated": "2026-02-27",
     "featured": false
   }
   ```
3. The navigation, search, and table of contents populate automatically.

## How It Works

`wmd-parser.js` is a standalone JavaScript WMD → HTML converter. When a reader opens `articles/article.html?id=calculus`, the page:

1. Reads the `id` URL parameter
2. Fetches `articles/calculus.wmd`
3. Parses the frontmatter and body using `WMDParser.parse()`
4. Injects the rendered HTML, breadcrumb, title, and meta bar
5. Runs MathJax, Desmos, TOC, dropdowns, and citation links automatically

## Style Guide

### Writing

- Use plain, clear prose. Avoid jargon unless it is defined in the article.
- Write in the third person for article content.
- Keep summaries to 2–4 sentences.
- Headings should be title-cased (e.g., "Introduction to Calculus").

### WMD Structure

- Every article must have a `:::summary` block.
- Use `##` for major sections and `###` for subsections. Do not use `#`.
- Include a `:::citations` block with at least one reference.
- Use `:::infobox` for quick-facts panels where appropriate.
- Use `:::dropdown` for worked examples and extended proofs.
- Include a `## See Also` section with **at least five** links to related articles.

### Math

- Use LaTeX inside `$...$` for inline math and `$$...$$` for display math.
- MathJax renders automatically — no configuration needed in the `.wmd` file.

### File Organization

```
wiki/
├── index.html              # Home page (auto-populated from articles.json)
├── styles.css              # All styles
├── config/
│   ├── site.json           # Site name, logo, colors
│   ├── articles.json       # Categories + list of split article files
│   └── articles/           # Split article registry files (≤600 lines each)
│       ├── articles-1.json
│       ├── articles-2.json
│       └── ...
├── js/
│   ├── article-registry.js # Loads and merges all split article files
│   ├── scripts.js          # Main site JavaScript
│   ├── wmd-parser.js       # WMD → HTML parser
│   └── cookies.js          # Theme/cookie helpers
├── media/                  # Images, logos, etc.
├── articles/
│   ├── article.html        # Universal article viewer (single HTML file)
│   ├── calculus.wmd        # Article source files
│   └── ...
├── pages/                  # Search and settings pages
└── admin/                  # Help and admin guide pages
    ├── admin-article.html  # Admin article viewer
    ├── create-article.wmd
    ├── wmd-reference.wmd
    └── ...
```

