(function () {
  const root = document.documentElement;
  let theme = 'dark';
  try {
    const saved = localStorage.getItem('bims-theme');
    theme = saved === 'light' || saved === 'dark'
      ? saved
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  } catch (error) {}
  root.dataset.theme = theme;

  window.toggleSiteTheme = function () {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('bims-theme', next); } catch (error) {}
  };
})();
