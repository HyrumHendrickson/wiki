/**
 * EduWiki — cookies.js
 * Handles theme cookie storage and applies CSS custom properties for color themes.
 * Loaded before scripts.js on every page so the theme is applied before content renders.
 */

/* ── Theme Definitions ───────────────────────────────────────── */

const WIKI_THEMES = {
  default: {
    name: 'Default Blue',
    vars: {
      '--color-primary':        '#2563eb',
      '--color-primary-dark':   '#1d4ed8',
      '--color-accent':         '#0ea5e9',
      '--color-bg':             '#f8fafc',
      '--color-surface':        '#ffffff',
      '--color-border':         '#e2e8f0',
      '--color-text':           '#1e293b',
      '--color-text-muted':     '#64748b',
      '--color-summary-bg':     '#eff6ff',
      '--color-summary-border': '#bfdbfe',
      '--color-admin-bg':       '#fefce8',
      '--color-admin-border':   '#fde68a',
      '--color-code-bg':        '#f1f5f9',
      '--color-toc-bg':         '#f8fafc',
      '--color-toc-border':     '#cbd5e1',
    }
  },
  dark: {
    name: 'Dark Night',
    vars: {
      '--color-primary':        '#60a5fa',
      '--color-primary-dark':   '#3b82f6',
      '--color-accent':         '#38bdf8',
      '--color-bg':             '#0f172a',
      '--color-surface':        '#1e293b',
      '--color-border':         '#334155',
      '--color-text':           '#f1f5f9',
      '--color-text-muted':     '#94a3b8',
      '--color-summary-bg':     '#1e3a5f',
      '--color-summary-border': '#1e40af',
      '--color-admin-bg':       '#422006',
      '--color-admin-border':   '#92400e',
      '--color-code-bg':        '#1e293b',
      '--color-toc-bg':         '#1e293b',
      '--color-toc-border':     '#334155',
    }
  },
  warm: {
    name: 'Warm Sunset',
    vars: {
      '--color-primary':        '#ea580c',
      '--color-primary-dark':   '#c2410c',
      '--color-accent':         '#f59e0b',
      '--color-bg':             '#fff7ed',
      '--color-surface':        '#ffffff',
      '--color-border':         '#fed7aa',
      '--color-text':           '#431407',
      '--color-text-muted':     '#9a3412',
      '--color-summary-bg':     '#ffedd5',
      '--color-summary-border': '#fdba74',
      '--color-admin-bg':       '#fef3c7',
      '--color-admin-border':   '#fde68a',
      '--color-code-bg':        '#fff7ed',
      '--color-toc-bg':         '#fff7ed',
      '--color-toc-border':     '#fed7aa',
    }
  },
  nature: {
    name: 'Nature Green',
    vars: {
      '--color-primary':        '#16a34a',
      '--color-primary-dark':   '#15803d',
      '--color-accent':         '#10b981',
      '--color-bg':             '#f0fdf4',
      '--color-surface':        '#ffffff',
      '--color-border':         '#bbf7d0',
      '--color-text':           '#14532d',
      '--color-text-muted':     '#166534',
      '--color-summary-bg':     '#dcfce7',
      '--color-summary-border': '#86efac',
      '--color-admin-bg':       '#fefce8',
      '--color-admin-border':   '#fde68a',
      '--color-code-bg':        '#f0fdf4',
      '--color-toc-bg':         '#f0fdf4',
      '--color-toc-border':     '#bbf7d0',
    }
  },
  purple: {
    name: 'Royal Purple',
    vars: {
      '--color-primary':        '#7c3aed',
      '--color-primary-dark':   '#6d28d9',
      '--color-accent':         '#a855f7',
      '--color-bg':             '#faf5ff',
      '--color-surface':        '#ffffff',
      '--color-border':         '#e9d5ff',
      '--color-text':           '#3b0764',
      '--color-text-muted':     '#7e22ce',
      '--color-summary-bg':     '#f3e8ff',
      '--color-summary-border': '#d8b4fe',
      '--color-admin-bg':       '#fef3c7',
      '--color-admin-border':   '#fde68a',
      '--color-code-bg':        '#faf5ff',
      '--color-toc-bg':         '#faf5ff',
      '--color-toc-border':     '#e9d5ff',
    }
  }
};

/* ── Cookie Helpers ──────────────────────────────────────────── */

function wikiSetCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function wikiGetCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/* ── Theme Application ───────────────────────────────────────── */

function wikiApplyTheme(themeId) {
  const theme = WIKI_THEMES[themeId] || WIKI_THEMES.default;
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value);
  }
}

function wikiGetSavedTheme() {
  const saved = wikiGetCookie('wiki-theme');
  return (saved && WIKI_THEMES[saved]) ? saved : 'default';
}

function wikiSaveTheme(themeId) {
  wikiSetCookie('wiki-theme', themeId, 365);
  wikiApplyTheme(themeId);
}

/* ── Auto-apply on load ──────────────────────────────────────── */

// Apply immediately (before DOMContentLoaded) to avoid flash of unstyled theme
wikiApplyTheme(wikiGetSavedTheme());
