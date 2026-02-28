/**
 * EduWiki — article-registry.js
 *
 * Loads the article registry from its split JSON files and assembles a single
 * data object that the rest of the site can use as if everything were in one file.
 *
 * config/articles.json  — contains categories and a "files" list
 * config/articles/*.json — each file holds an array of article objects (≤600 lines)
 *
 * Usage (called from scripts.js instead of fetchJSON('config/articles.json')):
 *   const data = await loadArticleRegistry();
 *   // data.categories — array of category objects
 *   // data.articles   — flat array of all article objects across all split files
 */
async function loadArticleRegistry() {
  const meta = await fetchJSON('config/articles.json');

  // Fetch all split article files in parallel
  const articleArrays = await Promise.all(
    (meta.files || []).map(file => fetchJSON(file))
  );

  return {
    categories: meta.categories || [],
    articles: articleArrays.flat()
  };
}
