// SPA hydration bundle — referenced by the static js-spa fixture. Not
// actually executed by the unit tests (the rendered path is exercised via a
// fake driver). Kept as documentation of what a real SPA would do here.

(function bootstrap() {
  var root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = [
    '<header><nav>',
    '<a href="/">Acme</a><a href="/about">About</a><a href="/contact">Contact</a>',
    '</nav></header>',
    '<main>',
    '<section class="hero"><h1>Build with Acme</h1>',
    '<p>A SPA fixture used by REQ-22 tests. Content hydrates here at runtime.</p>',
    '<button class="cta">Get started</button></section>',
    '<section class="features"><h2>Features</h2>',
    '<ul><li>Fast</li><li>Friendly</li><li>Free</li></ul></section>',
    '</main>'
  ].join('');
  document.title = 'Acme — Build with Acme';
})();
