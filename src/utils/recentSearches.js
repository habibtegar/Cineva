/**
 * Utility for managing recent search history in localStorage
 */
export const RECENT_SEARCHES_KEY = 'cineva_recent_searches';
export const MAX_RECENT_SEARCHES = 6;

/**
 * Retrieve recent search queries from localStorage
 * @returns {string[]}
 */
export function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_SEARCHES) : [];
  } catch (err) {
    console.error('Error reading recent searches from localStorage:', err);
    return [];
  }
}

/**
 * Add or move a search query to the top of recent searches
 * @param {string} query
 * @returns {string[]}
 */
export function saveRecentSearch(query) {
  const trimmed = query?.trim();
  if (!trimmed) return getRecentSearches();

  try {
    const existing = getRecentSearches();
    // Remove duplicate case-insensitively, then place latest at the top
    const updated = [
      trimmed,
      ...existing.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('cineva_recent_searches_updated'));
    return updated;
  } catch (err) {
    console.error('Error saving recent search to localStorage:', err);
    return [];
  }
}

/**
 * Remove a specific search query from recent searches
 * @param {string} queryToRemove
 * @returns {string[]}
 */
export function removeRecentSearch(queryToRemove) {
  try {
    const existing = getRecentSearches();
    const updated = existing.filter(
      (item) => item.toLowerCase() !== queryToRemove.toLowerCase()
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('cineva_recent_searches_updated'));
    return updated;
  } catch (err) {
    console.error('Error removing recent search from localStorage:', err);
    return [];
  }
}

/**
 * Clear all recent searches
 * @returns {string[]}
 */
export function clearAllRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    window.dispatchEvent(new Event('cineva_recent_searches_updated'));
    return [];
  } catch (err) {
    console.error('Error clearing recent searches from localStorage:', err);
    return [];
  }
}
