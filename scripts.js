/**
 * EduWiki — scripts.js
 * Single JS file powering the entire wiki.
 *
 * Features:
 *  - Load site config (config/site.json) and apply branding
 *  - Load article registry (config/articles.json) and build navigation
 *  - Auto-generate Table of Contents from h2/h3 headings
 *  - Dropdown / accordion components
 *  - Header search with live results
 *  - Active link highlighting
 *  - Desmos graph helper
 *  - Scroll-spy for TOC
 */

/* ── Helpers ─────────────────────────────────────────────────── */

/**
 * Compute a relative path from the current page to the wiki root.
 * e.g. from articles/calculus.html → "../"
 *      from index.html             → "./"
 */
function getRootPath() {
  const dirs = window.location.pathname.split('/').slice(1, -1);
  const wikiSubDirs = ['articles', 'admin'];
  const depth = dirs.filter(d => wikiSubDirs.includes(d)).length;
  return depth > 0 ? '../'.repeat(depth) : './';
}

const ROOT = getRootPath();

async function fetchJSON(path) {
  const res = await fetch(ROOT + path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

/** Slugify a string to use as an id */
function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

/** Return only the articles whose IDs appear in featuredIds */
function filterFeaturedArticles(articles, featuredIds) {
  const featuredSet = new Set(featuredIds || []);
  return articles.filter(a => featuredSet.has(a.id));
}

/* ── Site Config ─────────────────────────────────────────────── */

async function applySiteConfig(config) {
  // Page title prefix
  const articleTitle = document.querySelector('.wiki-title');
  if (articleTitle) {
    document.title = `${articleTitle.textContent.trim()} — ${config.name}`;
  } else {
    document.title = config.name;
  }

  // Apply CSS custom properties if overrides are provided
  if (config.primaryColor) {
    document.documentElement.style.setProperty('--color-primary', config.primaryColor);
  }
  if (config.accentColor) {
    document.documentElement.style.setProperty('--color-accent', config.accentColor);
  }
}

/* ── Header ──────────────────────────────────────────────────── */

function buildHeader(config) {
  const header = document.getElementById('wiki-header');
  if (!header) return;

  header.innerHTML = `
    <div class="header-inner">
      <a class="header-logo" href="${ROOT}index.html" aria-label="${config.name} home">
        <img src="${ROOT}${config.logo}" alt="${config.logoAlt}" onerror="this.style.display='none'">
      </a>
      <div class="header-search" role="search">
        <input type="search" id="search-input" placeholder="Search articles…" aria-label="Search articles" autocomplete="off">
        <ul id="search-results" role="listbox" aria-label="Search suggestions"></ul>
      </div>
      <nav class="header-nav" aria-label="Main navigation">
        <a href="${ROOT}index.html">Home</a>
        <a href="${ROOT}admin/admin-article.html?id=getting-started">Help</a>
      </nav>
    </div>
  `;
}

/* ── Footer ──────────────────────────────────────────────────── */

function buildFooter(config) {
  const footer = document.getElementById('wiki-footer');
  if (!footer) return;

  const links = (config.footerLinks || [])
    .map(l => `<a href="${ROOT}${l.href}">${l.label}</a>`)
    .join('');

  footer.innerHTML = `
    <div class="footer-links">${links}</div>
    <p>${config.footerText}</p>
  `;
}

/* ── Sidebar Navigation ──────────────────────────────────────── */

function buildSidebarNav(articles, categories, featuredIds) {
  const sidebar = document.getElementById('wiki-sidebar');
  if (!sidebar) return;

  const featuredArticles = filterFeaturedArticles(articles, featuredIds);

  const currentPath = window.location.pathname;

  let html = '<nav class="sidebar-nav" aria-label="Article navigation">';
  html += '<h3>Featured Articles</h3><ul>';
  for (const art of featuredArticles) {
    const href = ROOT + art.path;
    const isActive = currentPath.endsWith(art.path.replace(/^.*\//, '/'));
    html += `<li><a href="${href}"${isActive ? ' class="active" aria-current="page"' : ''}>${art.title}</a></li>`;
  }
  html += '</ul>';
  html += '</nav>';

  // Append to sidebar (TOC comes first via generateTOC, then nav)
  const navContainer = document.createElement('div');
  navContainer.innerHTML = html;
  sidebar.appendChild(navContainer);
}

/* ── Table of Contents ───────────────────────────────────────── */

function generateTOC() {
  const toc = document.getElementById('toc');
  const content = document.querySelector('.wiki-content');
  if (!toc || !content) return;

  const headings = content.querySelectorAll('h2, h3');
  if (headings.length < 2) { toc.style.display = 'none'; return; }

  // Assign ids to headings that lack them
  headings.forEach(h => {
    if (!h.id) h.id = slugify(h.textContent);
  });

  let html = '<h3>Contents</h3><ol>';
  let inSub = false;
  headings.forEach(h => {
    if (h.tagName === 'H2') {
      if (inSub) { html += '</ol></li>'; inSub = false; }
      html += `<li><a href="#${h.id}">${h.textContent}</a>`;
    } else {
      if (!inSub) { html += '<ol>'; inSub = true; }
      html += `<li><a href="#${h.id}">${h.textContent}</a></li>`;
    }
  });
  if (inSub) html += '</ol>';
  html += '</li></ol>';

  toc.innerHTML = html;
}

/* ── Scroll-spy ──────────────────────────────────────────────── */

function initScrollSpy() {
  const tocLinks = document.querySelectorAll('#toc a');
  if (!tocLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        tocLinks.forEach(a => a.classList.remove('active'));
        const active = document.querySelector(`#toc a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
        break;
      }
    }
  }, { rootMargin: '-20% 0% -70% 0%', threshold: 0 });

  document.querySelectorAll('.wiki-content h2, .wiki-content h3').forEach(h => observer.observe(h));
}

/* ── Dropdowns / Accordions ──────────────────────────────────── */

function initDropdowns() {
  document.querySelectorAll('.wiki-dropdown').forEach(el => {
    const trigger = el.querySelector('.wiki-dropdown-trigger');
    if (!trigger) return;

    // Add arrow span if missing
    if (!trigger.querySelector('.arrow')) {
      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '▼';
      trigger.appendChild(arrow);
    }

    // Set initial ARIA
    const body = el.querySelector('.wiki-dropdown-body');
    if (body) {
      const id = 'dropdown-' + Math.random().toString(36).slice(2, 8);
      body.id = id;
      trigger.setAttribute('aria-expanded', el.classList.contains('open') ? 'true' : 'false');
      trigger.setAttribute('aria-controls', id);
    }

    trigger.addEventListener('click', () => {
      const isOpen = el.classList.toggle('open');
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });
}

/* ── Search ──────────────────────────────────────────────────── */

function initSearch(articles) {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  function doSearch(query) {
    query = query.trim().toLowerCase();
    if (!query) { results.classList.remove('open'); return; }

    const matches = articles.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.summary.toLowerCase().includes(query) ||
      (a.tags || []).some(t => t.toLowerCase().includes(query))
    ).slice(0, 8);

    if (!matches.length) {
      results.innerHTML = '<li><a href="#"><span class="result-title">No results found</span></a></li>';
    } else {
      results.innerHTML = matches.map(a => `
        <li>
          <a href="${ROOT}${a.path}">
            <span class="result-title">${escapeHtml(a.title)}</span><br>
            <span class="result-cat">${escapeHtml(a.category)}</span>
          </a>
        </li>
      `).join('');
    }
    results.classList.add('open');
  }

  input.addEventListener('input', () => doSearch(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { results.classList.remove('open'); input.blur(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = input.value.trim();
      if (q) window.location = ROOT + 'search.html?q=' + encodeURIComponent(q);
    }
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.classList.remove('open');
    }
  });
}

/* ── Hero Search (index page) ────────────────────────────────── */

function initHeroSearch(articles) {
  const form = document.getElementById('hero-search-form');
  const input = document.getElementById('hero-search-input');
  if (!form || !input) return;

  // Live suggestions dropdown
  const suggestions = document.createElement('ul');
  suggestions.id = 'hero-search-suggestions';
  suggestions.className = 'hero-search-suggestions';
  suggestions.setAttribute('role', 'listbox');
  suggestions.setAttribute('aria-label', 'Search suggestions');
  form.style.position = 'relative';
  form.appendChild(suggestions);

  function showSuggestions(query) {
    query = query.trim().toLowerCase();
    if (!query) { suggestions.classList.remove('open'); return; }

    const matches = articles.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.summary.toLowerCase().includes(query) ||
      (a.tags || []).some(t => t.toLowerCase().includes(query))
    ).slice(0, 8);

    if (!matches.length) {
      suggestions.classList.remove('open');
      return;
    }

    suggestions.innerHTML = matches.map(a => `
      <li>
        <a href="${ROOT}${a.path}">
          <span class="result-title">${escapeHtml(a.title)}</span><br>
          <span class="result-cat">${escapeHtml(a.category)}</span>
        </a>
      </li>
    `).join('');
    suggestions.classList.add('open');
  }

  input.addEventListener('input', () => showSuggestions(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { suggestions.classList.remove('open'); input.blur(); }
  });
  document.addEventListener('click', e => {
    if (!form.contains(e.target)) suggestions.classList.remove('open');
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    suggestions.classList.remove('open');
    window.location = ROOT + 'search.html?q=' + encodeURIComponent(q);
  });
}

/* ── Search Page ─────────────────────────────────────────────── */

function buildSearchPage(articles, categories) {
  const form = document.getElementById('search-page-form');
  const input = document.getElementById('search-page-input');
  const suggestionsEl = document.getElementById('search-page-suggestions');
  const resultsEl = document.getElementById('search-page-results');
  if (!form || !input || !resultsEl) return;

  // Build category label map
  const catMap = {};
  (categories || []).forEach(c => { catMap[c.id] = c.label || c.id; });

  function renderResults(query) {
    query = query.trim().toLowerCase();
    if (!query) {
      resultsEl.innerHTML = '';
      return;
    }

    const matches = articles.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.summary.toLowerCase().includes(query) ||
      (a.tags || []).some(t => t.toLowerCase().includes(query))
    );

    if (!matches.length) {
      resultsEl.innerHTML = `<p class="search-no-results">No articles found for <strong>"${escapeHtml(query)}"</strong>. Try a different search term.</p>`;
      return;
    }

    resultsEl.innerHTML = `
      <p class="search-result-count">${matches.length} result${matches.length !== 1 ? 's' : ''} for <strong>"${escapeHtml(query)}"</strong></p>
      <div class="article-grid search-results-grid">
        ${matches.map(a => `
          <a class="article-card" href="${ROOT}${a.path}">
            <span class="card-category">${escapeHtml(catMap[a.category] || a.category)}</span>
            <span class="card-title">${escapeHtml(a.title)}</span>
            <span class="card-summary">${escapeHtml(a.summary)}</span>
          </a>
        `).join('')}
      </div>
    `;
  }

  function showSuggestions(query) {
    if (!suggestionsEl) return;
    query = query.trim().toLowerCase();
    if (!query) { suggestionsEl.classList.remove('open'); return; }

    const matches = articles.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.summary.toLowerCase().includes(query) ||
      (a.tags || []).some(t => t.toLowerCase().includes(query))
    ).slice(0, 8);

    if (!matches.length) { suggestionsEl.classList.remove('open'); return; }

    suggestionsEl.innerHTML = matches.map(a => `
      <li>
        <a href="${ROOT}${a.path}">
          <span class="result-title">${escapeHtml(a.title)}</span><br>
          <span class="result-cat">${escapeHtml(catMap[a.category] || a.category)}</span>
        </a>
      </li>
    `).join('');
    suggestionsEl.classList.add('open');
  }

  // Pre-fill from URL param
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q') || '';
  if (q) {
    input.value = q;
    renderResults(q);
  }

  // Debounce helper for full results rendering and URL updates
  let debounceTimer;
  function debounced(fn, delay) {
    return (...args) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fn(...args), delay);
    };
  }
  const debouncedUpdate = debounced(val => {
    renderResults(val);
    const newQ = val.trim();
    const url = new URL(window.location.href);
    if (newQ) {
      url.searchParams.set('q', newQ);
    } else {
      url.searchParams.delete('q');
    }
    history.replaceState(null, '', url.toString());
  }, 300);

  input.addEventListener('input', () => {
    showSuggestions(input.value);
    debouncedUpdate(input.value);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { suggestionsEl && suggestionsEl.classList.remove('open'); input.blur(); }
  });
  document.addEventListener('click', e => {
    if (suggestionsEl && !form.contains(e.target)) suggestionsEl.classList.remove('open');
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    suggestionsEl && suggestionsEl.classList.remove('open');
    const newQ = input.value.trim();
    const url = new URL(window.location.href);
    if (newQ) {
      url.searchParams.set('q', newQ);
    } else {
      url.searchParams.delete('q');
    }
    history.replaceState(null, '', url.toString());
    renderResults(input.value);
  });
}

/** Escape HTML special characters to prevent XSS */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Index Page ──────────────────────────────────────────────── */

function buildIndexPage(data, featuredIds) {
  const featured = document.getElementById('featured-articles');

  const { articles, categories } = data;

  // Build category map for display
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  // Featured articles
  if (featured) {
    const featuredList = filterFeaturedArticles(articles, featuredIds);
    featured.innerHTML = featuredList.map(a => `
      <a class="article-card" href="${ROOT}${a.path}">
        <span class="card-category">${catMap[a.category]?.label || a.category}</span>
        <span class="card-title">${a.title}</span>
        <span class="card-summary">${a.summary}</span>
      </a>
    `).join('') || '<p>No featured articles yet.</p>';
  }
}

/* ── Desmos Helper ───────────────────────────────────────────── */

/**
 * Initialize all .desmos-container elements.
 * Usage in HTML:
 *   <div class="desmos-container"
 *        data-height="400"
 *        data-expressions='[{"id":"f","latex":"y=x^2"}]'>
 *   </div>
 */
function initDesmosGraphs() {
  document.querySelectorAll('.desmos-container[data-expressions]').forEach(container => {
    const height = container.dataset.height || 400;
    const label = container.dataset.label || 'Interactive Graph';

    // Build the label bar
    const labelBar = document.createElement('div');
    labelBar.className = 'desmos-label';
    labelBar.textContent = label;

    // Create the Desmos element
    const graphEl = document.createElement('div');
    graphEl.style.height = height + 'px';

    container.innerHTML = '';
    container.appendChild(labelBar);
    container.appendChild(graphEl);

    // Wait for Desmos API to be available
    function tryInit() {
      if (typeof Desmos !== 'undefined') {
        const calc = Desmos.GraphingCalculator(graphEl, {
          keypad: false,
          expressionsCollapsed: true
        });
        try {
          const exprs = JSON.parse(container.dataset.expressions);
          exprs.forEach(e => calc.setExpression(e));
        } catch (err) {
          console.warn('Desmos: invalid expressions JSON', err);
        }
        if (container.dataset.bounds) {
          try { calc.setMathBounds(JSON.parse(container.dataset.bounds)); } catch (_) {}
        }
      } else {
        setTimeout(tryInit, 200);
      }
    }
    tryInit();
  });
}

/* ── Searchable Database ─────────────────────────────────────── */

/**
 * Initialize all .wiki-database[data-src] components.
 * Fetches JSON from data-src, renders a table, and wires up live search.
 * Expected JSON shape:
 *   { "columns": [{"key":"...", "label":"..."}], "rows": [{...}] }
 */
async function initDatabases() {
  const containers = document.querySelectorAll('.wiki-database[data-src]');
  if (!containers.length) return;

  for (const container of containers) {
    const src    = container.dataset.src;
    const bodyEl = container.querySelector('.wiki-database-body');
    const searchEl = container.querySelector('.wiki-database-search');
    if (!bodyEl || !src) continue;

    let dbData;
    try {
      const res = await fetch(ROOT + src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      dbData = await res.json();
    } catch (err) {
      bodyEl.innerHTML = `<p class="wiki-database-loading">Could not load database from <code>${escapeHtml(src)}</code>.</p>`;
      console.warn('wiki-database load error:', err);
      continue;
    }

    const { columns, rows } = dbData;
    if (!columns || !rows) {
      bodyEl.innerHTML = '<p class="wiki-database-loading">Invalid database format. Expected JSON with "columns" and "rows" properties.</p>';
      continue;
    }

    // Pre-compute lowercase searchable values for performance
    const rowsLower = rows.map(row =>
      columns.map(c => (row[c.key] || '').toLowerCase())
    );

    const renderTable = (filtered) => {
      if (!filtered.length) {
        return '<p class="wiki-database-empty">No results found.</p>';
      }
      const thead = `<thead><tr>${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${filtered.map(row =>
        `<tr>${columns.map(c => `<td>${escapeHtml(row[c.key] || '')}</td>`).join('')}</tr>`
      ).join('')}</tbody>`;
      const count = `<div class="wiki-database-count">Showing ${filtered.length} of ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}</div>`;
      return `<table>${thead}${tbody}</table>${count}`;
    };

    bodyEl.innerHTML = renderTable(rows);

    if (searchEl) {
      searchEl.addEventListener('input', () => {
        const q = searchEl.value.trim().toLowerCase();
        const filtered = q
          ? rows.filter((_, i) => rowsLower[i].some(v => v.includes(q)))
          : rows;
        bodyEl.innerHTML = renderTable(filtered);
      });
    }
  }
}

/* ── Citation Links ──────────────────────────────────────────── */

function initCitationLinks() {
  // Make [1], [2] etc. in article text link to citations
  const content = document.querySelector('.wiki-content');
  if (!content) return;

  content.querySelectorAll('p, li').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/\[(\d+)\]/g, (match, num) => {
      return `<sup><a href="#cite-${num}" id="ref-${num}" title="See reference ${num}">[${num}]</a></sup>`;
    });
  });

  // Add ids to citation list items
  const citations = document.querySelector('.wiki-citations ol');
  if (citations) {
    citations.querySelectorAll('li').forEach((li, i) => {
      li.id = `cite-${i + 1}`;
    });
  }
}

/* ── WMD Article Loader ──────────────────────────────────────── */

/**
 * Load and render a .wmd article into #wmd-article-root.
 * Called from init() when the page contains #wmd-article-root and
 * the WMDParser global is available (loaded by wmd-parser.js).
 */
async function loadWMDArticle(config, data) {
  const root = document.getElementById('wmd-article-root');
  if (!root || typeof WMDParser === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    root.innerHTML = '<p class="text-muted">No article specified. Add <code>?id=article-id</code> to the URL.</p>';
    return;
  }

  let source;
  try {
    const res = await fetch(id + '.wmd');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    source = await res.text();
  } catch (err) {
    root.innerHTML = `<p class="text-muted">Could not load article <strong>${escapeHtml(id)}</strong>. Make sure <code>${escapeHtml(id)}.wmd</code> exists in the articles folder.</p>`;
    console.error('loadWMDArticle:', err);
    return;
  }

  const { meta, html } = WMDParser.parse(source);

  // Look up the article title from the JSON registry, falling back to
  // the frontmatter title and finally the raw id.
  const articleDef = (data.articles || []).find(a => a.id === id);
  const title = (articleDef && articleDef.title) || meta.title || id;

  // Build category lookup
  const catMap = {};
  data.categories.forEach(c => { catMap[c.id] = c; });
  const catId = meta.category || (articleDef && articleDef.category) || '';
  const cat = catMap[catId] || { label: catId, id: catId };

  // Breadcrumb
  const breadcrumb = `
    <nav class="wiki-breadcrumb" aria-label="Breadcrumb">
      <a href="${ROOT}index.html">Home</a>
      <span class="sep" aria-hidden="true">›</span>
      <a href="${ROOT}index.html#cat-${escapeHtml(cat.id)}">${escapeHtml(cat.label)}</a>
      <span class="sep" aria-hidden="true">›</span>
      <span aria-current="page">${escapeHtml(title)}</span>
    </nav>`;

  // Meta bar (date, author, tags)
  const tags = (meta.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const metaBar = `
    <div class="wiki-meta">
      ${meta.lastUpdated ? `<span>Last updated: ${escapeHtml(meta.lastUpdated)}</span>` : ''}
      ${meta.author ? `<span>${escapeHtml(meta.author)}</span>` : ''}
      ${tags}
    </div>`;

  root.innerHTML =
    breadcrumb +
    `<h1 class="wiki-title">${escapeHtml(title)}</h1>` +
    metaBar +
    html;

  // Update browser tab title
  document.title = `${title} — ${config.name}`;

  // Re-typeset MathJax on the newly inserted content
  if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
    MathJax.typesetPromise([root]).catch(err => console.warn('MathJax error:', err));
  }
}

/* ── Main Init ───────────────────────────────────────────────── */

async function init() {
  try {
    const [config, data, featuredData] = await Promise.all([
      fetchJSON('config/site.json'),
      fetchJSON('config/articles.json'),
      fetchJSON('config/featured.json')
    ]);

    applySiteConfig(config);
    buildHeader(config);
    buildFooter(config);

    const { articles, categories } = data;
    const featuredIds = featuredData.featured || [];

    buildSidebarNav(articles, categories, featuredIds);

    // If this is the WMD article viewer, load the .wmd content before
    // running TOC / scroll-spy so they operate on the rendered content.
    await loadWMDArticle(config, data);

    generateTOC();
    initScrollSpy();
    initDropdowns();
    initSearch(articles);
    initHeroSearch(articles);
    buildIndexPage(data, featuredIds);
    buildSearchPage(articles, categories);
    initDesmosGraphs();
    initDatabases();
    initCitationLinks();

  } catch (err) {
    console.error('EduWiki init error:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
