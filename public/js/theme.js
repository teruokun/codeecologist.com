// Theme toggle. Loaded as a blocking script in <head> so a saved choice is
// applied before first paint. Served as a file because the site's
// Content-Security-Policy allows no inline scripts.
(function () {
  var KEY = 'theme';
  var root = document.documentElement;

  function saved() {
    try {
      var value = localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function current() {
    var forced = root.getAttribute('data-theme');
    if (forced) return forced;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  var initial = saved();
  if (initial) root.setAttribute('data-theme', initial);

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('theme-toggle');
    if (!button) return;
    button.hidden = false;
    button.setAttribute('aria-pressed', String(current() === 'dark'));
    button.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      button.setAttribute('aria-pressed', String(next === 'dark'));
      try {
        localStorage.setItem(KEY, next);
      } catch (error) {
        // Storage can be unavailable; the choice then lasts for this page only.
      }
    });
  });
})();
