# EduWiki

Live site: https://hyrumhendrickson.github.io/wiki/

EduWiki is a static, open-source educational wiki built with plain HTML, CSS, and JavaScript.

## Style Guide

### Writing

- Use plain, clear prose. Avoid jargon unless it is defined in the article.
- Write in the third person for article content.
- Keep summaries to 2–4 sentences.
- Headings should be title-cased (e.g., "Introduction to Calculus", not "introduction to calculus").
- Do not use emojis anywhere in article content, headings, or metadata.

### HTML Structure

- Every article must use the standard article template found in `admin/create-article.html`.
- Each page must have exactly one `<h1>` element — the article title inside `.wiki-title`.
- Use `<h2>` for major sections and `<h3>` for subsections. Do not skip heading levels.
- Wrap all article body text in `<main id="main-content" class="wiki-content">`.
- Include a breadcrumb `<nav>` at the top of every article.

### Formatting

- Use `<strong>` for bold emphasis and `<em>` for italics.
- Use `<code>` for inline code and `<pre><code>` for code blocks.
- Use `<blockquote>` with a `<footer>` child for quotations and their attribution.
- Tables must include a `<thead>` and `<tbody>`.
- Use the `.wiki-dropdown` component (see `admin/components-guide.html`) for expandable examples.

### Math

- Use LaTeX inside `$...$` for inline math and `$$...$$` for display math.
- MathJax is loaded automatically when the script tag is present in the page head.

### Adding Articles

1. Create the HTML file in `articles/` (or `admin/` for help pages).
2. Add an entry to `config/articles.json` with the correct `id`, `title`, `category`, `path`, `summary`, and `tags`.
3. The index page, sidebar navigation, and search are all populated automatically from `articles.json`.

### File Organization

```
wiki/
├── index.html          # Home page (auto-populated from articles.json)
├── styles.css          # All styles
├── scripts.js          # All JavaScript
├── LICENSE             # MIT open-source license
├── config/
│   ├── site.json       # Site name, logo, colors
│   └── articles.json   # Article registry
├── media/              # Images, logos, etc.
├── articles/           # Article HTML files
└── admin/              # Help and admin guide pages
```

