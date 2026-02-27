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
  const depth = window.location.pathname.split('/').length - 2;
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
        <span class="search-icon" aria-hidden="true">🔍</span>
        <input type="search" id="search-input" placeholder="Search articles…" aria-label="Search articles" autocomplete="off">
        <ul id="search-results" role="listbox" aria-label="Search suggestions"></ul>
      </div>
      <nav class="header-nav" aria-label="Main navigation">
        <a href="${ROOT}index.html">Home</a>
        <a href="${ROOT}admin/getting-started.html">Help</a>
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

function buildSidebarNav(articles, categories) {
  const sidebar = document.getElementById('wiki-sidebar');
  if (!sidebar) return;

  // Group articles by category
  const byCategory = {};
  for (const cat of categories) {
    byCategory[cat.id] = { ...cat, articles: [] };
  }
  for (const art of articles) {
    if (byCategory[art.category]) {
      byCategory[art.category].articles.push(art);
    }
  }

  const currentPath = window.location.pathname;

  let html = '<nav class="sidebar-nav" aria-label="Article navigation">';
  for (const cat of Object.values(byCategory)) {
    if (!cat.articles.length) continue;
    html += `<h3>${cat.icon} ${cat.label}</h3><ul>`;
    for (const art of cat.articles) {
      const href = ROOT + art.path;
      const isActive = currentPath.endsWith(art.path.replace(/^.*\//, '/'));
      html += `<li><a href="${href}"${isActive ? ' class="active" aria-current="page"' : ''}>${art.title}</a></li>`;
    }
    html += '</ul>';
  }
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
            <span class="result-title">${a.title}</span><br>
            <span class="result-cat">${a.category}</span>
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
      const first = results.querySelector('a');
      if (first) window.location = first.href;
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

  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim().toLowerCase();
    if (!q) return;
    const match = articles.find(a =>
      a.title.toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q))
    );
    if (match) window.location = ROOT + match.path;
    else alert(`No articles found for "${q}". Try a different search term.`);
  });
}

/* ── Index Page ──────────────────────────────────────────────── */

function buildIndexPage(data) {
  const featured = document.getElementById('featured-articles');
  const catGrid = document.getElementById('categories-grid');
  const allGrid = document.getElementById('all-articles');

  const { articles, categories } = data;

  // Build category map for display
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  // Featured articles
  if (featured) {
    const featuredList = articles.filter(a => a.featured && a.category !== 'admin');
    featured.innerHTML = featuredList.map(a => `
      <a class="article-card" href="${ROOT}${a.path}">
        <span class="card-category">${catMap[a.category]?.label || a.category}</span>
        <span class="card-title">${a.title}</span>
        <span class="card-summary">${a.summary}</span>
      </a>
    `).join('') || '<p>No featured articles yet.</p>';
  }

  // Categories
  if (catGrid) {
    const nonAdminCats = categories.filter(c => c.id !== 'admin');
    catGrid.innerHTML = nonAdminCats.map(cat => {
      const count = articles.filter(a => a.category === cat.id).length;
      return `
        <a class="category-card" href="${ROOT}index.html#cat-${cat.id}">
          <span class="cat-icon">${cat.icon}</span>
          <span class="cat-info">
            <strong>${cat.label}</strong>
            <span>${count} article${count !== 1 ? 's' : ''}</span>
          </span>
        </a>
      `;
    }).join('');
  }

  // All articles grouped by category
  if (allGrid) {
    const grouped = {};
    for (const cat of categories) grouped[cat.id] = [];
    for (const art of articles) {
      if (art.category !== 'admin' && grouped[art.category]) {
        grouped[art.category].push(art);
      }
    }

    let html = '';
    for (const cat of categories) {
      if (cat.id === 'admin') continue;
      const arts = grouped[cat.id];
      if (!arts.length) continue;
      html += `<div id="cat-${cat.id}" class="mb-2">
        <h2 class="section-title">${cat.icon} ${cat.label}</h2>
        <div class="article-grid">
          ${arts.map(a => `
            <a class="article-card" href="${ROOT}${a.path}">
              <span class="card-title">${a.title}</span>
              <span class="card-summary">${a.summary}</span>
            </a>
          `).join('')}
        </div>
      </div>`;
    }
    allGrid.innerHTML = html || '<p>No articles yet.</p>';
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

/* ── Main Init ───────────────────────────────────────────────── */

async function init() {
  try {
    const [config, data] = await Promise.all([
      fetchJSON('config/site.json'),
      fetchJSON('config/articles.json')
    ]);

    applySiteConfig(config);
    buildHeader(config);
    buildFooter(config);

    const { articles, categories } = data;

    buildSidebarNav(articles, categories);
    generateTOC();
    initScrollSpy();
    initDropdowns();
    initSearch(articles);
    initHeroSearch(articles);
    buildIndexPage(data);
    initDesmosGraphs();
    initCitationLinks();

  } catch (err) {
    console.error('EduWiki init error:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
