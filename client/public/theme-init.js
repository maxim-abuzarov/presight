// Applies the saved theme before first paint, so a light-theme user never sees a dark flash.
// It is a separate file rather than an inline <script> so the Content-Security-Policy can be
// script-src 'self' with no 'unsafe-inline'.
(function () {
  try {
    var stored = localStorage.getItem('theme');
    document.documentElement.dataset.theme = stored === 'light' ? 'light' : 'dark';
  } catch {
    document.documentElement.dataset.theme = 'dark';
  }
})();
