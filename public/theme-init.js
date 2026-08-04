/*
 * Runs before first paint to avoid a flash of the wrong theme (mirrors
 * ThemeService's own initial-theme resolution — core/theme/theme.service.ts).
 * Kept as an external file, not an inline <script>, so index.html can ship
 * a strict CSP with no `script-src 'unsafe-inline'` (security.md §4, ASVS V14).
 */
(function () {
  try {
    var stored = localStorage.getItem('kart-admin-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]').setAttribute(
      'content', theme === 'dark' ? '#0B1120' : '#2A6DF4',
    );
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
